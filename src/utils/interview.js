// interview.js - Interview Mode Service
const { GoogleGenAI } = require('@google/genai');
const EventEmitter = require('events');
const { getApiKey } = require('../storage');
const { INTERVIEW_CONDUCTOR_PROMPT } = require('./prompts');

// Event emitter for interview events
const interviewEvents = new EventEmitter();

// ============ DATA STRUCTURES ============

/**
 * @typedef {Object} InterviewMessage
 * @property {string} id - Unique message ID
 * @property {'ai'|'user'} role - Who sent the message
 * @property {string} content - Message content
 * @property {Date} timestamp - When the message was sent
 */

/**
 * @typedef {Object} InterviewSession
 * @property {string} profileId - Associated profile ID
 * @property {Date} startTime - When the interview started
 * @property {Date|null} endTime - When the interview ended
 * @property {InterviewMessage[]} messages - Conversation history
 * @property {boolean} completed - Whether the interview is complete
 */

/**
 * @typedef {Object} InterviewSummary
 * @property {string} role - Job title
 * @property {string} department - Department name
 * @property {string} reportsTo - Manager/supervisor
 * @property {string[]} responsibilities - Main duties
 * @property {string} typicalDay - Daily structure description
 * @property {string[]} systemsUsed - Software/tools mentioned
 * @property {string[]} statedPainPoints - Frustrations mentioned
 * @property {string[]} interactions - People/departments they work with
 * @property {number} rawTokenCount - Approximate token count of raw transcript
 * @property {Date} generatedAt - When summary was generated
 */

// ============ PROMPTS ============

// INTERVIEW_CONDUCTOR_PROMPT imported from prompts.js

const SUMMARY_GENERATION_PROMPT = `Extract a structured summary from this interview transcript.
Output ONLY valid JSON with these fields (no markdown, no explanation):
{
  "role": "job title",
  "department": "department name",
  "reportsTo": "manager/supervisor name or title",
  "responsibilities": ["array", "of", "main", "duties"],
  "typicalDay": "brief description of daily structure",
  "systemsUsed": ["array", "of", "software", "tools"],
  "statedPainPoints": ["array", "of", "frustrations"],
  "interactions": ["array", "of", "people", "departments"]
}

Be concise. This will be loaded as context for observation.
If a field wasn't discussed, use an empty string or empty array.`;

// Completion detection phrase
const COMPLETION_PHRASE = "I think I have a good picture of your role. Ready to start observing?";

// ============ STATE ============

let currentSession = null;
let aiClient = null;

// ============ HELPER FUNCTIONS ============

/**
 * Generate unique message ID
 */
