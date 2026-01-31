// confusion.js - Confusion Detection & Questioning Service
// Analyzes observations, decides when to ask clarifying questions, and handles Q&A

const EventEmitter = require('events');
const crypto = require('crypto');
const { GoogleGenAI } = require('@google/genai');
const storage = require('../storage');
const context = require('./context');

// Simple UUID-like ID generator
function generateId() {
    return crypto.randomBytes(16).toString('hex');
}

// Event emitter for confusion events
const confusionEvents = new EventEmitter();

// ============ CONSTANTS ============

const CONFUSION_TYPES = {
    UNFAMILIAR_APP: 'unfamiliar_app',
    UNCLEAR_PURPOSE: 'unclear_purpose',
    REPEATED_ACTION: 'repeated_action',
    MULTI_SYSTEM: 'multi_system',
    PATTERN_DEVIATION: 'pattern_deviation',
    MANUAL_ENTRY: 'manual_entry',
    ERROR_STATE: 'error_state'
};

const QUESTION_STATUS = {
    PENDING: 'pending',
    ANSWERED: 'answered',
    DISMISSED: 'dismissed',
    DEFERRED: 'deferred'
};

// Default configuration
const DEFAULT_CONFIG = {
    maxQuestionsPerHour: 5,
    minTimeBetweenQuestions: 300, // seconds (5 minutes)
    confidenceThreshold: 0.7
};

// ============ DATA STRUCTURES ============

/**
 * @typedef {Object} ConfusionSignal
 * @property {'unfamiliar_app'|'unclear_purpose'|'repeated_action'|'multi_system'|'pattern_deviation'|'manual_entry'|'error_state'} type
 * @property {number} confidence - 0-1
 * @property {string} context - what triggered this
 * @property {string} suggestedQuestion - question to ask the user
 */

/**
 * @typedef {Object} ClarificationQuestion
 * @property {string} id - Unique question ID
 * @property {string} sessionId - Associated session ID
 * @property {Date} timestamp - When the question was created
 * @property {string} triggerContext - what the AI observed
 * @property {string} question - The question text
 * @property {'pending'|'answered'|'dismissed'|'deferred'} status
 * @property {string} [answer] - User's answer (if answered)
 * @property {Date} [answeredAt] - When the question was answered
 */

/**
 * @typedef {Object} QuestioningConfig
 * @property {number} maxQuestionsPerHour - default 5
 * @property {number} minTimeBetweenQuestions - seconds, default 300 (5 min)
 * @property {number} confidenceThreshold - 0-1, default 0.7
 */

// ============ STATE ============

let aiClient = null;
let currentConfig = { ...DEFAULT_CONFIG };
let sessionQuestions = []; // In-memory cache of current session questions
let currentSessionId = null;
let lastQuestionTime = null;

// ============ INITIALIZATION ============

/**
 * Initialize the confusion detection service
 * @param {string} sessionId - Current session ID
 * @param {QuestioningConfig} [config] - Optional configuration overrides
 */
function initConfusionDetection(sessionId, config = {}) {
    currentSessionId = sessionId;
    currentConfig = { ...DEFAULT_CONFIG, ...config };
    sessionQuestions = loadSessionQuestions(sessionId);
    lastQuestionTime = getLastQuestionTime();

    // Initialize AI client if needed
    if (!aiClient) {
        const apiKey = storage.getApiKey();
        if (apiKey) {
            aiClient = new GoogleGenAI({ apiKey });
        }
    }

    return {
        sessionId: currentSessionId,
        config: currentConfig,
        questionCount: sessionQuestions.length
    };
}

/**
 * Get the last question time from session questions
 * @returns {Date|null}
 */
function getLastQuestionTime() {
    if (sessionQuestions.length === 0) return null;

    const sorted = [...sessionQuestions].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return new Date(sorted[0].timestamp);
}

// ============ CONFUSION DETECTION ============

/**
 * Build the analysis prompt for confusion detection
 * @param {string} assembledContext - Context string from context service
 * @returns {string}
 */
