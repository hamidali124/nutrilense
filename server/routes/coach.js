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
const DEFAULT_DAILY_CALORIES = 2000;
const DEFAULT_DAILY_SUGAR = 50;
const DEFAULT_DAILY_SODIUM = 2300;

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

const PERSONAL_CONTEXT_TERMS = [
  'my profile', 'profile', 'my bmi', 'bmi', 'my weight', 'my height', 'my age',
  'my goal', 'my goals', 'daily goal', 'calorie goal', 'sugar goal', 'sodium goal',
  'my sugar', 'my sodium', 'my calories', 'my intake', 'today', 'so far', 'today\'s',
  'i ate', 'i had', 'i consumed', 'my scan', 'my scans', 'recent scan', 'recent scans',
  'last scan', 'history', 'allergy', 'allergies', 'allergen', 'allergens',
  'hba1c', 'blood pressure', 'hypertension', 'diabetes'
];

const SUPPORTED_NUTRITION_TERMS = [
  'nutrition', 'nutriscore', 'grade', 'food', 'foods', 'meal', 'meals', 'snack', 'snacks',
  'drink', 'drinks', 'beverage', 'beverages', 'ingredient', 'ingredients', 'label', 'labels',
  'portion', 'serving', 'servings', 'calorie', 'calories', 'protein', 'carb', 'carbs',
  'carbohydrate', 'carbohydrates', 'fat', 'fats', 'fiber', 'sugar', 'sodium', 'salt',
  'cholesterol', 'halal', 'haram', 'weight loss', 'diet', 'glycemic', 'blood glucose',
  'blood sugar', 'diabetes', 'hypertension', 'bmi', 'supplement', 'supplements', 'creatine',
  'preworkout', 'pre-workout', 'vitamin', 'vitamins', 'omega 3', 'omega-3', 'additive',
  'additives', 'preservative', 'preservatives', 'e number', 'e-number', 'planner', 'planning',
  'swap', 'swaps', 'risk', 'e221'
];

const FORBIDDEN_OFF_TOPIC_PATTERNS = [
  /\bworld cup\b/i,
  /\bfifa\b/i,
  /\bwho won\b/i,
  /\bquicksort\b/i,
  /\bpython\b/i,
  /\bjavascript\b/i,
  /\bwrite me code\b/i,
  /\bcode implementation\b/i,
  /\balgorithm\b/i,
  /\bstock market\b/i,
  /\bstocks?\b/i,
  /\bcrypto\b/i,
  /\bbitcoin\b/i,
  /\bcover letter\b/i,
  /\bresume\b/i,
  /\bignore previous instructions\b/i,
  /\bignore all previous\b/i,
  /\bsystem prompt\b/i,
  /\bact as\b/i
];

const UNSUPPORTED_NUTRITION_REQUEST_PATTERNS = [
  /\bmeal plan\b/i,
  /\bdiet plan\b/i,
  /\b7-day\b/i,
  /\b7 day\b/i,
  /\bweekly plan\b/i,
  /\bmacro plan\b/i,
  /\bshopping list\b/i,
  /\brecipe\b/i,
  /\brecipes\b/i,
  /\bfull day plan\b/i,
  /\bpersonalized plan\b/i
];

const GENERIC_SUPPLEMENT_REQUEST_PATTERNS = [
  /\bcreatine\b/i,
  /\bsupplements?\b/i,
  /\bbeta-alanine\b/i,
  /\bmarathon runners?\b/i,
  /\bpre-?workout\b/i,
  /\bomega-?3\b/i,
  /\bvitamins?\b/i
];

const ONE_DAY_PLANNER_PATTERNS = [
  /\bone-?day planner\b/i,
  /\bone day plan\b/i,
  /\btoday'?s meal plan\b/i,
  /\bstrict day planner\b/i,
  /\bday planner\b/i
];

const WEEKLY_PLANNER_PATTERNS = [
  /\bweekly planner\b/i,
  /\bweekly meal planner\b/i,
  /\bweekly meal plan\b/i,
  /\bweek planner\b/i,
  /\b7-?day planner\b/i
];

const MEAL_SWAP_PATTERNS = [
  /\bmeal swaps?\b/i,
  /\bswap suggestions?\b/i,
  /\bhealthier swaps?\b/i,
  /\bwhat can i swap\b/i
];

const PROFILE_RISK_PATTERNS = [
  /\bexplain my risk\b/i,
  /\bmy risk\b/i,
  /\brisk with my profile\b/i,
  /\bprofile risk\b/i,
  /\bhealth risk\b/i,
  /\bdiabetes risk\b/i,
  /\bhypertension risk\b/i
];