function generateMessageId() {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Estimate token count (rough approximation)
 */
function estimateTokenCount(text) {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
}

/**
 * Build conversation history for LLM context
 */
function buildConversationContext(messages) {
    return messages.map(msg => ({
        role: msg.role === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));
}

// ============ CORE FUNCTIONS ============

/**
 * Start a new interview session
 * @param {string} profileId - Profile ID to associate with
 * @returns {InterviewSession}
 */
async function startInterview(profileId) {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('No API key configured');
    }

    // Initialize AI client
    aiClient = new GoogleGenAI({ apiKey });

    // Create new session
    currentSession = {
        profileId,
        startTime: new Date(),
        endTime: null,
        messages: [],
        completed: false
    };

    // First message is hardcoded to ensure consistency
    const firstMessage = "Hi! I'm here to document your workflows. What's your job title?";

    // Add AI message to session
    const aiMessage = {
        id: generateMessageId(),
        role: 'ai',
        content: firstMessage,
        timestamp: new Date()
    };
    currentSession.messages.push(aiMessage);

    interviewEvents.emit('interview:started', { profileId, session: currentSession });
    interviewEvents.emit('interview:message', aiMessage);

    return { session: currentSession, message: aiMessage };
}

/**
 * Send a user message and get AI response
 * @param {string} userMessage - User's message
 * @returns {Promise<{userMessage: InterviewMessage, aiMessage: InterviewMessage, completed: boolean}>}
 */
async function sendMessage(userMessage) {
    if (!currentSession) {
        throw new Error('No active interview session');
    }

    if (!aiClient) {
        const apiKey = getApiKey();
        if (!apiKey) {
            throw new Error('No API key configured');
        }
        aiClient = new GoogleGenAI({ apiKey });
    }

    // Add user message
    const userMsg = {
        id: generateMessageId(),
        role: 'user',
        content: userMessage,
        timestamp: new Date()
    };
    currentSession.messages.push(userMsg);
    interviewEvents.emit('interview:message', userMsg);

    // Generate AI response
    const aiResponse = await generateAIResponse(currentSession.messages);

    // Add AI message
    const aiMsg = {
        id: generateMessageId(),
        role: 'ai',
        content: aiResponse,
        timestamp: new Date()
    };
    currentSession.messages.push(aiMsg);
    interviewEvents.emit('interview:message', aiMsg);

    // Check if interview is complete
    const completed = checkCompletion(currentSession.messages);
    if (completed) {
        currentSession.completed = true;
        currentSession.endTime = new Date();
        interviewEvents.emit('interview:completed', { session: currentSession });
    }

    return { userMessage: userMsg, aiMessage: aiMsg, completed };
}

/**
 * Generate AI response using Gemini
 * @param {InterviewMessage[]} messages - Conversation history
 * @returns {Promise<string>}
 */
async function generateAIResponse(messages) {
    try {
        const conversationHistory = buildConversationContext(messages);

        // Instructions as first message - Gemini ignores systemInstruction
        const INLINE_INSTRUCTIONS = `You are interviewing me about my job to document my workflows.

RULES YOU MUST FOLLOW:
- Respond with MAX 2 sentences
- First sentence: brief acknowledgment like "Got it." or "Okay." (optional)
- Second sentence: ONE simple question
- NEVER use numbers, bullets, lists, or markdown formatting
- NEVER explain why you're asking
- NEVER praise or compliment me
- NEVER summarize what I said back to me

GOOD response examples:
"Got it. What tools do you use daily?"
"Okay. Who do you report to?"
"What's the most tedious part of your job?"

Topics to cover: daily work, tools, tasks, decisions, pain points, collaborators.
After 10-15 exchanges say: "I think I have a good picture. Ready to start observing?"`;

        // Prepend instructions as first user message, with a fake model acknowledgment
        const modifiedHistory = [
            { role: 'user', parts: [{ text: INLINE_INSTRUCTIONS }] },
            { role: 'model', parts: [{ text: 'Understood. I will ask one short question at a time with no lists or formatting.' }] },
            ...conversationHistory
        ];

        // DEBUG LOGGING
        console.log('\n========== AI REQUEST ==========');
        console.log('CONVERSATION HISTORY:', JSON.stringify(modifiedHistory, null, 2));
        console.log('================================\n');

        const response = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: modifiedHistory,
            generationConfig: {
                temperature: 0.5,
                maxOutputTokens: 500
            }
        });

        const responseText = response.text || 'Got it. What do you do day-to-day?';

        // DEBUG LOGGING
        console.log('\n========== AI RESPONSE ==========');
        console.log('RESPONSE:', responseText);
        console.log('=================================\n');

        return responseText;
    } catch (error) {
        console.error('Error generating AI response:', error);
        throw new Error(`Failed to generate AI response: ${error.message}`);
    }
}

/**
 * Check if the AI has indicated completion
 * @param {InterviewMessage[]} messages - Conversation history
 * @returns {boolean}
 */
function checkCompletion(messages) {
    if (messages.length === 0) return false;

    // Get the last AI message
    const lastAiMessage = [...messages].reverse().find(m => m.role === 'ai');
    if (!lastAiMessage) return false;

    // Check if it contains the completion phrase
    return lastAiMessage.content.includes(COMPLETION_PHRASE) ||
           lastAiMessage.content.toLowerCase().includes('ready to start observing');
}

/**
 * Generate a compressed summary from the interview
 * @returns {Promise<InterviewSummary>}
 */
