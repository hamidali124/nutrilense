const express = require('express');
const jwt = require('jsonwebtoken');
const Groq = require('groq-sdk');
const axios = require('axios');
const User = require('../models/User');
const ChatSession = require('../models/ChatSession');
const knowledgeBase = require('../data/knowledgeBase.json');
const haramData = require('../data/haramIngredients.json');

require('dotenv').config();

/**
 * Check user message for haram food references and return matching entries
 */
function checkHaramInMessage(message) {
  const msgLower = (message || '').toLowerCase();
  const matches = [];

  if (!haramData || !haramData.haramIngredients) return matches;

  for (const [key, entry] of Object.entries(haramData.haramIngredients)) {
    if (entry.severity === 'halal') continue; // skip halal items
    for (const name of (entry.names || [])) {
      if (msgLower.includes(name.toLowerCase())) {
        matches.push({
          ingredient: name,
          category: entry.category,
          severity: entry.severity,
          source: entry.source,
          notes: entry.notes || ''
        });
        break; // one match per category is enough
      }
    }
  }
  return matches;
}

const router = express.Router();
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';

function sanitizeMessage(message) {
  return String(message || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, 1000);
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getBMICategory(bmi) {
  const val = toNumber(bmi, 0);
  if (val <= 0) return 'unknown';
  if (val < 18.5) return 'underweight';
  if (val < 25) return 'normal';
  if (val < 30) return 'overweight';
  return 'obese';
}

function extractHealthConditions(user) {
  const conditions = [];
  const hba1c = toNumber(user.hba1c, -1);
  if (hba1c >= 6.5) {
    conditions.push('diabetic (HbA1c ' + hba1c + '%)');
  } else if (hba1c >= 5.7) {
    conditions.push('pre-diabetic (HbA1c ' + hba1c + '%)');
  }
  const bmi = toNumber(user.bmi, 0);
  if (bmi >= 30) conditions.push('obesity');
  return conditions.length > 0 ? conditions.join(', ') : 'None reported';
}

function normalizeConversationHistory(conversationHistory) {
  if (!Array.isArray(conversationHistory)) {
    return [];
  }

  return conversationHistory
    .filter((item) => item && typeof item.content === 'string')
    .map((item) => {
      const role = item.role === 'assistant' || item.role === 'system' ? item.role : 'user';
      return {
        role,
        content: sanitizeMessage(item.content)
      };
    })
    .filter((item) => item.content.length > 0)
    .slice(-10);
}

function fallbackKeywordSearch(query) {
  const queryLower = query.toLowerCase();
  const matches = knowledgeBase.filter((entry) =>
    entry.keywords.some((keyword) => queryLower.includes(keyword.toLowerCase()))
  );
  return matches.slice(0, 5).map((m) => m.content);
}

async function retrieveKnowledge(query) {
  try {
    const response = await axios.post(
      `${PYTHON_SERVICE_URL}/knowledge/search`,
      { query, n_results: 5 },
      { timeout: 5000 }
    );
    if (response.data && response.data.success && response.data.results) {
      return response.data.results.map((r) => r.content);
    }
  } catch (err) {
    console.log('Vector search unavailable, falling back to keyword search:', err.message);
  }
  return fallbackKeywordSearch(query);
}

function formatDailyTotals(dailyTotals) {
  const totals = dailyTotals && typeof dailyTotals === 'object' ? dailyTotals : {};

  return [
    `Calories: ${toNumber(totals.calories, 0)} kcal`,
    `Carbs: ${toNumber(totals.carbs, 0)} g`,
    `Protein: ${toNumber(totals.protein, 0)} g`,
    `Fat: ${toNumber(totals.fat, 0)} g`,
    `Sugar: ${toNumber(totals.sugar, toNumber(totals.sugars, 0))} g`,
    `Sodium: ${toNumber(totals.sodium, 0)} mg`,
    `Fiber: ${toNumber(totals.fiber, 0)} g`
  ].join('\n');
}

function formatRecentScans(recentScans) {
  if (!Array.isArray(recentScans) || recentScans.length === 0) {
    return 'No recent scans available.';
  }

  return recentScans
    .slice(0, 5)
    .map((scan) => {
      const productName = sanitizeMessage(scan?.productName || scan?.name || 'Unknown product') || 'Unknown product';
      const calories = toNumber(scan?.calories, toNumber(scan?.energy, 0));
      const sugar = toNumber(scan?.sugar, toNumber(scan?.sugars, -1));
      const grade = sanitizeMessage(scan?.grade || scan?.nutriScoreGrade || scan?.nutriscoreGrade || 'N/A') || 'N/A';

      // Build risk flags
      const flags = [];
      if (sugar > 15) flags.push('high sugar');
      if (toNumber(scan?.fat, -1) > 20) flags.push('high fat');
      if (toNumber(scan?.sodium, -1) > 600) flags.push('high sodium');
      if (['D', 'E'].includes(grade)) flags.push('poor NutriScore');

      let line = `- ${productName}: ${calories} kcal, NutriScore ${grade}`;
      if (sugar >= 0) line += `, ${sugar}g sugar`;
      if (flags.length > 0) line += ` [${flags.join(', ')}]`;
      return line;
    })
    .join('\n');
}

function buildSystemPrompt(user, context, knowledgeSnippets) {
  const allergens = Array.isArray(user.allergens) && user.allergens.length > 0
    ? user.allergens.join(', ')
    : 'None reported';

  const bmi = toNumber(user.bmi, 0);
  const bmiDisplay = bmi > 0 ? `${bmi} (${getBMICategory(bmi)})` : 'N/A';

  const knowledgeSection = knowledgeSnippets.length > 0
    ? knowledgeSnippets.map((entry) => `- ${entry}`).join('\n')
    : '- No direct knowledge base match found. Use general evidence-based nutrition guidance.';

  return [
    'You are NutriLens AI — a concise, professional nutrition coach.',
    'Provide personalized, evidence-based advice using the user profile and context below.',
    'Do NOT give medical diagnoses. For red flags, recommend seeing a healthcare professional.',
    'If the topic is unrelated to food, nutrition, health, or fitness, politely redirect.',
    'If no knowledge base match exists, use general evidence-based nutrition knowledge cautiously.',
    '',
    'User Profile:',
    `- Age: ${toNumber(user.age, 0) || 'N/A'}`,
    `- Gender: ${sanitizeMessage(user.gender || 'N/A') || 'N/A'}`,
    `- BMI: ${bmiDisplay}`,
    `- Allergens: ${allergens}`,
    `- Health conditions: ${extractHealthConditions(user)}`,
    `- Daily goals: ${toNumber(user.dailyCalorieGoal, 2000)} kcal, ${toNumber(user.dailySugarGoal, 50)}g sugar, ${toNumber(user.dailySodiumGoal, 2300)}mg sodium`,
    '',
    'Today\'s intake so far:',
    formatDailyTotals(context?.dailyTotals),
    '',
    'Recent scans (last 5):',
    formatRecentScans(context?.recentScans),
    '',
    'Knowledge base information (relevant to the query):',
    knowledgeSection,
    '',
    'RESPONSE FORMAT (mandatory):',
    '- Maximum 80 words. Be direct and specific — no filler or generic advice.',
    '- Use short bullet points (•) for lists or action steps — never long paragraphs.',
    '- Bold key numbers/values with **double asterisks** (e.g. **1200 kcal**, **Grade B**).',
    '- Use one blank line between sections for readability.',
    '- Structure: 1-line summary → key data points → 1-2 actionable tips.',
    '- Reference the user\'s actual intake numbers and scanned products by name.',
    '- Respect allergens and dietary constraints from the profile.',
    '- If a goal is exceeded, highlight it and give 1-2 practical fixes.',
    '- If you need more info, ask ONE short clarifying question.',
    '- Never repeat the user\'s question back. Never start with "Based on your data" or "Great question".',
    '',
    'HALAL/HARAM AWARENESS (mandatory):',
    '- You are aware of Islamic dietary (halal/haram) laws.',
    '- If the user asks about a food/ingredient that is haram (e.g. pork, alcohol, lard, bacon, ham, gelatin from pork), you MUST clearly warn them: this food/ingredient is **haram** and they should avoid it.',
    '- If the user asks "can I eat/take/have [food]?" and it contains haram ingredients, say: "This contains **[ingredient]** which is **haram**. You should not consume it." Then suggest a halal alternative.',
    '- For doubtful items (e.g. gelatin, E471, mono/diglycerides, enzymes, animal fat), warn that the source may be non-halal and recommend checking the label for halal certification.',
    '- Common haram: pork, ham, bacon, lard, pig fat, alcohol, wine, beer, rum, pork gelatin, pepsin, pancreatin, carmine (E120), non-halal slaughtered meat.',
    '- Always be respectful and supportive when giving halal guidance.'
  ].join('\n');
}

// Shared auth middleware
async function authenticateUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return { error: 'No token provided', status: 401 };

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (tokenError) {
    return { error: 'Invalid token', status: 401 };
  }

  const user = await User.findById(decoded.userId);
  if (!user) return { error: 'Invalid token', status: 401 };

  return { user, userId: decoded.userId };
}