function buildAnalysisPrompt(assembledContext) {
    return `You are observing the user's screen to document their workflow.

CONTEXT:
${assembledContext}

Analyze what the user is doing. Are you confused about anything?

If you ARE confused, respond with JSON:
{
  "confused": true,
  "type": "unfamiliar_app|unclear_purpose|repeated_action|multi_system|pattern_deviation|manual_entry|error_state",
  "confidence": 0.0-1.0,
  "context": "what you observed that confused you",
  "question": "a brief, specific question to ask the user"
}

If you are NOT confused, respond with:
{
  "confused": false,
  "understanding": "brief description of what you think they're doing"
}

Only be confused if you genuinely cannot understand. Infer when possible.
Do not ask about things already explained in interview or previous Q&A.`;
}

/**
 * Analyze current context for confusion signals
 * @param {Object} [screenshotImages] - Optional array of screenshot image data
 * @returns {Promise<ConfusionSignal|null>}
 */
async function analyzeForConfusion(screenshotImages = []) {
    if (!aiClient) {
        const apiKey = storage.getApiKey();
        if (!apiKey) {
            console.warn('No API key configured for confusion detection');
            return null;
        }
        aiClient = new GoogleGenAI({ apiKey });
    }

    // Get assembled context from context service
    const assembledContext = context.getContextForLLM();
    const prompt = buildAnalysisPrompt(assembledContext);

    try {
        // Build content parts
        const parts = [{ text: prompt }];

        // Add screenshot images if provided
        if (screenshotImages && screenshotImages.length > 0) {
            for (const img of screenshotImages) {
                if (img.base64) {
                    parts.push({
                        inlineData: {
                            mimeType: img.mimeType || 'image/jpeg',
                            data: img.base64
                        }
                    });
                }
            }
        }

        const response = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 500
            }
        });

        const responseText = response.text?.trim() || '';

        // Parse JSON response
        let parsed;
        try {
            // Extract JSON from response (handle markdown code blocks)
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                console.warn('No JSON found in confusion analysis response');
                return null;
            }
        } catch (parseError) {
            console.warn('Failed to parse confusion analysis response:', parseError.message);
            return null;
        }

        if (!parsed.confused) {
            // AI is not confused
            return null;
        }

        // Validate and return confusion signal
        const signal = {
            type: parsed.type || CONFUSION_TYPES.UNCLEAR_PURPOSE,
            confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
            context: parsed.context || 'Unknown trigger',
            suggestedQuestion: parsed.question || 'What are you working on?'
        };

        return signal;
    } catch (error) {
        console.error('Error in confusion analysis:', error);
        return null;
    }
}

// ============ RATE LIMITING ============

/**
 * Get the count of questions asked in a time window
 * @param {string} sessionId - Session ID
 * @param {number} windowMinutes - Time window in minutes
 * @returns {number}
 */
function getQuestionCount(sessionId, windowMinutes) {
    const questions = loadSessionQuestions(sessionId);
    const cutoff = Date.now() - (windowMinutes * 60 * 1000);

    return questions.filter(q =>
        new Date(q.timestamp).getTime() > cutoff
    ).length;
}

/**
 * Check if we can ask a question (rate limiting)
 * @param {string} sessionId - Session ID
 * @param {QuestioningConfig} [config] - Optional config override
 * @returns {boolean}
 */
function canAskQuestion(sessionId, config = currentConfig) {
    // Check hourly rate limit
    const hourlyCount = getQuestionCount(sessionId, 60);
    if (hourlyCount >= config.maxQuestionsPerHour) {
        return false;
    }

    // Check minimum time between questions
    if (lastQuestionTime) {
        const timeSinceLastQuestion = (Date.now() - lastQuestionTime.getTime()) / 1000;
        if (timeSinceLastQuestion < config.minTimeBetweenQuestions) {
            return false;
        }
    }

    return true;
}