async function generateSummary() {
    if (!currentSession || currentSession.messages.length === 0) {
        throw new Error('No interview session to summarize');
    }

    if (!aiClient) {
        const apiKey = getApiKey();
        if (!apiKey) {
            throw new Error('No API key configured');
        }
        aiClient = new GoogleGenAI({ apiKey });
    }

    // Build transcript from messages
    const transcript = currentSession.messages
        .map(m => `${m.role === 'ai' ? 'Interviewer' : 'User'}: ${m.content}`)
        .join('\n\n');

    try {
        const response = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: transcript }] }],
            systemInstruction: {
                parts: [{ text: SUMMARY_GENERATION_PROMPT }]
            },
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 1000
            }
        });

        const responseText = response.text || '{}';

        // Parse JSON response
        let summaryData;
        try {
            // Clean up response - remove markdown code blocks if present
            const cleanedResponse = responseText
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();
            summaryData = JSON.parse(cleanedResponse);
        } catch (parseError) {
            console.error('Failed to parse summary JSON:', parseError);
            // Return default summary structure
            summaryData = {
                role: '',
                department: '',
                reportsTo: '',
                responsibilities: [],
                typicalDay: '',
                systemsUsed: [],
                statedPainPoints: [],
                interactions: []
            };
        }

        const summary = {
            ...summaryData,
            rawTokenCount: estimateTokenCount(transcript),
            generatedAt: new Date()
        };

        return summary;
    } catch (error) {
        console.error('Error generating summary:', error);
        throw new Error(`Failed to generate summary: ${error.message}`);
    }
}

/**
 * Complete the interview and transition to observation
 * @returns {Promise<{session: InterviewSession, summary: InterviewSummary}>}
 */
async function completeInterview() {
    if (!currentSession) {
        throw new Error('No active interview session');
    }

    // Mark as complete if not already
    if (!currentSession.completed) {
        currentSession.completed = true;
        currentSession.endTime = new Date();
    }

    // Generate summary
    const summary = await generateSummary();

    interviewEvents.emit('interview:ready-for-observation', {
        profileId: currentSession.profileId,
        session: currentSession,
        summary
    });

    const result = {
        session: currentSession,
        summary
    };

    return result;
}

/**
 * Get current interview session
 * @returns {InterviewSession|null}
 */
function getCurrentSession() {
    return currentSession;
}

/**
 * Skip current question and move to next topic
 * @returns {Promise<InterviewMessage>}
 */
async function skipQuestion() {
    if (!currentSession) {
        throw new Error('No active interview session');
    }

    // Add a skip indicator as user message
    const skipMsg = {
        id: generateMessageId(),
        role: 'user',
        content: '[Skipped this question]',
        timestamp: new Date()
    };
    currentSession.messages.push(skipMsg);

    // Generate next question
    const aiResponse = await generateAIResponse(currentSession.messages);
    const aiMsg = {
        id: generateMessageId(),
        role: 'ai',
        content: aiResponse,
        timestamp: new Date()
    };
    currentSession.messages.push(aiMsg);
    interviewEvents.emit('interview:message', aiMsg);

    return aiMsg;
}

/**
 * Resume an existing interview session
 * @param {InterviewSession} session - Session to resume
 */
function resumeInterview(session) {
    currentSession = session;

    // Reinitialize AI client
    const apiKey = getApiKey();
    if (apiKey) {
        aiClient = new GoogleGenAI({ apiKey });
    }

    return currentSession;
}

/**
 * Clear current session
 */
function clearSession() {
    currentSession = null;
    aiClient = null;
}

// ============ EXPORTS ============

module.exports = {
    // Core functions
    startInterview,
    sendMessage,
    generateSummary,
    completeInterview,
    skipQuestion,

    // Session management
    getCurrentSession,
    resumeInterview,
    clearSession,

    // Utility
    checkCompletion,

    // Events
    interviewEvents,

    // Prompts (exported for testing/customization)
    INTERVIEW_CONDUCTOR_PROMPT,
    SUMMARY_GENERATION_PROMPT,
    COMPLETION_PHRASE
};
