jest.mock('express', () => ({
  Router: () => {
    const router = {
      stack: [],
      post(path, handler) {
        this.stack.push({ route: { path, stack: [{ handle: handler }] } });
        return this;
      },
      get(path, handler) {
        this.stack.push({ route: { path, stack: [{ handle: handler }] } });
        return this;
      }
    };

    return router;
  }
}), { virtual: true });

jest.mock('dotenv', () => ({
  config: jest.fn()
}), { virtual: true });

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn()
}), { virtual: true });

jest.mock('axios', () => ({
  post: jest.fn()
}));

const mockCreateCompletion = jest.fn();

jest.mock('groq-sdk', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreateCompletion
      }
    }
  }));
}, { virtual: true });

const mockFindById = jest.fn();
jest.mock('../server/models/User', () => ({
  findById: (...args) => mockFindById(...args)
}));

const mockFindOne = jest.fn();
const mockSessionFactory = jest.fn();

jest.mock('../server/models/ChatSession', () => {
  function MockChatSession(data) {
    return mockSessionFactory(data);
  }

  MockChatSession.findOne = (...args) => mockFindOne(...args);
  return MockChatSession;
});

const jwt = require('jsonwebtoken');
const axios = require('axios');
const coachRouter = require('../server/routes/coach');

const {
  buildAdditiveInfoResponse,
  buildGroundingDecision,
  buildMealSwapResponse,
  buildOneDayPlannerResponse,
  buildRiskExplanationResponse,
  buildStructuredCoachResponse,
  buildWeeklyPlannerResponse,
  classifyNutritionScopeWithLLM,
  containsForbiddenOffTopicCue,
  getStructuredCoachIntent,
  hasMeaningfulNutritionContext,
  hasGroundedConversationContext,
  isAdditiveInfoRequest,
  isAmbiguousConsumptionDecisionQuestion,
  isGenericSupplementRequest,
  isImplicitPersonalNutritionQuestion,
  isMealSwapRequest,
  isNutritionScopedQuestion,
  isOneDayPlannerRequest,
  isProfileRiskRequest,
  isUnsupportedNutritionRequest,
  isWeeklyPlannerRequest,
  isPersonalContextQuestion,
  messageMentionsUserAllergen,
  parseNutritionScopeDecision
} = coachRouter.__testables;
const messageHandler = coachRouter.stack.find((layer) => layer.route && layer.route.path === '/message').route.stack[0].handle;

function createUserProfile(overrides = {}) {
  return {
    _id: 'user-123',
    name: 'Amina Rahman',
    email: 'amina.rahman@example.com',
    age: 34,
    height: 162,
    weight: 82,
    gender: 'female',
    bmi: 31.2,
    allergens: ['peanut', 'shellfish'],
    hba1c: 6.8,
    dailyCalorieGoal: 1800,
    dailySugarGoal: 30,
    dailySodiumGoal: 1500,
    ...overrides
  };
}

function createContext(overrides = {}) {
  return {
    dailyTotals: {
      calories: 1620,
      sugar: 36,
      sodium: 1410,
      protein: 72,
      fat: 58,
      carbs: 168,
      fiber: 18
    },
    recentScans: [
      { productName: 'Chocolate Granola Bar', calories: 210, sugar: 18, sodium: 190, grade: 'D' },
      { productName: 'Greek Yogurt', calories: 120, sugar: 9, sodium: 55, grade: 'B' },
      { productName: 'Instant Noodles', calories: 380, sugar: 3, sodium: 980, grade: 'D' }
    ],
    ...overrides
  };
}

function createSession(messages = []) {
  return {
    _id: 'session-1',
    messages: [...messages],
    save: jest.fn().mockResolvedValue(undefined)
  };
}

function createHistory(...messages) {
  return messages.map((entry) => ({
    role: entry.role,
    content: entry.content
  }));
}

function createRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return payload;
    }
  };
}

