// session.js - Session Management Utility
// Handles the lifecycle of observation sessions - starting, stopping, pausing,
// resuming, and persisting session data across app restarts.

const { EventEmitter } = require('events');
const fs = require('fs');
const storage = require('../storage');
const { captureEvents } = require('./capture');
const context = require('./context');
const confusion = require('./confusion');
const taskDetection = require('./taskDetection');

// Event emitter for session events
const sessionEvents = new EventEmitter();

// Default session configuration
const DEFAULT_SESSION_CONFIG = {
    idleThreshold: 300, // seconds before auto-pause, default 5 minutes
    maxSessionAge: 72, // hours before session can't be resumed, default 72 hours
    heartbeatInterval: 30000, // ms, default 30 seconds
    autoResumeOnActivity: true
};

// Current state
let currentConfig = { ...DEFAULT_SESSION_CONFIG };
let currentSession = null;
let currentProfile = null;
let heartbeatInterval = null;
let idleCheckInterval = null;
let lastActivityTime = Date.now();

// Screenshot analysis state
let screenshotsSinceLastAnalysis = 0;
const ANALYSIS_INTERVAL = 3; // Analyze every 3rd screenshot to reduce API costs

// ============ ID GENERATION ============

function generateId(prefix = 'sess') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============ PROFILE MANAGEMENT ============

/**
 * Create a new profile
 * @param {string} name - Profile name
 * @returns {Object} Created profile
 */
function createProfile(name) {
    const profile = {
        id: generateId('prof'),
        name: name || 'Unnamed Profile',
        createdAt: new Date().toISOString(),
        interviewCompleted: false,
        totalObservationTime: 0,
        sessionCount: 0,
        lastSessionId: null
    };

    // Save profile
    storage.saveProfile(profile.id, profile);

    // Set as current profile
    currentProfile = profile;
    updateAppState({ currentProfileId: profile.id });

    sessionEvents.emit('profile:created', profile);

    return profile;
}

/**
 * Load a profile by ID
 * @param {string} profileId - Profile ID
 * @returns {Object|null} Profile or null if not found
 */
function loadProfile(profileId) {
    const profile = storage.getProfile(profileId);

    if (profile) {
        currentProfile = profile;
        updateAppState({ currentProfileId: profileId });
        sessionEvents.emit('profile:loaded', profile);
    }

    return profile;
}

/**
 * List all profiles sorted by last activity
 * @returns {Array} Array of profiles
 */
function listProfiles() {
    const profiles = storage.getAllProfilesWithSessions();

    // Sort by last activity (most recent first)
    return profiles.sort((a, b) => {
        const aTime = a.lastSessionId ? new Date(a.updatedAt || a.createdAt).getTime() : 0;
        const bTime = b.lastSessionId ? new Date(b.updatedAt || b.createdAt).getTime() : 0;
        return bTime - aTime;
    });
}

/**
 * Get current profile
 * @returns {Object|null} Current profile
 */
function getCurrentProfile() {
    return currentProfile;
}

// ============ SESSION LIFECYCLE ============

/**
 * Start a new session
 * @param {string} profileId - Profile ID
 * @returns {Object} Created session
 */
function startSession(profileId) {
    // Load profile if not already loaded
    if (!currentProfile || currentProfile.id !== profileId) {
        const profile = loadProfile(profileId);
        if (!profile) {
            throw new Error(`Profile not found: ${profileId}`);
        }
    }

    // Determine phase based on interview completion
    const interviewCompleted = storage.hasCompletedInterview(profileId);
    const phase = interviewCompleted ? 'observation' : 'interview';

    const session = {
        id: generateId('sess'),
        profileId,
        startTime: new Date().toISOString(),
        endTime: null,
        status: 'active',
        phase,
        pauseHistory: [],
        totalActiveTime: 0,
        screenshotCount: 0,
        taskCount: 0,
        questionCount: 0
    };

    // Save session
    storage.saveObservationSession(profileId, session.id, session);

    // Update profile
    currentProfile.sessionCount++;
    currentProfile.lastSessionId = session.id;
    storage.saveProfile(profileId, currentProfile);

    // Update app state
    updateAppState({
        currentSessionId: session.id,
        lastKnownState: 'active',
        lastHeartbeat: new Date().toISOString()
    });

    currentSession = session;

    // Start heartbeat
    startHeartbeat();

    // Start idle detection if in observation phase
    if (phase === 'observation') {
        startIdleDetection();

        // Initialize screenshot analysis
        initializeScreenshotAnalysis(session.id, profileId);

        // Listen for screenshot capture events
        captureEvents.on('screenshot:captured', onScreenshotCaptured);
    }

    sessionEvents.emit('session:started', session);

    return session;
}