/**
 * Check if we should ask a question based on signal and config
 * @param {ConfusionSignal} signal - The confusion signal
 * @param {QuestioningConfig} [config] - Optional config override
 * @returns {boolean}
 */
function shouldAskQuestion(signal, config = currentConfig) {
    if (!currentSessionId) {
        return false;
    }

    // Check confidence threshold
    if (signal.confidence < config.confidenceThreshold) {
        return false;
    }

    // Check rate limits
    if (!canAskQuestion(currentSessionId, config)) {
        return false;
    }

    // Check if similar question was already asked
    if (context.wasQuestionAsked(signal.suggestedQuestion)) {
        return false;
    }

    return true;
}

// ============ QUESTION MANAGEMENT ============

/**
 * Create a new clarification question
 * @param {ConfusionSignal} signal - The confusion signal
 * @param {string} sessionId - Session ID
 * @returns {ClarificationQuestion}
 */
function createQuestion(signal, sessionId) {
    const question = {
        id: generateId(),
        sessionId: sessionId,
        timestamp: new Date(),
        triggerContext: signal.context,
        question: signal.suggestedQuestion,
        status: QUESTION_STATUS.PENDING,
        confusionType: signal.type,
        confidence: signal.confidence
    };

    // Add to in-memory cache
    sessionQuestions.push(question);

    // Persist to storage
    saveSessionQuestions(sessionId, sessionQuestions);

    // Update last question time
    lastQuestionTime = question.timestamp;

    // Emit event to show UI
    confusionEvents.emit('question:created', question);

    return question;
}

/**
 * Answer a question
 * @param {string} questionId - Question ID
 * @param {string} answer - User's answer
 * @returns {ClarificationQuestion|null}
 */
function answerQuestion(questionId, answer) {
    const questionIndex = sessionQuestions.findIndex(q => q.id === questionId);
    if (questionIndex === -1) {
        return null;
    }

    const question = sessionQuestions[questionIndex];
    question.status = QUESTION_STATUS.ANSWERED;
    question.answer = answer;
    question.answeredAt = new Date();

    // Update storage
    saveSessionQuestions(currentSessionId, sessionQuestions);

    // Add to session context to avoid repeat questions
    context.addQuestionAsked(question.question);

    // Emit event to hide UI
    confusionEvents.emit('question:answered', question);

    return question;
}

/**
 * Dismiss a question (user chose to skip)
 * @param {string} questionId - Question ID
 * @returns {ClarificationQuestion|null}
 */
function dismissQuestion(questionId) {
    const questionIndex = sessionQuestions.findIndex(q => q.id === questionId);
    if (questionIndex === -1) {
        return null;
    }

    const question = sessionQuestions[questionIndex];
    question.status = QUESTION_STATUS.DISMISSED;
    question.answeredAt = new Date();

    // Update storage (still counts toward rate limit)
    saveSessionQuestions(currentSessionId, sessionQuestions);

    // Emit event to hide UI
    confusionEvents.emit('question:dismissed', question);

    return question;
}

/**
 * Defer a question (user chose "ask later")
 * @param {string} questionId - Question ID
 * @returns {ClarificationQuestion|null}
 */
function deferQuestion(questionId) {
    const questionIndex = sessionQuestions.findIndex(q => q.id === questionId);
    if (questionIndex === -1) {
        return null;
    }

    const question = sessionQuestions[questionIndex];
    question.status = QUESTION_STATUS.DEFERRED;

    // Update storage
    saveSessionQuestions(currentSessionId, sessionQuestions);

    // Emit event to hide UI
    confusionEvents.emit('question:deferred', question);

    return question;
}

/**
 * Get all pending questions
 * @returns {ClarificationQuestion[]}
 */
function getPendingQuestions() {
    return sessionQuestions.filter(q => q.status === QUESTION_STATUS.PENDING);
}

/**
 * Get all deferred questions
 * @returns {ClarificationQuestion[]}
 */
function getDeferredQuestions() {
    return sessionQuestions.filter(q => q.status === QUESTION_STATUS.DEFERRED);
}

