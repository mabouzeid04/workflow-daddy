// context.js - Context Management Service
// Maintains the AI's "memory" across different timeframes

const EventEmitter = require('events');
const { GoogleGenAI } = require('@google/genai');
const storage = require('../storage');

// Event emitter for context events
const contextEvents = new EventEmitter();

// ============ CONSTANTS ============

// Token budgets (approximate)
const TOKEN_BUDGETS = {
    immediate: 'N screenshots as images',
    session: 500,
    historical: 1000,
    baseline: 500,
    total_text: 2000
};

// Configuration
const CONFIG = {
    maxRecentScreenshots: 6, // FIFO buffer size
    summaryIntervalMs: 5 * 60 * 1000, // 5 minutes
    significantChangeThreshold: 0.3 // 30% difference threshold
};

// ============ DATA STRUCTURES ============

/**
 * @typedef {Object} Screenshot
 * @property {string} id - Unique screenshot ID
 * @property {string} sessionId - Associated session ID
 * @property {Date} timestamp - When the screenshot was taken
 * @property {string} imagePath - Path to the saved image file
 * @property {string} activeApplication - Name of the frontmost application
 * @property {string} windowTitle - Title of the active window
 * @property {string} [url] - URL if the active app is a browser
 */

/**
 * @typedef {Object} ImmediateContext
 * @property {Screenshot[]} recentScreenshots - last 3-6, FIFO buffer
 * @property {string} currentApp - Current application name
 * @property {string} currentWindowTitle - Current window title
 * @property {Date|null} lastAppSwitch - When the app last changed
 * @property {string|null} lastSignificantChange - Brief description of last change
 */

/**
 * @typedef {Object} TaskSummary
 * @property {string} name - Task name
 * @property {Date} startTime - When the task started
 * @property {Date|null} endTime - When the task ended
 * @property {number} duration - Duration in seconds
 * @property {string[]} apps - Applications used
 * @property {string} brief - One-line description
 */

/**
 * @typedef {Object} SessionContext
 * @property {string} sessionId - Unique session ID
 * @property {string} profileId - Associated profile ID
 * @property {Date} startTime - When the session started
 * @property {TaskSummary[]} tasksSoFar - Tasks completed in this session
 * @property {Object<string, number>} appTimeToday - App name -> seconds
 * @property {string[]} questionsAsked - Questions asked to avoid repeats
 * @property {string|null} currentTaskTheory - What we think user is doing
 * @property {Date} lastSummaryUpdate - When summary was last updated
 */

/**
 * @typedef {Object} SessionSummary
 * @property {string} sessionId - Session ID
 * @property {Date} date - Session date
 * @property {number} duration - Duration in seconds
 * @property {string[]} tasksCompleted - Task names completed
 * @property {string[]} appsUsed - Applications used
 * @property {number} questionsAnswered - Number of questions answered
 * @property {string[]} newObservations - New things learned
 * @property {string} brief - Paragraph summary
 */

/**
 * @typedef {Object} HistoricalContext
 * @property {Object} interviewSummary - Interview summary data
 * @property {string[]} knownTasks - Task names seen before
 * @property {SessionSummary[]} previousSessionSummaries - Past session summaries
 * @property {Array} relevantQA - Past Q&A answers
 */

/**
 * @typedef {Object} AssembledContext
 * @property {Object} immediate - Immediate context with screenshots
 * @property {string} session - Session summary (~500 tokens)
 * @property {string} historical - Relevant excerpts (~1000 tokens)
 * @property {string} baseline - Interview summary (~500 tokens)
 */

// ============ STATE ============

let immediateContext = null;
let sessionContext = null;
let historicalContext = null;
let aiClient = null;

// ============ IMMEDIATE CONTEXT ============

/**
 * Initialize empty immediate context
 * @returns {ImmediateContext}
 */
function initImmediateContext() {
    immediateContext = {
        recentScreenshots: [],
        currentApp: '',
        currentWindowTitle: '',
        lastAppSwitch: null,
        lastSignificantChange: null
    };
    return immediateContext;
}

/**
 * Update immediate context with new screenshot
 * @param {Screenshot} screenshot - New screenshot to add
 * @returns {ImmediateContext}
 */