/**
 * Pause the current session
 * @param {string} reason - Pause reason ('user' | 'idle' | 'app_closed' | 'system_sleep')
 * @returns {Object} Updated session
 */
function pauseSession(reason = 'user') {
    if (!currentSession) {
        throw new Error('No active session to pause');
    }

    if (currentSession.status !== 'active') {
        throw new Error(`Session is not active (current status: ${currentSession.status})`);
    }

    // Calculate active time since last pause/start
    const activeTimeSinceStart = calculateActiveTimeSince(currentSession);
    currentSession.totalActiveTime += activeTimeSinceStart;

    // Add pause record
    const pauseRecord = {
        pausedAt: new Date().toISOString(),
        resumedAt: null,
        reason
    };
    currentSession.pauseHistory.push(pauseRecord);
    currentSession.status = 'paused';

    // Save session
    storage.saveObservationSession(currentSession.profileId, currentSession.id, currentSession);

    // Update app state
    updateAppState({
        lastKnownState: 'paused',
        lastHeartbeat: new Date().toISOString()
    });

    // Stop heartbeat and idle detection
    stopHeartbeat();
    stopIdleDetection();

    // Stop listening for screenshot events during pause
    captureEvents.removeListener('screenshot:captured', onScreenshotCaptured);

    sessionEvents.emit('session:paused', { session: currentSession, reason });

    return currentSession;
}

/**
 * Resume a paused session
 * @param {string} sessionId - Session ID (optional, uses current if not provided)
 * @returns {Object} Updated session
 */