/**
 * Get current question (most recent pending)
 * @returns {ClarificationQuestion|null}
 */
function getCurrentQuestion() {
    const pending = getPendingQuestions();
    return pending.length > 0 ? pending[pending.length - 1] : null;
}

/**
 * Get all questions for current session
 * @returns {ClarificationQuestion[]}
 */
function getSessionQuestionsState() {
    return sessionQuestions;
}

// ============ STORAGE ============

/**
 * Get the questions file path for a session
 * @param {string} sessionId - Session ID
 * @returns {string}
 */
function getQuestionsPath(sessionId) {
    const path = require('path');
    return path.join(storage.getSessionsDir(), sessionId, 'questions.json');
}

/**
 * Load session questions from storage
 * @param {string} sessionId - Session ID
 * @returns {ClarificationQuestion[]}
 */
function loadSessionQuestions(sessionId) {
    const fs = require('fs');
    const questionsPath = getQuestionsPath(sessionId);

    try {
        if (fs.existsSync(questionsPath)) {
            const data = fs.readFileSync(questionsPath, 'utf8');
            return JSON.parse(data).questions || [];
        }
    } catch (error) {
        console.warn('Error loading session questions:', error.message);
    }

    return [];
}

/**
 * Save session questions to storage
 * @param {string} sessionId - Session ID
 * @param {ClarificationQuestion[]} questions - Questions to save
 * @returns {boolean}
 */
function saveSessionQuestions(sessionId, questions) {
    const fs = require('fs');
    const path = require('path');
    const questionsPath = getQuestionsPath(sessionId);

    try {
        const dir = path.dirname(questionsPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(questionsPath, JSON.stringify({ questions }, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving session questions:', error.message);
        return false;
    }
}

// ============ MAIN ANALYSIS FLOW ============

/**
 * Run the full confusion detection and questioning flow
 * @param {Object[]} [screenshotImages] - Optional array of screenshot image data
 * @returns {Promise<ClarificationQuestion|null>}
 */
async function runConfusionCheck(screenshotImages = []) {
    if (!currentSessionId) {
        console.warn('No active session for confusion detection');
        return null;
    }

    // Check if we can even ask a question first (rate limiting)
    if (!canAskQuestion(currentSessionId)) {
        return null;
    }

    // Analyze for confusion
    const signal = await analyzeForConfusion(screenshotImages);

    if (!signal) {
        // Not confused
        return null;
    }

    // Check if we should ask based on signal confidence and context
    if (!shouldAskQuestion(signal)) {
        return null;
    }

    // Create and return the question
    const question = createQuestion(signal, currentSessionId);
    return question;
}

// ============ CLEANUP ============

/**
 * Clear confusion detection state
 */
function clearConfusionState() {
    sessionQuestions = [];
    currentSessionId = null;
    lastQuestionTime = null;
}

/**
 * Get Q&A records for documentation
 * @returns {ClarificationQuestion[]}
 */
function getQARecordsForDocumentation() {
    return sessionQuestions.filter(q =>
        q.status === QUESTION_STATUS.ANSWERED
    );
}

// ============ EXPORTS ============

module.exports = {
    // Initialization
    initConfusionDetection,
    clearConfusionState,

    // Confusion Detection
    analyzeForConfusion,
    shouldAskQuestion,

    // Rate Limiting
    getQuestionCount,
    canAskQuestion,

    // Question Management
    createQuestion,
    answerQuestion,
    dismissQuestion,
    deferQuestion,
    getPendingQuestions,
    getDeferredQuestions,
    getCurrentQuestion,
    getSessionQuestionsState,

    // Storage
    loadSessionQuestions,
    saveSessionQuestions,

    // Main Flow
    runConfusionCheck,

    // Documentation
    getQARecordsForDocumentation,

    // Events
    confusionEvents,

    // Constants
    CONFUSION_TYPES,
    QUESTION_STATUS,
    DEFAULT_CONFIG
};