function updateImmediateContext(screenshot) {
    if (!immediateContext) {
        initImmediateContext();
    }

    const prev = immediateContext.recentScreenshots.length > 0
        ? immediateContext.recentScreenshots[immediateContext.recentScreenshots.length - 1]
        : null;

    // Add to FIFO buffer
    immediateContext.recentScreenshots.push(screenshot);
    if (immediateContext.recentScreenshots.length > CONFIG.maxRecentScreenshots) {
        immediateContext.recentScreenshots.shift();
    }

    // Update current app/window
    const prevApp = immediateContext.currentApp;
    immediateContext.currentApp = screenshot.activeApplication;
    immediateContext.currentWindowTitle = screenshot.windowTitle;

    // Track app switch
    if (prevApp && prevApp !== screenshot.activeApplication) {
        immediateContext.lastAppSwitch = new Date();
    }

    // Detect significant change
    const change = detectSignificantChange(prev, screenshot);
    if (change) {
        immediateContext.lastSignificantChange = change;
    }

    contextEvents.emit('context:immediate-updated', immediateContext);
    return immediateContext;
}

/**
 * Detect if a significant change occurred between screenshots
 * @param {Screenshot|null} prev - Previous screenshot
 * @param {Screenshot} curr - Current screenshot
 * @returns {string|null} - Description of change or null
 */
function detectSignificantChange(prev, curr) {
    if (!prev) return null;

    const changes = [];

    // App changed
    if (prev.activeApplication !== curr.activeApplication) {
        changes.push(`Switched from ${prev.activeApplication} to ${curr.activeApplication}`);
    }

    // Window title changed significantly (different document/page)
    if (prev.windowTitle !== curr.windowTitle) {
        // Check if it's a meaningful change, not just focus
        const prevTitle = prev.windowTitle.toLowerCase();
        const currTitle = curr.windowTitle.toLowerCase();

        // Ignore minor changes
        if (!prevTitle.includes(currTitle) && !currTitle.includes(prevTitle)) {
            changes.push(`Window changed to: ${curr.windowTitle.substring(0, 50)}`);
        }
    }

    // URL changed (for browsers)
    if (prev.url && curr.url && prev.url !== curr.url) {
        try {
            const prevDomain = new URL(prev.url).hostname;
            const currDomain = new URL(curr.url).hostname;
            if (prevDomain !== currDomain) {
                changes.push(`Navigated to ${currDomain}`);
            }
        } catch {
            // Ignore URL parsing errors
        }
    }

    return changes.length > 0 ? changes.join('; ') : null;
}

/**
 * Get current immediate context
 * @returns {ImmediateContext|null}
 */
function getImmediateContext() {
    return immediateContext;
}

// ============ SESSION CONTEXT ============

/**
 * Initialize new session context
 * @param {string} sessionId - Unique session ID
 * @param {string} profileId - Associated profile ID
 * @returns {SessionContext}
 */
function initSessionContext(sessionId, profileId) {
    // Check for existing session context to resume
    const existing = storage.getSessionContext(sessionId);
    if (existing) {
        sessionContext = {
            ...existing,
            startTime: new Date(existing.startTime),
            lastSummaryUpdate: new Date(existing.lastSummaryUpdate)
        };
        return sessionContext;
    }

    sessionContext = {
        sessionId,
        profileId,
        startTime: new Date(),
        tasksSoFar: [],
        appTimeToday: {},
        questionsAsked: [],
        currentTaskTheory: null,
        lastSummaryUpdate: new Date()
    };

    // Persist initial context
    storage.saveSessionContext(sessionId, sessionContext);

    return sessionContext;
}

/**
 * Update session context with new observation event
 * @param {Object} event - Observation event (screenshot, app switch, etc.)
 * @returns {SessionContext}
 */
function updateSessionContext(event) {
    if (!sessionContext) {
        throw new Error('No active session context');
    }

    // Handle app time accumulation
    if (event.type === 'screenshot' || event.type === 'app_switch') {
        const app = event.app || event.activeApplication;
        if (app) {
            const interval = event.interval || 10; // Default 10 seconds
            sessionContext.appTimeToday[app] = (sessionContext.appTimeToday[app] || 0) + interval;
        }
    }

    // Handle task boundary
    if (event.type === 'task_boundary') {
        if (sessionContext.currentTaskTheory) {
            sessionContext.tasksSoFar.push({
                name: sessionContext.currentTaskTheory,
                startTime: event.taskStartTime || sessionContext.startTime,
                endTime: new Date(),
                duration: event.duration || 0,
                apps: event.apps || [],
                brief: event.brief || sessionContext.currentTaskTheory
            });
        }
        sessionContext.currentTaskTheory = event.newTask || null;
    }

    // Persist updated context
    storage.saveSessionContext(sessionContext.sessionId, sessionContext);

    contextEvents.emit('context:session-updated', sessionContext);
    return sessionContext;
}