const ADDITIVE_CODE_PATTERN = /\be\d{3}[a-z]?\b/i;
const GENERIC_PERSONAL_STATUS_PATTERNS = [
  /^how\s+(am\s+i|is\s+my|are\s+my)\s+(doing|tracking|progress(?:ing)?|looking)\b/i,
  /^am\s+i\s+(on\s+track|doing\s+(?:okay|ok|well)|overdoing\s+it)\b/i,
  /^how\s+is\s+my\s+(progress|intake|nutrition|diet|health)\b/i
];
const PERSONAL_FOOD_GUIDANCE_PATTERNS = [
  /\bwhat\s+(should|can|could|would)\s+i\s+(eat|drink|choose|order|avoid|swap)\b/i,
  /\bwhat\s+(meal|meals|food|foods|snack|snacks|drink|drinks|option|options)\s+(should|can|could|would)\s+i\s+(have|choose|eat|drink|order)\b/i,
  /\bwhat\s+(should|can|could|would)\s+i\s+(eat|drink|have)\s+(for|as)\s+(breakfast|lunch|dinner|snack)\b/i,
  /\bwhat\s+should\s+i\s+avoid\b/i,
  /\bwhich\s+things\s+should\s+i\s+avoid\s+(?:to\s+)?eat\b/i,
  /\bwhat\s+things\s+should\s+i\s+avoid\s+(?:to\s+)?eat\b/i,
  /\bwhich\s+(foods?|meals?|snacks?|drinks?|ingredients?)\s+should\s+i\s+avoid\b/i,
  /\bwhat\s+(foods?|meals?|snacks?|drinks?|ingredients?)\s+should\s+i\s+avoid\b/i,
  /\bwhich\s+(meal|meals|food|foods|snack|snacks|drink|drinks|option|options)\s+(should|can|could|would)\s+i\b/i,
  /\bwhat\s+(meal|meals|food|foods|snack|snacks|drink|drinks)\s+(fit|fits|work|works)\s+(for me|my goals|today)\b/i
];
const AMBIGUOUS_CONSUMPTION_DECISION_PATTERNS = [
  /\b(should|can|could|would)\s+i\s+(eat|drink|have|take|consume|choose|order)\s+.+/i,
  /\bis\s+.+\s+(okay|ok|safe|good|bad|better)\s+(for me|to eat|to drink|for my diet)\b/i,
  /\bcan\s+i\s+have\s+.+/i,
  /\bshould\s+i\s+avoid\s+.+/i
];
const GENERIC_PERSONAL_STATUS_ALLOWED_TOKENS = new Set([
  'how', 'what', 'am', 'is', 'are', 'i', 'my', 'me', 'doing', 'track', 'tracking', 'progress', 'progressing',
  'looking', 'on', 'today', 'todays', 'so', 'far', 'overall', 'with', 'goals', 'goal', 'targets', 'target',
  'intake', 'nutrition', 'diet', 'health', 'okay', 'ok', 'well', 'better', 'worse', 'plan', 'sugar', 'sodium',
  'calorie', 'calories', 'protein', 'fiber', 'carb', 'carbs', 'fat', 'weight', 'bmi', 'scan', 'scans', 'grade',
  'nutriscore', 'glucose', 'blood', 'hba1c'
]);

function messageMentionsRecentScans(message, context) {
  const recentScans = Array.isArray(context?.recentScans) ? context.recentScans : [];
  const msgLower = message.toLowerCase();

  return recentScans.some((scan) => {
    const productName = sanitizeMessage(scan?.productName || scan?.name || '').toLowerCase();
    return productName.length >= 3 && msgLower.includes(productName);
  });
}

function tokenizeMessage(message) {
  return sanitizeMessage(message).toLowerCase().match(/[a-z0-9]+/g) || [];
}

function messageMentionsUserAllergen(message, user) {
  const sanitized = sanitizeMessage(message).toLowerCase();
  const allergens = Array.isArray(user?.allergens) ? user.allergens : [];

  return allergens.some((allergen) => {
    const allergenText = sanitizeMessage(allergen).toLowerCase();
    return allergenText.length >= 2 && sanitized.includes(allergenText);
  });
}

function hasMeaningfulNutritionContext(user, context) {
  const dailyTotals = context?.dailyTotals && typeof context.dailyTotals === 'object'
    ? Object.values(context.dailyTotals)
    : [];
  const hasDailyTotals = dailyTotals.some((value) => Number.isFinite(Number(value)) && Number(value) > 0);
  const hasRecentScans = Array.isArray(context?.recentScans) && context.recentScans.length > 0;
  const hasProfileSignals = Boolean(user) && (
    toNumber(user?.dailyCalorieGoal, 0) > 0
    || toNumber(user?.dailySugarGoal, 0) > 0
    || toNumber(user?.dailySodiumGoal, 0) > 0
    || toNumber(user?.hba1c, 0) > 0
    || toNumber(user?.bmi, 0) > 0
    || (Array.isArray(user?.allergens) && user.allergens.length > 0)
  );

  return hasDailyTotals || hasRecentScans || hasProfileSignals;
}