function resumeSession(sessionId = null) {
    let session = currentSession;

    if (sessionId && (!currentSession || currentSession.id !== sessionId)) {
        // Load the session
        const appState = getAppState();
        const profileId = appState.currentProfileId;

        if (!profileId) {
            throw new Error('No profile loaded');
        }

        session = storage.getObservationSession(profileId, sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
    }

    if (!session) {
        throw new Error('No session to resume');
    }

    if (session.status !== 'paused') {
        throw new Error(`Session is not paused (current status: ${session.status})`);
    }

    // Update the last pause record with resumedAt
    const lastPause = session.pauseHistory[session.pauseHistory.length - 1];
    if (lastPause && !lastPause.resumedAt) {
        lastPause.resumedAt = new Date().toISOString();
    }

    session.status = 'active';
    currentSession = session;

    // Save session
    storage.saveObservationSession(session.profileId, session.id, session);

    // Update app state
    updateAppState({
        currentSessionId: session.id,
        lastKnownState: 'active',
        lastHeartbeat: new Date().toISOString()
    });

    // Restart heartbeat and idle detection
    startHeartbeat();
    if (session.phase === 'observation') {
        startIdleDetection();

        // Re-add screenshot event listener
        captureEvents.on('screenshot:captured', onScreenshotCaptured);
    }

    // Reset activity time
    lastActivityTime = Date.now();

    sessionEvents.emit('session:resumed', session);

    return session;
}

/**
 * End the current session
 * @returns {Object} Completed session
 */
function endSession() {
    if (!currentSession) {
        throw new Error('No active session to end');
    }

    // Calculate final active time
    if (currentSession.status === 'active') {
        const activeTimeSinceStart = calculateActiveTimeSince(currentSession);
        currentSession.totalActiveTime += activeTimeSinceStart;
    }

    currentSession.endTime = new Date().toISOString();
    currentSession.status = 'completed';

    // Save session
    storage.saveObservationSession(currentSession.profileId, currentSession.id, currentSession);

    // Update profile stats
    if (currentProfile) {
        currentProfile.totalObservationTime += currentSession.totalActiveTime;
        storage.saveProfile(currentProfile.id, currentProfile);
    }

    // Update app state
    updateAppState({
        currentSessionId: null,
        lastKnownState: 'closed',
        lastHeartbeat: new Date().toISOString()
    });

    // Stop heartbeat and idle detection
    stopHeartbeat();
    stopIdleDetection();

    // Cleanup screenshot analysis
    captureEvents.removeListener('screenshot:captured', onScreenshotCaptured);
    cleanupScreenshotAnalysis();

    const completedSession = currentSession;

    sessionEvents.emit('session:ended', completedSession);

    currentSession = null;

    return completedSession;
}

/**
 * Get current session
 * @returns {Object|null} Current session
 */
function getCurrentSession() {
    return currentSession;
}

// ============ AUTO-PAUSE (IDLE DETECTION) ============

/**
 * Record activity (resets idle timer)
 */
function recordActivity() {
    lastActivityTime = Date.now();
}

/**
 * Check if user is idle
 * @returns {boolean} True if idle
 */
function detectIdle() {
    const idleTime = (Date.now() - lastActivityTime) / 1000;
    return idleTime >= currentConfig.idleThreshold;
}

/**
 * Start idle detection
 */
function startIdleDetection() {
    if (idleCheckInterval) {
        clearInterval(idleCheckInterval);
    }

    // Check every 10 seconds
    idleCheckInterval = setInterval(() => {
        if (currentSession && currentSession.status === 'active' && detectIdle()) {
            handleIdle();
        }
    }, 10000);
}

/**
 * Stop idle detection
 */
function stopIdleDetection() {
    if (idleCheckInterval) {
        clearInterval(idleCheckInterval);
        idleCheckInterval = null;
    }
}

/**
 * Handle idle state
 */
function handleIdle() {
    if (currentSession && currentSession.status === 'active') {
        pauseSession('idle');
        sessionEvents.emit('session:idle-paused', currentSession);
    }
}

/**
 * Handle activity resume after idle
 */
function handleActivityResume() {
    if (currentSession && currentSession.status === 'paused' && currentConfig.autoResumeOnActivity) {
        const lastPause = currentSession.pauseHistory[currentSession.pauseHistory.length - 1];
        if (lastPause && lastPause.reason === 'idle') {
            resumeSession();
            sessionEvents.emit('session:auto-resumed', currentSession);
        }
    }
}

// ============ CRASH RECOVERY ============

/**
 * Save heartbeat (call periodically while active)
 */
function saveHeartbeat() {
    if (currentSession && currentSession.status === 'active') {
        updateAppState({
            lastHeartbeat: new Date().toISOString()
        });
    }
}

/**
 * Start heartbeat interval
 */
function startHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }

    heartbeatInterval = setInterval(() => {
        saveHeartbeat();
    }, currentConfig.heartbeatInterval);

    // Save immediately
    saveHeartbeat();
}

/**
 * Stop heartbeat interval
 */
function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}

/**
 * Check for crash on app start
 * @returns {boolean} True if crash detected
 */
function checkForCrash() {
    const appState = getAppState();

    if (!appState) {
        return false;
    }

    // If lastKnownState was 'active' but app wasn't running, it crashed
    if (appState.lastKnownState === 'active' && appState.currentSessionId) {
        return true;
    }

    return false;
}

/**
 * Recover from crash
 * @returns {Object|null} Recovered session or null
 */