/**
 * Add a question to the asked list to avoid repeats
 * @param {string} question - Question text
 */
function addQuestionAsked(question) {
    if (!sessionContext) return;

    sessionContext.questionsAsked.push(question);
    storage.saveSessionContext(sessionContext.sessionId, sessionContext);
}

/**
 * Update the current task theory
 * @param {string} theory - What we think the user is doing
 */
function updateTaskTheory(theory) {
    if (!sessionContext) return;

    sessionContext.currentTaskTheory = theory;
    storage.saveSessionContext(sessionContext.sessionId, sessionContext);
}

/**
 * Check if question was already asked
 * @param {string} question - Question to check
 * @returns {boolean}
 */
function wasQuestionAsked(question) {
    if (!sessionContext) return false;

    const normalizedQuestion = question.toLowerCase().trim();
    return sessionContext.questionsAsked.some(q =>
        q.toLowerCase().trim() === normalizedQuestion ||
        q.toLowerCase().includes(normalizedQuestion) ||
        normalizedQuestion.includes(q.toLowerCase())
    );
}

/**
 * Get current session context
 * @returns {SessionContext|null}
 */
function getSessionContextState() {
    return sessionContext;
}

// ============ SESSION SUMMARIZATION ============

/**
 * Check if it's time to update the session summary
 * @returns {boolean}
 */
function shouldUpdateSummary() {
    if (!sessionContext) return false;

    const timeSinceLastUpdate = Date.now() - new Date(sessionContext.lastSummaryUpdate).getTime();
    return timeSinceLastUpdate >= CONFIG.summaryIntervalMs;
}

/**
 * Generate session summary using LLM
 * @returns {Promise<SessionSummary>}
 */
async function generateSessionSummary() {
    if (!sessionContext) {
        throw new Error('No active session context');
    }

    // Initialize AI client if needed
    if (!aiClient) {
        const apiKey = storage.getApiKey();
        if (!apiKey) {
            throw new Error('No API key configured');
        }
        aiClient = new GoogleGenAI({ apiKey });
    }

    // Build context for summarization
    const summaryInput = {
        duration: Math.floor((Date.now() - new Date(sessionContext.startTime).getTime()) / 1000),
        appTime: sessionContext.appTimeToday,
        tasks: sessionContext.tasksSoFar,
        currentTask: sessionContext.currentTaskTheory,
        questionsCount: sessionContext.questionsAsked.length
    };

    const prompt = `Summarize this work session in a single paragraph (max 100 words).
Focus on: what was accomplished, main apps used, and current activity.

Session data:
- Duration: ${Math.floor(summaryInput.duration / 60)} minutes
- App usage: ${JSON.stringify(summaryInput.appTime)}
- Tasks completed: ${summaryInput.tasks.map(t => t.name).join(', ') || 'None yet'}
- Current activity: ${summaryInput.currentTask || 'Unknown'}

Output ONLY the summary paragraph, no JSON or labels.`;

    try {
        const response = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 200
            }
        });

        const brief = response.text || 'Session in progress.';

        const summary = {
            sessionId: sessionContext.sessionId,
            date: new Date(),
            duration: summaryInput.duration,
            tasksCompleted: sessionContext.tasksSoFar.map(t => t.name),
            appsUsed: Object.keys(sessionContext.appTimeToday),
            questionsAnswered: sessionContext.questionsAsked.length,
            newObservations: [],
            brief: brief.trim()
        };

        // Update last summary timestamp
        sessionContext.lastSummaryUpdate = new Date();
        storage.saveSessionContext(sessionContext.sessionId, sessionContext);

        contextEvents.emit('context:summary-generated', summary);
        return summary;
    } catch (error) {
        console.error('Error generating session summary:', error);
        throw error;
    }
}