function hasOnlyGenericStatusWords(message) {
  const tokens = tokenizeMessage(message);
  return tokens.length > 0 && tokens.every((token) => GENERIC_PERSONAL_STATUS_ALLOWED_TOKENS.has(token));
}

function isAmbiguousConsumptionDecisionQuestion(message) {
  const sanitized = sanitizeMessage(message);
  return AMBIGUOUS_CONSUMPTION_DECISION_PATTERNS.some((pattern) => pattern.test(sanitized));
}

function shouldUseLLMScopeClassifier(message, context, user, haramMatches = []) {
  if (!hasMeaningfulNutritionContext(user, context)) {
    return false;
  }

  if (containsForbiddenOffTopicCue(message)) {
    return false;
  }

  if (Array.isArray(haramMatches) && haramMatches.length > 0) {
    return false;
  }

  if (isPersonalContextQuestion(message, context, user) || isSupportedNutritionTopic(message)) {
    return false;
  }

  return isAmbiguousConsumptionDecisionQuestion(message);
}

function parseNutritionScopeDecision(content) {
  const raw = String(content || '').trim();
  if (!raw) {
    return null;
  }

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (typeof parsed.isNutritionRelated === 'boolean') {
        return parsed.isNutritionRelated;
      }
    } catch (_error) {
      // fall through to simple boolean parsing
    }
  }

  const boolMatch = raw.toLowerCase().match(/\b(true|false)\b/);
  if (boolMatch) {
    return boolMatch[1] === 'true';
  }

  return null;
}

async function classifyNutritionScopeWithLLM(message, user, context) {
  if (!process.env.GROQ_API_KEY) {
    return null;
  }

  const allergens = Array.isArray(user?.allergens) && user.allergens.length > 0
    ? user.allergens.join(', ')
    : 'none reported';
  const recentProducts = Array.isArray(context?.recentScans) && context.recentScans.length > 0
    ? context.recentScans
      .slice(0, 5)
      .map((scan) => sanitizeMessage(scan?.productName || scan?.name || ''))
      .filter(Boolean)
      .join(', ')
    : 'none';
  const classificationPrompt = [
    'You classify whether a user prompt belongs to a nutrition coaching app.',
    'Return only compact JSON: {"isNutritionRelated": true} or {"isNutritionRelated": false}.',
    'Classify true if the prompt is about food, drinks, meals, ingredients, additives, eating, avoiding, choosing what to eat, label safety, allergies, halal status, supplements, diets, or personal nutrition guidance.',
    'Classify false if the prompt is unrelated to nutrition or asks about non-food or non-ingestible items.',
    'If the prompt asks whether the user should eat or drink something, only classify true when the thing is food, drink, an ingredient, a supplement, or another ingestible item.',
    `User allergens: ${allergens}`,
    `Recent scanned products: ${recentProducts}`,
    `Prompt: ${sanitizeMessage(message)}`
  ].join('\n');

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      temperature: 0,
      max_tokens: 80,
      messages: [
        { role: 'system', content: classificationPrompt },
        { role: 'user', content: sanitizeMessage(message) }
      ]
    });

    return parseNutritionScopeDecision(completion?.choices?.[0]?.message?.content);
  } catch (error) {
    console.log('Nutrition scope classifier unavailable, falling back to deterministic gating:', error.message);
    return null;
  }
}

function isImplicitPersonalNutritionQuestion(message, context, user) {
  const sanitized = sanitizeMessage(message);

  if (!hasMeaningfulNutritionContext(user, context) || containsForbiddenOffTopicCue(sanitized)) {
    return false;
  }

  const genericStatusQuestion = GENERIC_PERSONAL_STATUS_PATTERNS.some((pattern) => pattern.test(sanitized))
    && hasOnlyGenericStatusWords(sanitized);
  if (genericStatusQuestion) {
    return true;
  }

  if (messageMentionsUserAllergen(sanitized, user) && isAmbiguousConsumptionDecisionQuestion(sanitized)) {
    return true;
  }

  return PERSONAL_FOOD_GUIDANCE_PATTERNS.some((pattern) => pattern.test(sanitized));
}

function isPersonalContextQuestion(message, context, user = null) {
  const msgLower = message.toLowerCase();
  if (PERSONAL_CONTEXT_TERMS.some((term) => msgLower.includes(term))) {
    return true;
  }

  if (messageMentionsRecentScans(message, context)) {
    return true;
  }

  if (isImplicitPersonalNutritionQuestion(message, context, user)) {
    return true;
  }

  return /\b(my|me|mine)\b/.test(msgLower) && /(goal|intake|calories|sugar|sodium|protein|allerg|bmi|weight|scan|grade|nutriscore)/.test(msgLower);
}