describe('Coach route grounding policy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.GROQ_API_KEY = 'test-groq-key';
    jwt.verify.mockReturnValue({ userId: 'user-123' });
    mockFindById.mockResolvedValue(createUserProfile());
    mockFindOne.mockResolvedValue(null);
    mockSessionFactory.mockImplementation((data = {}) => createSession(data.messages || []));
    axios.post.mockResolvedValue({ data: { success: true, results: [] } });
    mockCreateCompletion.mockResolvedValue({
      choices: [{ message: { content: '• Sugar is above your goal by **6 g**.\n\n• Swap the granola bar tomorrow.' } }]
    });
  });

  test.each([
    ['simple BMI profile question', 'What is my BMI?', createContext(), [], [], 'personal-context'],
    ['daily sugar goal question', 'Did I exceed my sugar goal today?', createContext(), [], [], 'personal-context'],
    ['simple sodium intake question', 'How much sodium have I had today?', createContext(), [], [], 'personal-context'],
    ['recent scanned product question', 'Is Greek Yogurt a better option for me today?', createContext(), [], [], 'personal-context'],
    ['knowledge-backed sugar limit question', 'What is the daily sugar limit?', createContext({ recentScans: [] }), ['WHO advises limiting free sugars to less than 10% of daily energy.'], [], 'knowledge-base'],
    ['haram bacon question', 'Can I eat bacon chips?', createContext(), [], [{ ingredient: 'bacon', severity: 'haram' }], 'haram-dataset']
  ])('allows %s', (_label, message, context, knowledgeSnippets, haramMatches, expectedReason) => {
    const decision = buildGroundingDecision(message, context, knowledgeSnippets, haramMatches);

    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe(expectedReason);
  });

  test('allows questions grounded by recent scanned products', () => {
    expect(isPersonalContextQuestion('Is Chocolate Granola Bar a bad choice for me today?', createContext())).toBe(true);
  });

  test('detects short profile-driven nutrition status and food guidance prompts generically', () => {
    const user = createUserProfile();
    const context = createContext();

    expect(hasMeaningfulNutritionContext(user, context)).toBe(true);
    expect(isImplicitPersonalNutritionQuestion('How am I doing?', context, user)).toBe(true);
    expect(isImplicitPersonalNutritionQuestion('What should I eat?', context, user)).toBe(true);
    expect(isPersonalContextQuestion('How am I doing?', context, user)).toBe(true);
    expect(isPersonalContextQuestion('What should I eat?', context, user)).toBe(true);
    expect(isNutritionScopedQuestion('What should I eat?', context, user)).toBe(true);
  });

  test('detects profile allergen and broad avoid/eat prompts as in-domain nutrition questions', () => {
    const user = createUserProfile({ allergens: ['mustard'] });
    const context = createContext();

    expect(messageMentionsUserAllergen('Should I eat mustard?', user)).toBe(true);
    expect(isAmbiguousConsumptionDecisionQuestion('Should I eat mustard?')).toBe(true);
    expect(isPersonalContextQuestion('Should I eat mustard?', context, user)).toBe(true);
    expect(isPersonalContextQuestion('Which things should I avoid to eat?', context, user)).toBe(true);
  });

  test('parses nutrition scope classifier output robustly', () => {
    expect(parseNutritionScopeDecision('{"isNutritionRelated": true}')).toBe(true);
    expect(parseNutritionScopeDecision('false')).toBe(false);
  });

  test('keeps unrelated broad prompts outside domain even with profile context present', () => {
    const user = createUserProfile();
    const decision = buildGroundingDecision('How am I doing at work?', createContext(), [], [], [], user);

    expect(isImplicitPersonalNutritionQuestion('How am I doing at work?', createContext(), user)).toBe(false);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('outside-domain');
  });

  test('lets the LLM classifier approve ambiguous food-item prompts and reject non-food items', async () => {
    mockCreateCompletion
      .mockResolvedValueOnce({ choices: [{ message: { content: '{"isNutritionRelated": true}' } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: '{"isNutritionRelated": false}' } }] });

    await expect(classifyNutritionScopeWithLLM('Should I eat mango?', createUserProfile(), createContext())).resolves.toBe(true);
    await expect(classifyNutritionScopeWithLLM('Should I eat cement?', createUserProfile(), createContext())).resolves.toBe(false);
  });

  test.each([
    ['sports trivia question', 'Who won the FIFA World Cup in 2018?', createContext(), [], [], 'outside-domain'],
    ['coding request', 'Write me a Python quicksort implementation.', createContext(), [], [], 'outside-domain'],
    ['career advice request', 'Write a cover letter for a data analyst role.', createContext(), [], [], 'outside-domain']
  ])('refuses %s', (_label, message, context, knowledgeSnippets, haramMatches, expectedReason) => {
    const decision = buildGroundingDecision(message, context, knowledgeSnippets, haramMatches);

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe(expectedReason);
    expect(decision.response).toMatch(/NutriLens context|NutriLens profile/);
  });

  test.each([
    ['supplement performance question', 'Is creatine good for sprint performance?', createContext({ recentScans: [] })],
    ['broad keto meal plan question', 'Give me a 7-day keto diet plan.', createContext({ recentScans: [] })]
  ])('treats %s as in-scope nutrition instead of unrelated', (_label, message, context) => {
    const decision = buildGroundingDecision(message, context, [], []);

    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe('nutrition-domain');
  });

  test('allows short follow-up questions when recent user history is grounded', () => {
    const conversationHistory = createHistory(
      { role: 'user', content: 'Is Chocolate Granola Bar too sugary for me today?' },
      { role: 'assistant', content: '• Yes — it has **18 g** sugar.' }
    );

    expect(hasGroundedConversationContext('What about that one instead?', conversationHistory)).toBe(true);

    const decision = buildGroundingDecision(
      'What about that one instead?',
      createContext({ recentScans: [] }),
      [],
      [],
      conversationHistory
    );

    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe('conversation-context');
  });

  test('rejects short follow-up questions when recent history was already refused', () => {
    const conversationHistory = createHistory(
      { role: 'user', content: 'Who won the FIFA World Cup in 2018?' },
      { role: 'assistant', content: 'I can only answer from your NutriLens profile, intake, recent scans, and nutrition knowledge stored in the app.' }
    );

    expect(hasGroundedConversationContext('What about that one?', conversationHistory)).toBe(false);
  });

  test('detects explicit off-topic or code cues even when mixed with valid nutrition content', () => {
    expect(containsForbiddenOffTopicCue('Did I exceed my sugar goal today, and who won the 2018 World Cup?')).toBe(true);
    expect(containsForbiddenOffTopicCue('Is Chocolate Granola Bar okay for me today, and also write a Python quicksort implementation.')).toBe(true);
  });

  test('detects unsupported broad nutrition plan requests', () => {
    expect(isUnsupportedNutritionRequest('Give me a 7-day keto diet plan.')).toBe(true);
    expect(isUnsupportedNutritionRequest('Create a weekly meal plan for me.')).toBe(true);
  });

  test('detects generic supplement advice requests', () => {
    expect(isGenericSupplementRequest('Is creatine good for sprint performance?')).toBe(true);
    expect(isGenericSupplementRequest('What supplements are best for marathon runners?')).toBe(true);
  });

  test('detects supported planner, swap, risk, and additive intents', () => {
    expect(isOneDayPlannerRequest('Create a strict one-day planner for me.')).toBe(true);
    expect(isWeeklyPlannerRequest('Build a weekly planner with halal filtering.')).toBe(true);
    expect(isMealSwapRequest('Give me meal swap suggestions only.')).toBe(true);
    expect(isProfileRiskRequest('Explain my risk with my profile.')).toBe(true);
    expect(isAdditiveInfoRequest('What does E221 mean?')).toBe(true);
    expect(getStructuredCoachIntent('What does E221 mean?')).toBe('additive-info');
  });

  test.each([
    'Did I exceed my sugar goal today, and who won the 2018 World Cup?',
    'Is Chocolate Granola Bar okay for me today, and also write a Python quicksort implementation.'
  ])('refuses mixed prompts containing explicit off-topic content: %s', (message) => {
    const decision = buildGroundingDecision(
      message,
      createContext(),
      ['WHO advises limiting free sugars to less than 10% of daily energy.'],
      []
    );

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('outside-domain');
    expect(decision.response).toContain('I can only answer from your NutriLens profile');
  });

  test('allows broad nutrition plan requests when they stay in nutrition scope', () => {
    const decision = buildGroundingDecision(
      'Give me a 7-day keto diet plan.',
      createContext({ recentScans: [] }),
      ['Adults are often encouraged to target around 25 to 38 g fiber daily.'],
      []
    );

    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe('knowledge-base');
  });

  test('allows generic supplement questions when they stay in nutrition scope', () => {
    const decision = buildGroundingDecision(
      'Is creatine good for sprint performance?',
      createContext({ recentScans: [] }),
      ['Adults are often encouraged to target around 25 to 38 g fiber daily.'],
      []
    );

    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe('knowledge-base');
  });

  test('builds a deterministic one-day planner from profile and goals', () => {
    const response = buildOneDayPlannerResponse(createUserProfile(), createContext());

    expect(response).toContain('Strict one-day plan');
    expect(response).toContain('**1800 kcal**');
    expect(response).toContain('Breakfast');
    expect(response).toContain('avoid **peanut, shellfish**');
  });

  test('builds a weekly halal and allergy filtered planner', () => {
    const response = buildWeeklyPlannerResponse(createUserProfile(), createContext());

    expect(response).toContain('Weekly planner');
    expect(response).toContain('halal');
    expect(response).toContain('Mon:');
    expect(response).toContain('avoid **peanut, shellfish**');
  });

  test('builds meal swap suggestions without creating a full plan', () => {
    const response = buildMealSwapResponse(createUserProfile(), createContext());

    expect(response).toContain('Meal-swap suggestions only');
    expect(response).toContain('Chocolate Granola Bar');
    expect(response).not.toContain('Breakfast');
  });

  test('builds a profile-based risk explanation', () => {
    const response = buildRiskExplanationResponse(createUserProfile(), createContext());

    expect(response).toContain('Profile-based risk explanation');
    expect(response).toContain('HbA1c');
    expect(response).toContain('BMI');
    expect(response).toContain('36 g');
  });

  test('builds additive code information with profile tie-in', () => {
    const response = buildAdditiveInfoResponse('What does E221 mean?', createUserProfile());

    expect(response).toContain('E221');
    expect(response).toContain('sodium sulfite');
    expect(response).toContain('1500 mg');
  });

  test('detects a structured coach response before the LLM path', () => {
    const response = buildStructuredCoachResponse('Give me meal swap suggestions only.', createUserProfile(), createContext());

    expect(response).toContain('Meal-swap suggestions only');
  });

  test('short-circuits out-of-context prompts without calling Groq', async () => {
    const req = {
      headers: { authorization: 'Bearer token-123' },
      body: {
        message: 'Write me a Python quicksort implementation.',
        context: createContext()
      }
    };
    const res = createRes();

    await messageHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.response).toContain('I can only answer from your NutriLens profile');
    expect(mockCreateCompletion).not.toHaveBeenCalled();
  });

  test('returns 401 when auth token is missing', async () => {
    const req = {
      headers: {},
      body: {
        message: 'What is my BMI?',
        context: createContext()
      }
    };
    const res = createRes();

    await messageHandler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('No token provided');
  });

  test('returns 400 for blank messages', async () => {
    const req = {
      headers: { authorization: 'Bearer token-123' },
      body: {
        message: '   ',
        context: createContext()
      }
    };
    const res = createRes();

    await messageHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Message is required');
  });

  test('returns a structured one-day planner without calling Groq', async () => {
    const req = {
      headers: { authorization: 'Bearer token-123' },
      body: {
        message: 'Create a strict one-day planner from my profile and goals.',
        context: createContext()
      }
    };
    const res = createRes();

    await messageHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.response).toContain('Strict one-day plan');
    expect(res.body.response).toContain('Breakfast');
    expect(mockCreateCompletion).not.toHaveBeenCalled();
  });

  test('returns a structured weekly planner without calling Groq', async () => {
    const req = {
      headers: { authorization: 'Bearer token-123' },
      body: {
        message: 'Build a weekly planner with halal and allergy filtering.',
        context: createContext()
      }
    };
    const res = createRes();

    await messageHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.response).toContain('Weekly planner');
    expect(res.body.response).toContain('Mon:');
    expect(mockCreateCompletion).not.toHaveBeenCalled();
  });

  test('returns meal swap suggestions only without calling Groq', async () => {
    const req = {
      headers: { authorization: 'Bearer token-123' },
      body: {
        message: 'Give me meal-swap suggestions only, without a full plan.',
        context: createContext()
      }
    };
    const res = createRes();

    await messageHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.response).toContain('Meal-swap suggestions only');
    expect(res.body.response).not.toContain('Breakfast');
    expect(mockCreateCompletion).not.toHaveBeenCalled();
  });

  test('returns profile-based risk explanation without calling Groq', async () => {
    const req = {
      headers: { authorization: 'Bearer token-123' },
      body: {
        message: 'Explain my risk with my profile.',
        context: createContext()
      }
    };
    const res = createRes();

    await messageHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.response).toContain('Profile-based risk explanation');
    expect(res.body.response).toContain('HbA1c');
    expect(mockCreateCompletion).not.toHaveBeenCalled();
  });

  test('returns additive code information without calling Groq', async () => {
    const req = {
      headers: { authorization: 'Bearer token-123' },
      body: {
        message: 'What does E221 mean?',
        context: createContext()
      }
    };
    const res = createRes();

    await messageHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.response).toContain('E221');
    expect(res.body.response).toContain('sodium sulfite');
    expect(mockCreateCompletion).not.toHaveBeenCalled();
  });

  test('uses Groq for profile-grounded questions with a real profile and edge-case context', async () => {
    const req = {
      headers: { authorization: 'Bearer token-123' },
      body: {
        message: 'Given my BMI and HbA1c, did I go over my sugar target today after that Chocolate Granola Bar?',
        context: createContext()
      }
    };
    const res = createRes();

    await messageHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.response).toContain('**6 g**');
    expect(mockCreateCompletion).toHaveBeenCalledTimes(1);
  });

  test('uses Groq for short profile-driven nutrition status prompts instead of refusing them', async () => {
    const req = {
      headers: { authorization: 'Bearer token-123' },
      body: {
        message: 'How am I doing?',
        context: createContext()
      }
    };
    const res = createRes();

    mockCreateCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: '• Sugar is above your goal by **6 g** and sodium is close to target.\n\n• Swap the granola bar and instant noodles tomorrow.' } }]
    });

    await messageHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.response).toContain('**6 g**');
    expect(mockCreateCompletion).toHaveBeenCalledTimes(1);
  });

  test('uses Groq for generic food-choice prompts and keeps the answer personalized', async () => {
    const req = {
      headers: { authorization: 'Bearer token-123' },
      body: {
        message: 'What should I eat?',
        context: createContext()
      }
    };
    const res = createRes();

    mockCreateCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: '• Choose a lower-sugar meal like grilled chicken, brown rice, and salad.\n\n• Skip the granola bar because you are already above your **30 g** sugar goal.' } }]
    });

    await messageHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.response).toContain('**30 g**');
    expect(mockCreateCompletion).toHaveBeenCalledTimes(1);
  });

  test('uses Groq for allergen-specific food questions grounded by the profile', async () => {
    mockFindById.mockResolvedValue(createUserProfile({ allergens: ['mustard'] }));

    const req = {
      headers: { authorization: 'Bearer token-123' },
      body: {
        message: 'Should I eat mustard?',
        context: createContext()
      }
    };
    const res = createRes();

    mockCreateCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: '• Mustard matches your listed allergen, so avoid it.\n\n• Use yogurt-herb or lemon dressing instead.' } }]
    });

    await messageHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.response).toContain('avoid it');
    expect(mockCreateCompletion).toHaveBeenCalledTimes(1);
    expect(mockCreateCompletion.mock.calls[0][0].messages[0].content).toContain('Treat this as an allergy safety issue');
    expect(mockCreateCompletion.mock.calls[0][0].messages[0].content).toContain('Do NOT call it haram');
  });

  test('uses Groq for broad avoid-to-eat prompts instead of refusing them', async () => {
    const req = {
      headers: { authorization: 'Bearer token-123' },
      body: {
        message: 'Which things should I avoid to eat?',
        context: createContext()
      }
    };
    const res = createRes();

    mockCreateCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: '• Avoid higher-sugar snacks like the Chocolate Granola Bar and very salty foods like Instant Noodles.\n\n• Keep clear of any foods containing your listed allergens.' } }]
    });

    await messageHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.response).toContain('Chocolate Granola Bar');
    expect(mockCreateCompletion).toHaveBeenCalledTimes(1);
  });

  test('uses the LLM scope classifier for ambiguous item prompts and still refuses non-food objects', async () => {
    const req = {
      headers: { authorization: 'Bearer token-123' },
      body: {
        message: 'Should I eat cement?',
        context: createContext()
      }
    };
    const res = createRes();

    mockCreateCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: '{"isNutritionRelated": false}' } }]
    });

    await messageHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.response).toContain('I can only answer from your NutriLens profile');
    expect(mockCreateCompletion).toHaveBeenCalledTimes(1);
  });

  test('permits generic in-scope nutrition guidance instead of refusing it as out of context', async () => {
    const req = {
      headers: { authorization: 'Bearer token-123' },
      body: {
        message: 'Is creatine good for sprint performance?',
        context: createContext({ recentScans: [] })
      }
    };
    const res = createRes();

    mockCreateCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: '• Creatine can support short-burst performance.\n\n• Keep hydration up and stay within your overall nutrition goals.' } }]
    });

    await messageHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.response).toContain('Creatine');
    expect(mockCreateCompletion).toHaveBeenCalledTimes(1);
    expect(mockCreateCompletion.mock.calls[0][0].messages[0].content).toContain('give concise general nutrition coaching guidance instead of refusing it');
    expect(mockCreateCompletion.mock.calls[0][0].messages[0].content).toContain('Only say something is not in the current NutriLens context when the topic is outside nutrition');
  });

  test('uses local keyword fallback when vector search is unavailable', async () => {
    const req = {
      headers: { authorization: 'Bearer token-123' },
      body: {
        message: 'What is the daily sugar limit?',
        context: createContext({ recentScans: [] })
      }
    };
    const res = createRes();

    axios.post.mockRejectedValueOnce(new Error('vector service unavailable'));
    mockCreateCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: '• Daily added sugar should stay low.\n\n• You are already above your **30 g** goal today.' } }]
    });

    await messageHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.response).toContain('**30 g**');
    expect(mockCreateCompletion).toHaveBeenCalledTimes(1);
  });

  test('short-circuits mixed product plus code prompts without calling Groq', async () => {
    const req = {
      headers: { authorization: 'Bearer token-123' },
      body: {
        message: 'Is Chocolate Granola Bar okay for me today, and also write a Python quicksort implementation.',
        context: createContext()
      }
    };
    const res = createRes();

    await messageHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.response).toContain('I can only answer from your NutriLens profile');
    expect(mockCreateCompletion).not.toHaveBeenCalled();
  });

  test('uses persisted session history to allow a short follow-up prompt', async () => {
    const existingSession = createSession(createHistory(
      { role: 'user', content: 'Is Chocolate Granola Bar too sugary for me today?' },
      { role: 'assistant', content: '• Yes — it has **18 g** sugar and is a poor NutriScore choice.' }
    ));
    mockFindOne.mockResolvedValue(existingSession);

    const req = {
      headers: { authorization: 'Bearer token-123' },
      body: {
        sessionId: 'session-1',
        message: 'What about that one instead?',
        context: createContext({ recentScans: [] })
      }
    };
    const res = createRes();

    mockCreateCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: '• Greek Yogurt is the better option.\n\n• It has **9 g** sugar instead of **18 g**.' } }]
    });

    await messageHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.response).toContain('**9 g**');
    expect(mockCreateCompletion).toHaveBeenCalledTimes(1);
  });

  test('uses frontend conversation history when no session exists yet', async () => {
    const req = {
      headers: { authorization: 'Bearer token-123' },
      body: {
        message: 'Is that one better then?',
        context: createContext({
          recentScans: [],
          conversationHistory: createHistory(
            { role: 'user', content: 'Is Greek Yogurt better for my sugar goal today?' },
            { role: 'assistant', content: '• Yes — Greek Yogurt is lower sugar than the granola bar.' }
          )
        })
      }
    };
    const res = createRes();

    mockCreateCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: '• Yes — Greek Yogurt fits your goal better.\n\n• It keeps sugar lower than the bar.' } }]
    });

    await messageHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockCreateCompletion).toHaveBeenCalledTimes(1);
  });

  test('uses Groq for haram ingredient questions even without vector knowledge results', async () => {
    const req = {
      headers: { authorization: 'Bearer token-123' },
      body: {
        message: 'Can I take gelatin capsules?',
        context: createContext({ recentScans: [] })
      }
    };
    const res = createRes();

    mockCreateCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: '• Gelatin can be non-halal.\n\n• Check the source or halal certification before taking it.' } }]
    });

    await messageHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.response).toContain('non-halal');
    expect(mockCreateCompletion).toHaveBeenCalledTimes(1);
  });

  test('returns 500 for allowed prompts when Groq is not configured', async () => {
    const req = {
      headers: { authorization: 'Bearer token-123' },
      body: {
        message: 'What is my BMI?',
        context: createContext()
      }
    };
    const res = createRes();

    delete process.env.GROQ_API_KEY;

    await messageHandler(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Groq API key is not configured');
  });
});