function recoverFromCrash() {
    const appState = getAppState();

    if (!appState || !appState.currentSessionId || !appState.currentProfileId) {
        return null;
    }

    // Load the session
    const session = storage.getObservationSession(appState.currentProfileId, appState.currentSessionId);

    if (!session) {
        return null;
    }

    // Calculate time lost (from last heartbeat to now)
    const lastHeartbeat = new Date(appState.lastHeartbeat).getTime();
    const now = Date.now();
    const timeLostMs = now - lastHeartbeat;

    // Add a pause record for the crash
    const pauseRecord = {
        pausedAt: appState.lastHeartbeat,
        resumedAt: null,
        reason: 'app_closed'
    };

    session.pauseHistory.push(pauseRecord);
    session.status = 'paused';

    // Save updated session
    storage.saveObservationSession(appState.currentProfileId, session.id, session);

    // Update app state
    updateAppState({
        lastKnownState: 'paused',
        lastHeartbeat: new Date().toISOString()
    });

    // Load profile
    loadProfile(appState.currentProfileId);
    currentSession = session;

    sessionEvents.emit('session:crash-recovered', {
        session,
        timeLostMs
    });

    return session;
}

// ============ SESSION RESUME (MULTI-DAY) ============

/**
 * Check if a session can be resumed
 * @param {Object} session - Session to check
 * @returns {boolean} True if resumable
 */
function canResumeSession(session) {
    if (!session) {
        return false;
    }

    // Can't resume completed sessions
    if (session.status === 'completed') {
        return false;
    }

    // Check session age
    const sessionAge = getSessionAgeHours(session);
    if (sessionAge > currentConfig.maxSessionAge) {
        return false;
    }

    return true;
}

/**
 * Get resumable session for a profile
 * @param {string} profileId - Profile ID
 * @returns {Object|null} Resumable session or null
 */
function getResumableSession(profileId) {
    const sessions = storage.getProfileSessions(profileId);

    // Find most recent non-completed session
    const resumable = sessions
        .filter(s => s.status !== 'completed')
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
        .find(s => canResumeSession(s));

    return resumable || null;
}

/**
 * Get session age in hours
 * @param {Object} session - Session
 * @returns {number} Age in hours
 */
function getSessionAgeHours(session) {
    const startTime = new Date(session.startTime).getTime();
    const now = Date.now();
    return (now - startTime) / (1000 * 60 * 60);
}

// ============ APP STATE MANAGEMENT ============

/**
 * Get app state
 * @returns {Object} App state
 */
function getAppState() {
    return storage.getAppState();
}

/**
 * Update app state
 * @param {Object} updates - State updates
 */
function updateAppState(updates) {
    const current = getAppState() || {
        currentProfileId: null,
        currentSessionId: null,
        lastKnownState: 'closed',
        lastHeartbeat: new Date().toISOString()
    };

    storage.saveAppState({ ...current, ...updates });
}

// ============ SESSION STATS ============

/**
 * Update session screenshot count
 * @param {number} count - New count or increment
 */
function updateScreenshotCount(count) {
    if (currentSession) {
        currentSession.screenshotCount = count;
        storage.saveObservationSession(currentSession.profileId, currentSession.id, currentSession);
    }
}

/**
 * Increment session screenshot count
 */
function incrementScreenshotCount() {
    if (currentSession) {
        currentSession.screenshotCount++;
        storage.saveObservationSession(currentSession.profileId, currentSession.id, currentSession);
    }
}

/**
 * Update session task count
 * @param {number} count - New count
 */
function updateTaskCount(count) {
    if (currentSession) {
        currentSession.taskCount = count;
        storage.saveObservationSession(currentSession.profileId, currentSession.id, currentSession);
    }
}

/**
 * Update session question count
 * @param {number} count - New count
 */
function updateQuestionCount(count) {
    if (currentSession) {
        currentSession.questionCount = count;
        storage.saveObservationSession(currentSession.profileId, currentSession.id, currentSession);
    }
}

// ============ SCREENSHOT ANALYSIS ============

/**
 * Handle screenshot captured event
 * Triggers AI analysis for confusion detection and task detection
 * @param {Object} screenshot - Screenshot metadata from capture service
 */