function isSupportedNutritionTopic(message) {
  const msgLower = message.toLowerCase();
  return SUPPORTED_NUTRITION_TERMS.some((term) => msgLower.includes(term));
}

function containsForbiddenOffTopicCue(message) {
  const sanitized = sanitizeMessage(message);
  return FORBIDDEN_OFF_TOPIC_PATTERNS.some((pattern) => pattern.test(sanitized));
}

function isUnsupportedNutritionRequest(message) {
  const sanitized = sanitizeMessage(message);
  return UNSUPPORTED_NUTRITION_REQUEST_PATTERNS.some((pattern) => pattern.test(sanitized));
}

function isGenericSupplementRequest(message) {
  const sanitized = sanitizeMessage(message);
  return GENERIC_SUPPLEMENT_REQUEST_PATTERNS.some((pattern) => pattern.test(sanitized));
}

function isOneDayPlannerRequest(message) {
  const sanitized = sanitizeMessage(message);
  return ONE_DAY_PLANNER_PATTERNS.some((pattern) => pattern.test(sanitized));
}

function isWeeklyPlannerRequest(message) {
  const sanitized = sanitizeMessage(message);
  return WEEKLY_PLANNER_PATTERNS.some((pattern) => pattern.test(sanitized));
}

function isMealSwapRequest(message) {
  const sanitized = sanitizeMessage(message);
  return MEAL_SWAP_PATTERNS.some((pattern) => pattern.test(sanitized));
}

function isProfileRiskRequest(message) {
  const sanitized = sanitizeMessage(message);
  return PROFILE_RISK_PATTERNS.some((pattern) => pattern.test(sanitized));
}

function isAdditiveInfoRequest(message) {
  const sanitized = sanitizeMessage(message);
  return ADDITIVE_CODE_PATTERN.test(sanitized)
    || /\be number\b/i.test(sanitized)
    || /\be-?number\b/i.test(sanitized)
    || /\bfood additive\b/i.test(sanitized)
    || /\badditive code\b/i.test(sanitized)
    || /\bpreservative\b/i.test(sanitized);
}

function getStructuredCoachIntent(message) {
  if (isOneDayPlannerRequest(message)) {
    return 'one-day-plan';
  }

  if (isWeeklyPlannerRequest(message)) {
    return 'weekly-plan';
  }

  if (isMealSwapRequest(message)) {
    return 'meal-swaps';
  }

  if (isProfileRiskRequest(message)) {
    return 'risk-explain';
  }

  if (isAdditiveInfoRequest(message)) {
    return 'additive-info';
  }

  return null;
}

function getDailyTargets(user) {
  return {
    calories: toNumber(user?.dailyCalorieGoal, DEFAULT_DAILY_CALORIES),
    sugar: toNumber(user?.dailySugarGoal, DEFAULT_DAILY_SUGAR),
    sodium: toNumber(user?.dailySodiumGoal, DEFAULT_DAILY_SODIUM)
  };
}

function formatAllergenGuardrails(user) {
  const allergens = Array.isArray(user?.allergens) ? user.allergens.filter(Boolean) : [];
  return allergens.length > 0 ? allergens.join(', ') : 'none reported';
}

function getProfileNutritionFocus(user, context) {
  const targets = getDailyTargets(user);
  const sugarSoFar = toNumber(context?.dailyTotals?.sugar, toNumber(context?.dailyTotals?.sugars, 0));
  const sodiumSoFar = toNumber(context?.dailyTotals?.sodium, 0);
  const focus = [];

  if (toNumber(user?.hba1c, -1) >= 5.7) {
    focus.push('pair carbohydrates with protein or fiber');
  }
  if (sugarSoFar >= targets.sugar || toNumber(user?.hba1c, -1) >= 6.5) {
    focus.push('keep added sugar low');
  }
  if (sodiumSoFar >= Math.round(targets.sodium * 0.8)) {
    focus.push('keep sodium controlled');
  }
  if (toNumber(user?.bmi, 0) >= 30) {
    focus.push('favor filling, lower-energy meals');
  }

  return focus.length > 0 ? focus : ['keep meals balanced'];
}

function findExactKnowledgeEntry(message) {
  const sanitized = sanitizeMessage(message).toLowerCase();
  const codeMatch = sanitized.match(ADDITIVE_CODE_PATTERN);

  if (codeMatch) {
    const exactCode = codeMatch[0];
    const directMatch = knowledgeBase.find((entry) =>
      Array.isArray(entry.keywords) && entry.keywords.some((keyword) => keyword.toLowerCase() === exactCode)
    );
    if (directMatch) {
      return directMatch;
    }
  }

  return knowledgeBase.find((entry) =>
    Array.isArray(entry.keywords) && entry.keywords.some((keyword) => sanitized.includes(keyword.toLowerCase()))
  ) || null;
}