router.post('/message', async (req, res) => {
  const fallbackMessage = 'I cannot access the coaching engine right now. Please try again in a moment.';

  try {
    const auth = await authenticateUser(req);
    if (auth.error) {
      return res.status(auth.status).json({ success: false, message: auth.error });
    }
    const { user, userId } = auth;

    const rawMessage = req.body?.message;
    const context = req.body?.context || {};
    const sessionId = req.body?.sessionId || null;

    if (typeof rawMessage !== 'string' || rawMessage.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const message = sanitizeMessage(rawMessage);

    // Resolve or create chat session
    let session;
    if (sessionId) {
      session = await ChatSession.findOne({ _id: sessionId, userId });
      if (!session) {
        // Invalid session — create a new one instead of failing
        session = new ChatSession({ userId, messages: [] });
      }
    } else {
      session = new ChatSession({ userId, messages: [] });
    }

    const retrievedKnowledge = await retrieveKnowledge(message);

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'Groq API key is not configured',
        response: fallbackMessage,
        timestamp: new Date().toISOString()
      });
    }

    const systemPrompt = buildSystemPrompt(user, context, retrievedKnowledge);

    // Check if user is asking about any haram food
    const haramMatches = checkHaramInMessage(message);
    let haramHint = '';
    if (haramMatches.length > 0) {
      haramHint = '\n[SYSTEM CONTEXT: The user\'s message references these haram/doubtful ingredients: '
        + haramMatches.map(m => `${m.ingredient} (${m.severity}, source: ${m.source}${m.notes ? ', ' + m.notes : ''})`).join('; ')
        + '. You MUST warn the user clearly about the haram status and suggest halal alternatives.]';
    }

    // Use session history (persisted) merged with any frontend-supplied history
    const sessionHistory = (session.messages || []).map(m => ({
      role: m.role,
      content: m.content
    }));
    const frontendHistory = normalizeConversationHistory(context.conversationHistory);

    // Prefer session history; fall back to frontend history if session is new
    const conversationHistory = sessionHistory.length > 0 ? sessionHistory : frontendHistory;

    const messages = [
      { role: 'system', content: systemPrompt + haramHint },
      ...conversationHistory.slice(-10),
      { role: 'user', content: message }
    ];

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      temperature: 0.5,
      max_tokens: 300,
      messages
    });

    const assistantMessage = completion?.choices?.[0]?.message?.content?.trim();

    if (!assistantMessage) {
      throw new Error('Empty response from Groq');
    }

    // Persist both messages to session
    session.messages.push(
      { role: 'user', content: message },
      { role: 'assistant', content: assistantMessage }
    );
    await session.save();

    return res.json({
      success: true,
      response: assistantMessage,
      sessionId: session._id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Coach API error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to generate coaching response',
      response: fallbackMessage,
      timestamp: new Date().toISOString()
    });
  }
});

// List user's active chat sessions
router.get('/sessions', async (req, res) => {
  try {
    const auth = await authenticateUser(req);
    if (auth.error) {
      return res.status(auth.status).json({ success: false, message: auth.error });
    }

    const sessions = await ChatSession.find({ userId: auth.userId })
      .sort({ updatedAt: -1 })
      .limit(20)
      .select('_id createdAt updatedAt messages');

    const sessionList = sessions.map(s => ({
      sessionId: s._id,
      messageCount: s.messages.length,
      lastMessage: s.messages.length > 0 ? s.messages[s.messages.length - 1].content.slice(0, 80) : '',
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    }));

    return res.json({ success: true, sessions: sessionList });
  } catch (error) {
    console.error('Sessions list error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch sessions' });
  }
});

module.exports = router;