/**
 * Finalize session and save summary to historical context
 * @returns {Promise<SessionSummary>}
 */
async function finalizeSession() {
    if (!sessionContext) {
        throw new Error('No active session context');
    }

    const summary = await generateSessionSummary();

    // Save to historical summaries
    storage.saveSessionSummary(sessionContext.profileId, summary);

    return summary;
}

// ============ HISTORICAL CONTEXT ============

/**
 * Load historical context for a profile
 * @param {string} profileId - Profile ID
 * @returns {HistoricalContext}
 */
function loadHistoricalContext(profileId) {
    const interviewSummary = storage.getInterviewSummary(profileId) || {};
    const previousSessionSummaries = storage.getSessionSummaries(profileId, 10);

    // Extract known task names from previous sessions
    const knownTasks = new Set();
    previousSessionSummaries.forEach(s => {
        if (s.tasksCompleted) {
            s.tasksCompleted.forEach(t => knownTasks.add(t));
        }
    });

    historicalContext = {
        interviewSummary,
        knownTasks: Array.from(knownTasks),
        previousSessionSummaries,
        relevantQA: []
    };

    return historicalContext;
}

/**
 * Get relevant history based on current activity
 * @param {string} currentActivity - Description of current activity
 * @returns {string} - Relevant excerpts (~1000 tokens)
 */
function getRelevantHistory(currentActivity) {
    if (!historicalContext) {
        return '';
    }

    const parts = [];

    // Add recent session summaries
    if (historicalContext.previousSessionSummaries.length > 0) {
        const recentSummaries = historicalContext.previousSessionSummaries.slice(0, 3);
        parts.push('Recent sessions:');
        recentSummaries.forEach(s => {
            const date = new Date(s.date).toLocaleDateString();
            parts.push(`- ${date}: ${s.brief}`);
        });
    }

    // Add known tasks that might be relevant
    if (historicalContext.knownTasks.length > 0) {
        parts.push(`\nKnown tasks: ${historicalContext.knownTasks.slice(0, 10).join(', ')}`);
    }

    // Limit to ~1000 tokens (roughly 4000 chars)
    const result = parts.join('\n');
    return result.substring(0, 4000);
}

/**
 * Get current historical context
 * @returns {HistoricalContext|null}
 */
function getHistoricalContextState() {
    return historicalContext;
}

// ============ CONTEXT ASSEMBLY ============

/**
 * Assemble complete context for LLM consumption
 * @returns {AssembledContext}
 */
function assembleContext() {
    const assembled = {
        immediate: {
            screenshots: immediateContext?.recentScreenshots || [],
            currentState: formatImmediateState()
        },
        session: formatSessionContext(),
        historical: formatHistoricalContext(),
        baseline: formatBaselineContext()
    };

    return assembled;
}

/**
 * Format immediate context state as string
 * @returns {string}
 */
function formatImmediateState() {
    if (!immediateContext) {
        return 'No immediate context available.';
    }

    const parts = [];
    parts.push(`Current app: ${immediateContext.currentApp || 'Unknown'}`);
    parts.push(`Window: ${immediateContext.currentWindowTitle || 'Unknown'}`);

    if (immediateContext.lastSignificantChange) {
        parts.push(`Recent change: ${immediateContext.lastSignificantChange}`);
    }

    if (immediateContext.lastAppSwitch) {
        const ago = Math.floor((Date.now() - new Date(immediateContext.lastAppSwitch).getTime()) / 1000);
        parts.push(`Last app switch: ${ago}s ago`);
    }

    return parts.join('\n');
}

/**
 * Format session context as string (~500 tokens)
 * @returns {string}
 */