async function onScreenshotCaptured(screenshot) {
    if (!currentSession || currentSession.status !== 'active') {
        return;
    }

    // Only process during observation phase
    if (currentSession.phase !== 'observation') {
        return;
    }

    // Increment screenshot count
    incrementScreenshotCount();

    // Record activity for idle detection
    recordActivity();

    // Update immediate context with screenshot metadata
    context.updateImmediateContext(screenshot);

    // Update session context with app time
    context.updateSessionContext({
        type: 'screenshot',
        app: screenshot.activeApplication,
        interval: 10 // Default capture interval
    });

    // Track screenshots for rate-limited analysis
    screenshotsSinceLastAnalysis++;

    // Only run AI analysis every Nth screenshot
    if (screenshotsSinceLastAnalysis < ANALYSIS_INTERVAL) {
        return;
    }

    screenshotsSinceLastAnalysis = 0;

    // Get assembled context for analysis
    const assembledContext = context.assembleContext();

    // Prepare screenshot images for analysis
    let screenshotImages = [];
    try {
        // Read the screenshot image if it exists
        if (screenshot.imagePath && fs.existsSync(screenshot.imagePath)) {
            const imageBuffer = fs.readFileSync(screenshot.imagePath);
            const base64 = imageBuffer.toString('base64');
            screenshotImages = [{
                base64,
                mimeType: 'image/jpeg'
            }];
        }
    } catch (error) {
        console.error('[Session] Error reading screenshot for analysis:', error.message);
    }

    // Run confusion detection (non-blocking)
    runConfusionAnalysis(screenshotImages).catch(error => {
        console.error('[Session] Confusion analysis error:', error.message);
    });

    // Run task detection
    runTaskDetection(screenshot, assembledContext).catch(error => {
        console.error('[Session] Task detection error:', error.message);
    });
}

/**
 * Run confusion analysis on screenshots
 * @param {Array} screenshotImages - Array of screenshot image data
 */
async function runConfusionAnalysis(screenshotImages) {
    if (!currentSession) return;

    try {
        const question = await confusion.runConfusionCheck(screenshotImages);

        if (question) {
            // Update question count
            updateQuestionCount(currentSession.questionCount + 1);
            sessionEvents.emit('question:created', question);
            console.log('[Session] Confusion question created:', question.question);
        }
    } catch (error) {
        console.error('[Session] Error running confusion check:', error.message);
    }
}

/**
 * Run task detection on screenshot
 * @param {Object} screenshot - Screenshot metadata
 * @param {Object} assembledContext - Assembled context for LLM
 */
async function runTaskDetection(screenshot, assembledContext) {
    if (!currentSession) return;

    try {
        const boundaryEvent = await taskDetection.processScreenshot(screenshot, assembledContext);

        if (boundaryEvent) {
            // Update task count on boundary events
            const tasks = taskDetection.getSessionTasks();
            updateTaskCount(tasks.length);

            // Update context with task boundary
            if (boundaryEvent.type === 'task_switch' || boundaryEvent.type === 'task_end') {
                context.updateSessionContext({
                    type: 'task_boundary',
                    newTask: boundaryEvent.newTask?.name,
                    duration: boundaryEvent.previousTask?.duration,
                    apps: boundaryEvent.previousTask?.applications?.map(a => a.app) || []
                });
            }

            sessionEvents.emit('task:boundary', boundaryEvent);
            console.log('[Session] Task boundary detected:', boundaryEvent.type);
        }
    } catch (error) {
        console.error('[Session] Error in task detection:', error.message);
    }
}

/**
 * Initialize screenshot analysis for a session
 * @param {string} sessionId - Session ID
 * @param {string} profileId - Profile ID
 */
function initializeScreenshotAnalysis(sessionId, profileId) {
    // Reset counter
    screenshotsSinceLastAnalysis = 0;

    // Initialize context service
    context.startSession(sessionId, profileId);

    // Initialize confusion detection
    confusion.initConfusionDetection(sessionId);

    // Initialize task detection
    taskDetection.initTaskDetection(sessionId);

    console.log('[Session] Screenshot analysis initialized for session:', sessionId);
}

/**
 * Cleanup screenshot analysis
 */
function cleanupScreenshotAnalysis() {
    screenshotsSinceLastAnalysis = 0;

    // Clear confusion state
    confusion.clearConfusionState();

    // End task detection session
    taskDetection.endSession();

    console.log('[Session] Screenshot analysis cleaned up');
}

// ============ HELPERS ============