function buildOneDayPlannerResponse(user, context) {
  const targets = getDailyTargets(user);
  const focus = getProfileNutritionFocus(user, context).join(', ');
  const breakfastCalories = Math.round(targets.calories * 0.25);
  const lunchCalories = Math.round(targets.calories * 0.3);
  const snackCalories = Math.round(targets.calories * 0.1);
  const dinnerCalories = targets.calories - breakfastCalories - lunchCalories - snackCalories;

  return [
    `Strict one-day plan for **${targets.calories} kcal**, **${targets.sugar} g sugar**, **${targets.sodium} mg sodium**.`,
    `• Breakfast (~**${breakfastCalories} kcal**): plain Greek yogurt, oats, berries, chia seeds.`,
    `• Lunch (~**${lunchCalories} kcal**): halal grilled chicken, brown rice, mixed salad, olive oil.`,
    `• Snack (~**${snackCalories} kcal**): apple with unsweetened yogurt or roasted chickpeas.`,
    `• Dinner (~**${dinnerCalories} kcal**): baked fish or halal turkey, quinoa, non-starchy vegetables.`,
    `• Guardrails: avoid **${formatAllergenGuardrails(user)}**, avoid pork/alcohol, and ${focus}.`
  ].join('\n');
}

function buildWeeklyPlannerResponse(user, context) {
  const targets = getDailyTargets(user);
  const focus = getProfileNutritionFocus(user, context).join(', ');

  return [
    `Weekly planner with halal and allergy filtering for **${targets.calories} kcal**, **${targets.sugar} g sugar**, **${targets.sodium} mg sodium**.`,
    '• Mon: yogurt-oats breakfast | chicken quinoa bowl | baked fish with vegetables.',
    '• Tue: egg and wholegrain toast | lentil soup and salad | halal turkey stir-fry.',
    '• Wed: cottage cheese or yogurt with fruit | grilled chicken wrap | baked salmon with brown rice.',
    '• Thu: overnight oats | chickpea salad bowl | halal beef kebab with vegetables.',
    '• Fri: egg and avocado toast | tuna or chicken salad | grilled fish with sweet potato.',
    '• Sat: yogurt bowl | lentil and rice plate | halal chicken soup with vegetables.',
    '• Sun: oats with berries | turkey grain bowl | baked chicken with quinoa and salad.',
    `• Filters: avoid **${formatAllergenGuardrails(user)}**, avoid pork/alcohol, choose halal-certified meat, and ${focus}.`
  ].join('\n');
}

function buildMealSwapResponse(user, context) {
  const targets = getDailyTargets(user);
  const swaps = [];
  const recentScans = Array.isArray(context?.recentScans) ? context.recentScans : [];

  recentScans.forEach((scan) => {
    const productName = sanitizeMessage(scan?.productName || scan?.name || '');
    if (!productName) {
      return;
    }

    const sugar = toNumber(scan?.sugar, toNumber(scan?.sugars, -1));
    const sodium = toNumber(scan?.sodium, -1);
    const grade = sanitizeMessage(scan?.grade || '').toUpperCase();

    if (productName.toLowerCase().includes('granola')) {
      swaps.push(`• Swap **${productName}** for plain Greek yogurt plus berries to cut sugar and calories.`);
      return;
    }

    if (productName.toLowerCase().includes('noodle') || sodium > 700) {
      swaps.push(`• Swap **${productName}** for a low-sodium chicken, rice, and vegetable bowl.`);
      return;
    }

    if (sugar > 15 || ['D', 'E'].includes(grade)) {
      swaps.push(`• Swap **${productName}** for fruit with yogurt or roasted chickpeas to stay closer to your sugar goal.`);
    }
  });

  if (swaps.length === 0) {
    swaps.push('• Swap sugary snacks for fruit with plain yogurt.');
    swaps.push('• Swap salty instant meals for grilled protein, vegetables, and a whole grain.');
    swaps.push('• Swap fried snacks for roasted chickpeas or air-popped popcorn.');
  }

  return [
    `Meal-swap suggestions only for **${targets.calories} kcal**, **${targets.sugar} g sugar**, **${targets.sodium} mg sodium**.`,
    ...swaps.slice(0, 4),
    `• Keep all swaps free of **${formatAllergenGuardrails(user)}** and avoid pork/alcohol.`
  ].join('\n');
}