function formatSessionContext() {
    if (!sessionContext) {
        return 'No session context available.';
    }

    const parts = [];
    const durationMins = Math.floor((Date.now() - new Date(sessionContext.startTime).getTime()) / 60000);
    parts.push(`Session duration: ${durationMins} minutes`);

    // Top apps by time
    const sortedApps = Object.entries(sessionContext.appTimeToday)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    if (sortedApps.length > 0) {
        const appTimes = sortedApps.map(([app, secs]) => `${app} (${Math.floor(secs / 60)}m)`);
        parts.push(`Top apps: ${appTimes.join(', ')}`);
    }

    // Tasks completed
    if (sessionContext.tasksSoFar.length > 0) {
        parts.push(`Tasks completed: ${sessionContext.tasksSoFar.map(t => t.name).join(', ')}`);
    }

    // Current task theory
    if (sessionContext.currentTaskTheory) {
        parts.push(`Current task: ${sessionContext.currentTaskTheory}`);
    }

    // Questions asked count
    if (sessionContext.questionsAsked.length > 0) {
        parts.push(`Questions asked this session: ${sessionContext.questionsAsked.length}`);
    }

    // Limit to ~500 tokens (2000 chars)
    const result = parts.join('\n');
    return result.substring(0, 2000);
}

/**
 * Format historical context as string (~1000 tokens)
 * @returns {string}
 */
function formatHistoricalContext() {
    if (!historicalContext) {
        return 'No historical context available.';
    }

    return getRelevantHistory(sessionContext?.currentTaskTheory || '');
}

/**
 * Format baseline (interview) context as string (~500 tokens)
 * @returns {string}
 */
function formatBaselineContext() {
    if (!historicalContext?.interviewSummary) {
        return 'No interview data available.';
    }

    const summary = historicalContext.interviewSummary;
    const parts = [];

    if (summary.role) {
        parts.push(`Role: ${summary.role}`);
    }
    if (summary.department) {
        parts.push(`Department: ${summary.department}`);
    }
    if (summary.responsibilities?.length > 0) {
        parts.push(`Responsibilities: ${summary.responsibilities.join(', ')}`);
    }
    if (summary.systemsUsed?.length > 0) {
        parts.push(`Systems used: ${summary.systemsUsed.join(', ')}`);
    }
    if (summary.statedPainPoints?.length > 0) {
        parts.push(`Pain points: ${summary.statedPainPoints.join(', ')}`);
    }
    if (summary.typicalDay) {
        parts.push(`Typical day: ${summary.typicalDay}`);
    }

    // Limit to ~500 tokens (2000 chars)
    const result = parts.join('\n');
    return result.substring(0, 2000);
}

/**
 * Get assembled context as a formatted string for LLM
 * @returns {string}
 */
function getContextForLLM() {
    const ctx = assembleContext();

    return `=== BASELINE (User's Role) ===
${ctx.baseline}

=== HISTORICAL (Previous Sessions) ===
${ctx.historical}

=== SESSION (Current Session) ===
${ctx.session}

=== IMMEDIATE (Current State) ===
${ctx.immediate.currentState}`;
}

// ============ SESSION LIFECYCLE ============

/**
 * Start a new observation session
 * @param {string} sessionId - Unique session ID
 * @param {string} profileId - Associated profile ID
 */
function startSession(sessionId, profileId) {
    // Initialize all context layers
    initImmediateContext();
    initSessionContext(sessionId, profileId);
    loadHistoricalContext(profileId);

    return {
        immediate: immediateContext,
        session: sessionContext,
        historical: historicalContext
    };
}

/**
 * End the current session
 * @returns {Promise<SessionSummary>}
 */
async function endSession() {
    if (!sessionContext) {
        throw new Error('No active session');
    }

    // Generate and save final summary
    const summary = await finalizeSession();

    // Clear state
    immediateContext = null;
    sessionContext = null;
    // Keep historical context for potential reuse

    return summary;
}

/**
 * Clear all context state
 */
function clearContext() {
    immediateContext = null;
    sessionContext = null;
    historicalContext = null;
    aiClient = null;
}

// ============ EXPORTS ============

module.exports = {
    // Immediate Context
    initImmediateContext,
    updateImmediateContext,
    detectSignificantChange,
    getImmediateContext,

    // Session Context
    initSessionContext,
    updateSessionContext,
    addQuestionAsked,
    updateTaskTheory,
    wasQuestionAsked,
    getSessionContextState,

    // Session Summarization
    shouldUpdateSummary,
    generateSessionSummary,
    finalizeSession,

    // Historical Context
    loadHistoricalContext,
    getRelevantHistory,
    getHistoricalContextState,

    // Context Assembly
    assembleContext,
    getContextForLLM,

    // Session Lifecycle
    startSession,
    endSession,
    clearContext,

    // Events
    contextEvents,

    // Constants
    TOKEN_BUDGETS,
    CONFIG
};