/**
 * Calculate active time since last pause/start
 * @param {Object} session - Session
 * @returns {number} Active time in seconds
 */
function calculateActiveTimeSince(session) {
    let lastActiveStart;

    if (session.pauseHistory.length > 0) {
        // Get the last resume time
        const lastPause = session.pauseHistory[session.pauseHistory.length - 1];
        if (lastPause.resumedAt) {
            lastActiveStart = new Date(lastPause.resumedAt).getTime();
        } else {
            // Session is currently paused
            return 0;
        }
    } else {
        // No pauses, use session start time
        lastActiveStart = new Date(session.startTime).getTime();
    }

    return (Date.now() - lastActiveStart) / 1000;
}

/**
 * Get session statistics
 * @returns {Object} Session stats
 */
function getSessionStats() {
    if (!currentSession) {
        return null;
    }

    let totalActiveTime = currentSession.totalActiveTime;

    // Add current active time if session is active
    if (currentSession.status === 'active') {
        totalActiveTime += calculateActiveTimeSince(currentSession);
    }

    return {
        sessionId: currentSession.id,
        status: currentSession.status,
        phase: currentSession.phase,
        totalActiveTime,
        screenshotCount: currentSession.screenshotCount,
        taskCount: currentSession.taskCount,
        questionCount: currentSession.questionCount,
        pauseCount: currentSession.pauseHistory.length,
        startTime: currentSession.startTime,
        endTime: currentSession.endTime
    };
}

// ============ CONFIGURATION ============

/**
 * Get session configuration
 * @returns {Object} Session config
 */
function getConfig() {
    return { ...currentConfig };
}

/**
 * Update session configuration
 * @param {Object} updates - Config updates
 */
function updateConfig(updates) {
    currentConfig = { ...currentConfig, ...updates };
}

// ============ APP STARTUP FLOW ============

/**
 * Initialize session management on app startup
 * @returns {Object} Startup result
 */
function initializeOnStartup() {
    const appState = getAppState();

    const result = {
        crashDetected: false,
        hasResumableSession: false,
        resumableSession: null,
        profile: null
    };

    if (!appState) {
        return result;
    }

    // Check for crash
    if (checkForCrash()) {
        result.crashDetected = true;
        const recovered = recoverFromCrash();
        if (recovered) {
            result.hasResumableSession = true;
            result.resumableSession = recovered;
            result.profile = currentProfile;
        }
        return result;
    }

    // Check for resumable session
    if (appState.currentProfileId) {
        loadProfile(appState.currentProfileId);
        result.profile = currentProfile;

        const resumable = getResumableSession(appState.currentProfileId);
        if (resumable) {
            result.hasResumableSession = true;
            result.resumableSession = resumable;
            currentSession = resumable;
        }
    }

    return result;
}

/**
 * Clear all session state (for testing or reset)
 */
function clearSessionState() {
    stopHeartbeat();
    stopIdleDetection();
    captureEvents.removeListener('screenshot:captured', onScreenshotCaptured);
    cleanupScreenshotAnalysis();
    currentSession = null;
    currentProfile = null;
    lastActivityTime = Date.now();
}

module.exports = {
    // Events
    sessionEvents,

    // Profile Management
    createProfile,
    loadProfile,
    listProfiles,
    getCurrentProfile,

    // Session Lifecycle
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    getCurrentSession,

    // Auto-Pause
    recordActivity,
    detectIdle,
    handleIdle,
    handleActivityResume,

    // Crash Recovery
    saveHeartbeat,
    checkForCrash,
    recoverFromCrash,

    // Session Resume
    canResumeSession,
    getResumableSession,

    // App State
    getAppState,
    updateAppState,

    // Session Stats
    updateScreenshotCount,
    incrementScreenshotCount,
    updateTaskCount,
    updateQuestionCount,
    getSessionStats,

    // Configuration
    getConfig,
    updateConfig,

    // App Startup
    initializeOnStartup,
    clearSessionState,

    // Screenshot Analysis
    onScreenshotCaptured,
    initializeScreenshotAnalysis,
    cleanupScreenshotAnalysis
};