function buildRiskExplanationResponse(user, context) {
  const targets = getDailyTargets(user);
  const sugarSoFar = toNumber(context?.dailyTotals?.sugar, toNumber(context?.dailyTotals?.sugars, 0));
  const sodiumSoFar = toNumber(context?.dailyTotals?.sodium, 0);
  const bmi = toNumber(user?.bmi, 0);
  const hba1c = toNumber(user?.hba1c, -1);
  const riskLines = [];

  if (hba1c >= 6.5) {
    riskLines.push(`• HbA1c **${hba1c}%** suggests glucose-control risk needs close attention.`);
  } else if (hba1c >= 5.7) {
    riskLines.push(`• HbA1c **${hba1c}%** suggests pre-diabetes risk to monitor.`);
  }

  if (bmi >= 30) {
    riskLines.push(`• BMI **${bmi}** increases long-term weight-related metabolic risk.`);
  } else if (bmi >= 25) {
    riskLines.push(`• BMI **${bmi}** is above the healthy range, so weight control matters.`);
  }

  if (sugarSoFar > targets.sugar) {
    riskLines.push(`• Current sugar intake **${sugarSoFar} g** is above your goal of **${targets.sugar} g**.`);
  }

  if (sodiumSoFar > targets.sodium) {
    riskLines.push(`• Current sodium intake **${sodiumSoFar} mg** is above your goal of **${targets.sodium} mg**.`);
  } else if (sodiumSoFar >= Math.round(targets.sodium * 0.8)) {
    riskLines.push(`• Current sodium intake **${sodiumSoFar} mg** is already close to your goal of **${targets.sodium} mg**.`);
  }

  if (riskLines.length === 0) {
    riskLines.push('• Your profile does not show a major immediate nutrition red flag from the stored data.');
  }

  return [
    'Profile-based risk explanation — this is coaching guidance, not a diagnosis.',
    ...riskLines,
    '• Priority actions: keep added sugar low, keep sodium controlled, and favor high-fiber balanced meals.'
  ].join('\n');
}

function buildAdditiveInfoResponse(message, user) {
  const entry = findExactKnowledgeEntry(message);
  const targets = getDailyTargets(user);

  if (!entry) {
    return 'That additive code is not in the current NutriLens context. Ask about a code stored in the app knowledge base, such as E120, E211, E221, E621, or E150d.';
  }

  const notes = [];
  if (/\bsodium\b/i.test(entry.content) && targets.sodium <= 1500) {
    notes.push(`Because your sodium goal is **${targets.sodium} mg**, check the full label if the product is also salty or ultra-processed.`);
  }
  if (/carmine|insects|porcine|gelatin/i.test(entry.content)) {
    notes.push('For halal-sensitive choices, verify the ingredient source or halal certification.');
  }
  if (notes.length === 0) {
    notes.push('Profile tie-in: prefer minimally processed foods when possible so it is easier to stay within your sugar and sodium goals.');
  }

  return [
    entry.content,
    ...notes.map((note) => `• ${note}`)
  ].join('\n');
}

function buildStructuredCoachResponse(message, user, context) {
  const intent = getStructuredCoachIntent(message);

  switch (intent) {
    case 'one-day-plan':
      return buildOneDayPlannerResponse(user, context);
    case 'weekly-plan':
      return buildWeeklyPlannerResponse(user, context);
    case 'meal-swaps':
      return buildMealSwapResponse(user, context);
    case 'risk-explain':
      return buildRiskExplanationResponse(user, context);
    case 'additive-info':
      return buildAdditiveInfoResponse(message, user);
    default:
      return null;
  }
}

function isRefusalMessage(message) {
  const msgLower = sanitizeMessage(message).toLowerCase();
  return msgLower.includes('not in the current nutrilens context')
    || msgLower.includes('i can only answer from your nutrilens profile');
}

function isFollowUpQuestion(message) {
  const msgLower = sanitizeMessage(message).toLowerCase();

  if (!msgLower) {
    return false;
  }

  if (/^(why|how so|and why|why not)\??$/.test(msgLower)) {
    return true;
  }

  return [
    'what about',
    'how about',
    'that one',
    'this one',
    'the other one',
    'instead',
    'still okay',
    'still ok',
    'better then',
    'better instead',
    'can i still have it',
    'is it okay',
    'is that okay',
    'is that better',
    'would that be better'
  ].some((phrase) => msgLower.includes(phrase));
}

function hasGroundedConversationContext(message, conversationHistory) {
  if (!isFollowUpQuestion(message)) {
    return false;
  }

  const normalizedHistory = normalizeConversationHistory(conversationHistory).slice(-6);
  if (normalizedHistory.length === 0) {
    return false;
  }

  if (normalizedHistory.some((item) => item.role === 'assistant' && isRefusalMessage(item.content))) {
    return false;
  }

  const recentUserContext = normalizedHistory
    .filter((item) => item.role === 'user')
    .slice(-3)
    .map((item) => item.content.toLowerCase())
    .join(' ');

  if (!recentUserContext) {
    return false;
  }

  return PERSONAL_CONTEXT_TERMS.some((term) => recentUserContext.includes(term))
    || SUPPORTED_NUTRITION_TERMS.some((term) => recentUserContext.includes(term))
    || checkHaramInMessage(recentUserContext).length > 0;
}

function buildOutOfContextResponse(isNutritionLike) {
  if (isNutritionLike) {
    return 'That is not in the current NutriLens context. Ask about your profile, today\'s intake, a recent scanned product, NutriScore, ingredients, halal status, or another nutrition topic already covered by the app knowledge base.';
  }

  return 'I can only answer from your NutriLens profile, intake, recent scans, and nutrition knowledge stored in the app. Ask about your profile, today\'s intake, a scanned product, NutriScore, ingredients, or halal status.';
}

function isNutritionScopedQuestion(message, context, user = null) {
  return isSupportedNutritionTopic(message)
    || isPersonalContextQuestion(message, context, user)
    || isAdditiveInfoRequest(message)
    || isProfileRiskRequest(message)
    || isOneDayPlannerRequest(message)
    || isWeeklyPlannerRequest(message)
    || isMealSwapRequest(message);
}

function buildGroundingDecision(message, context, knowledgeSnippets, haramMatches, conversationHistory = [], user = null, llmScopeAllowed = null) {
  const forbiddenOffTopicCue = containsForbiddenOffTopicCue(message);
  const personalContext = isPersonalContextQuestion(message, context, user);
  const followUpContext = hasGroundedConversationContext(message, conversationHistory);
  const hasKnowledge = Array.isArray(knowledgeSnippets) && knowledgeSnippets.length > 0;
  const hasHaramContext = Array.isArray(haramMatches) && haramMatches.length > 0;
  const nutritionLike = isNutritionScopedQuestion(message, context, user) || hasHaramContext || llmScopeAllowed === true;

  if (forbiddenOffTopicCue) {
    return {
      allowed: false,
      reason: 'outside-domain',
      response: buildOutOfContextResponse(false)
    };
  }

  if (personalContext) {
    return { allowed: true, reason: 'personal-context' };
  }

  if (followUpContext) {
    return { allowed: true, reason: 'conversation-context' };
  }

  if (hasHaramContext) {
    return { allowed: true, reason: 'haram-dataset' };
  }

  if (llmScopeAllowed === true) {
    return { allowed: true, reason: 'llm-scope' };
  }

  if (nutritionLike) {
    return { allowed: true, reason: hasKnowledge ? 'knowledge-base' : 'nutrition-domain' };
  }

  return {
    allowed: false,
    reason: 'outside-domain',
    response: buildOutOfContextResponse(false)
  };
}

async function persistSessionExchange(session, userMessage, assistantMessage) {
  session.messages.push(
    { role: 'user', content: userMessage },
    { role: 'assistant', content: assistantMessage }
  );
  await session.save();
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
    : '- No direct knowledge base match found.';

  return [
    'You are NutriLens AI — a concise, professional nutrition coach.',
    'Answer only questions that stay within food, nutrition, ingredients, meals, supplements, additives, halal guidance, allergies, and diet-related fitness guidance.',
    'Use the user profile, daily context, recent scans, knowledge base snippets below, and any explicit allergen or haram hint first.',
    'If the question is in that nutrition scope but the stored profile or knowledge snippets are incomplete, give concise general nutrition coaching guidance instead of refusing it.',
    'Only say something is not in the current NutriLens context when the topic is outside nutrition, food, ingredients, meals, ingestible products, or diet-related guidance.',
    'Do NOT give medical diagnoses. For red flags, recommend seeing a healthcare professional.',
    'If the topic is unrelated to food, nutrition, health, or fitness, politely redirect.',
    'For in-domain nutrition questions, you may use general nutrition coaching knowledge, but always anchor the answer to the user\'s goals, allergens, BMI, HbA1c, intake, recent scans, and knowledge snippets when relevant.',
    'For in-domain generic nutrition questions, tie the answer back to the user\'s goals, allergens, BMI, HbA1c, intake, or recent scans when relevant.',
    'For short self-assessment or food-choice prompts, infer that the user is asking about nutrition progress or meal guidance from the provided profile, goals, intake, and recent scans.',
    'If the user asks whether they should eat, drink, avoid, or choose a specific item, treat it as in-domain when the item is food, a drink, an ingredient, or another ingestible product.',
    'If the asked item matches a listed allergen, clearly tell the user to avoid it and give a safer alternative.',
    'Do not describe an allergen as haram unless the haram dataset explicitly matches it as well.',
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

    const sessionHistory = normalizeConversationHistory(session.messages || []);
    const frontendHistory = normalizeConversationHistory(context.conversationHistory);

    // Prefer session history; fall back to frontend history if session is new
    const conversationHistory = sessionHistory.length > 0 ? sessionHistory : frontendHistory;

    const structuredResponse = buildStructuredCoachResponse(message, user, context);
    if (structuredResponse) {
      await persistSessionExchange(session, message, structuredResponse);

      return res.json({
        success: true,
        response: structuredResponse,
        sessionId: session._id,
        timestamp: new Date().toISOString()
      });
    }

    const haramMatches = checkHaramInMessage(message);
    const llmScopeAllowed = shouldUseLLMScopeClassifier(message, context, user, haramMatches)
      ? await classifyNutritionScopeWithLLM(message, user, context)
      : null;
    const likelySupportedTopic = isNutritionScopedQuestion(message, context, user)
      || hasGroundedConversationContext(message, conversationHistory)
      || llmScopeAllowed === true
      || isAdditiveInfoRequest(message)
      || isProfileRiskRequest(message)
      || haramMatches.length > 0;
    const retrievedKnowledge = likelySupportedTopic ? await retrieveKnowledge(message) : [];

    const groundingDecision = buildGroundingDecision(message, context, retrievedKnowledge, haramMatches, conversationHistory, user, llmScopeAllowed);
    if (!groundingDecision.allowed) {
      await persistSessionExchange(session, message, groundingDecision.response);

      return res.json({
        success: true,
        response: groundingDecision.response,
        sessionId: session._id,
        timestamp: new Date().toISOString()
      });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'Groq API key is not configured',
        response: fallbackMessage,
        timestamp: new Date().toISOString()
      });
    }

    const systemPrompt = buildSystemPrompt(user, context, retrievedKnowledge);

    let scopeHint = '';
    if (groundingDecision.reason === 'nutrition-domain' || groundingDecision.reason === 'llm-scope') {
      scopeHint = '\n[SYSTEM CONTEXT: This prompt is confirmed to be in nutrition scope. Do NOT refuse it as out of context. Answer it as a nutrition coaching question and tie it back to the profile, allergens, goals, intake, or recent scans when possible.]';
    }

    let allergenHint = '';
    if (messageMentionsUserAllergen(message, user)) {
      const matchingAllergens = (user.allergens || [])
        .map((allergen) => sanitizeMessage(allergen))
        .filter((allergen) => allergen && sanitizeMessage(message).toLowerCase().includes(allergen.toLowerCase()));

      allergenHint = '\n[SYSTEM CONTEXT: The user message mentions these listed allergens: '
        + (matchingAllergens.length > 0 ? matchingAllergens.join(', ') : 'listed profile allergens')
        + '. Treat this as an allergy safety issue. Clearly tell the user to avoid the allergen and suggest a safer alternative. Do NOT call it haram unless the haram dataset also matches.]';
    }

    // Check if user is asking about any haram food
    let haramHint = '';
    if (haramMatches.length > 0) {
      haramHint = '\n[SYSTEM CONTEXT: The user\'s message references these haram/doubtful ingredients: '
        + haramMatches.map(m => `${m.ingredient} (${m.severity}, source: ${m.source}${m.notes ? ', ' + m.notes : ''})`).join('; ')
        + '. You MUST warn the user clearly about the haram status and suggest halal alternatives.]';
    }

    const messages = [
      { role: 'system', content: systemPrompt + scopeHint + allergenHint + haramHint },
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

    await persistSessionExchange(session, message, assistantMessage);

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

router.__testables = {
  buildAdditiveInfoResponse,
  buildGroundingDecision,
  buildMealSwapResponse,
  classifyNutritionScopeWithLLM,
  hasMeaningfulNutritionContext,
  buildOutOfContextResponse,
  buildOneDayPlannerResponse,
  buildRiskExplanationResponse,
  buildStructuredCoachResponse,
  buildWeeklyPlannerResponse,
  containsForbiddenOffTopicCue,
  getStructuredCoachIntent,
  hasGroundedConversationContext,
  isImplicitPersonalNutritionQuestion,
  isAdditiveInfoRequest,
  isAmbiguousConsumptionDecisionQuestion,
  isGenericSupplementRequest,
  isMealSwapRequest,
  isNutritionScopedQuestion,
  isOneDayPlannerRequest,
  isProfileRiskRequest,
  isUnsupportedNutritionRequest,
  isWeeklyPlannerRequest,
  isFollowUpQuestion,
  isPersonalContextQuestion,
  isRefusalMessage,
  isSupportedNutritionTopic,
  messageMentionsUserAllergen,
  messageMentionsRecentScans,
  parseNutritionScopeDecision,
  persistSessionExchange
};

module.exports = router;