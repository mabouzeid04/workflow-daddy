const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_VERSION = 1;

// Default values
const DEFAULT_CONFIG = {
    configVersion: CONFIG_VERSION,
    onboarded: false,
    layout: 'normal'
};

const DEFAULT_CREDENTIALS = {
    apiKey: ''
};

const DEFAULT_PREFERENCES = {
    customPrompt: '',
    selectedProfile: 'interview',
    selectedLanguage: 'en-US',
    selectedScreenshotInterval: '5',
    selectedImageQuality: 'medium',
    advancedMode: false,
    audioMode: 'speaker_only',
    fontSize: 'medium',
    backgroundTransparency: 0.8
};

// Default capture configuration
const DEFAULT_CAPTURE_CONFIG = {
    screenshotInterval: 10000, // milliseconds, default 10s
    imageQuality: 0.7, // 0-1, default 0.7
    captureAllMonitors: false, // default false (primary only)
    trackUrls: true, // default true
    urlPrivacyMode: 'full' // 'full' | 'domain-only'
};

const DEFAULT_KEYBINDS = null; // null means use system defaults

// Get the config directory path based on OS
function getConfigDir() {
    const platform = os.platform();
    let configDir;

    if (platform === 'win32') {
        configDir = path.join(os.homedir(), 'AppData', 'Roaming', 'workflow-daddy-config');
    } else if (platform === 'darwin') {
        configDir = path.join(os.homedir(), 'Library', 'Application Support', 'workflow-daddy-config');
    } else {
        configDir = path.join(os.homedir(), '.config', 'workflow-daddy-config');
    }

    return configDir;
}

// File paths
function getConfigPath() {
    return path.join(getConfigDir(), 'config.json');
}

function getCredentialsPath() {
    return path.join(getConfigDir(), 'credentials.json');
}

function getPreferencesPath() {
    return path.join(getConfigDir(), 'preferences.json');
}

function getKeybindsPath() {
    return path.join(getConfigDir(), 'keybinds.json');
}

function getHistoryDir() {
    return path.join(getConfigDir(), 'history');
}

function getCaptureConfigPath() {
    return path.join(getConfigDir(), 'capture-config.json');
}

function getSessionsDir() {
    return path.join(getConfigDir(), 'sessions');
}

function getSessionScreenshotsDir(sessionId) {
    return path.join(getSessionsDir(), sessionId, 'screenshots');
}

// Helper to read JSON file safely
function readJsonFile(filePath, defaultValue) {
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.warn(`Error reading ${filePath}:`, error.message);
    }
    return defaultValue;
}

// Helper to write JSON file safely
function writeJsonFile(filePath, data) {
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error.message);
        return false;
    }
}

// Check if we need to reset (no configVersion or wrong version)
function needsReset() {
    const configPath = getConfigPath();
    if (!fs.existsSync(configPath)) {
        return true;
    }

    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return !config.configVersion || config.configVersion !== CONFIG_VERSION;
    } catch {
        return true;
    }
}

// Wipe and reinitialize the config directory
function resetConfigDir() {
    const configDir = getConfigDir();

    console.log('Resetting config directory...');

    // Remove existing directory if it exists
    if (fs.existsSync(configDir)) {
        fs.rmSync(configDir, { recursive: true, force: true });
    }

    // Create fresh directory structure
    fs.mkdirSync(configDir, { recursive: true });
    fs.mkdirSync(getHistoryDir(), { recursive: true });

    // Initialize with defaults
    writeJsonFile(getConfigPath(), DEFAULT_CONFIG);
    writeJsonFile(getCredentialsPath(), DEFAULT_CREDENTIALS);
    writeJsonFile(getPreferencesPath(), DEFAULT_PREFERENCES);

    console.log('Config directory initialized with defaults');
}

// Initialize storage - call this on app startup
function initializeStorage() {
    if (needsReset()) {
        resetConfigDir();
    } else {
        // Ensure history directory exists
        const historyDir = getHistoryDir();
        if (!fs.existsSync(historyDir)) {
            fs.mkdirSync(historyDir, { recursive: true });
        }
    }
}

// ============ CONFIG ============

function getConfig() {
    return readJsonFile(getConfigPath(), DEFAULT_CONFIG);
}

function setConfig(config) {
    const current = getConfig();
    const updated = { ...current, ...config, configVersion: CONFIG_VERSION };
    return writeJsonFile(getConfigPath(), updated);
}

function updateConfig(key, value) {
    const config = getConfig();
    config[key] = value;
    return writeJsonFile(getConfigPath(), config);
}

// ============ CREDENTIALS ============

function getCredentials() {
    return readJsonFile(getCredentialsPath(), DEFAULT_CREDENTIALS);
}

function setCredentials(credentials) {
    const current = getCredentials();
    const updated = { ...current, ...credentials };
    return writeJsonFile(getCredentialsPath(), updated);
}

function getApiKey() {
    return getCredentials().apiKey || '';
}

function setApiKey(apiKey) {
    return setCredentials({ apiKey });
}

// ============ PREFERENCES ============

function getPreferences() {
    const saved = readJsonFile(getPreferencesPath(), {});
    return { ...DEFAULT_PREFERENCES, ...saved };
}

function setPreferences(preferences) {
    const current = getPreferences();
    const updated = { ...current, ...preferences };
    return writeJsonFile(getPreferencesPath(), updated);
}

function updatePreference(key, value) {
    const preferences = getPreferences();
    preferences[key] = value;
    return writeJsonFile(getPreferencesPath(), preferences);
}

// ============ KEYBINDS ============

function getKeybinds() {
    return readJsonFile(getKeybindsPath(), DEFAULT_KEYBINDS);
}

function setKeybinds(keybinds) {
    return writeJsonFile(getKeybindsPath(), keybinds);
}

// ============ CAPTURE CONFIG ============

function getCaptureConfig() {
    const saved = readJsonFile(getCaptureConfigPath(), {});
    return { ...DEFAULT_CAPTURE_CONFIG, ...saved };
}

function setCaptureConfig(config) {
    const current = getCaptureConfig();
    const updated = { ...current, ...config };
    return writeJsonFile(getCaptureConfigPath(), updated);
}

function updateCaptureConfig(key, value) {
    const config = getCaptureConfig();
    config[key] = value;
    return writeJsonFile(getCaptureConfigPath(), config);
}

// ============ SESSION SCREENSHOTS ============

function ensureSessionScreenshotsDir(sessionId) {
    const dir = getSessionScreenshotsDir(sessionId);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}

function getScreenshotMetadataPath(sessionId) {
    return path.join(getSessionsDir(), sessionId, 'screenshots.json');
}

function saveScreenshotMetadata(sessionId, metadata) {
    const metadataPath = getScreenshotMetadataPath(sessionId);
    const existing = readJsonFile(metadataPath, { screenshots: [] });
    existing.screenshots.push(metadata);
    return writeJsonFile(metadataPath, existing);
}

function getSessionScreenshots(sessionId) {
    const metadataPath = getScreenshotMetadataPath(sessionId);
    const data = readJsonFile(metadataPath, { screenshots: [] });
    return data.screenshots;
}

function getAppUsageMetadataPath(sessionId) {
    return path.join(getSessionsDir(), sessionId, 'app-usage.json');
}

function saveAppUsageRecord(sessionId, record) {
    const metadataPath = getAppUsageMetadataPath(sessionId);
    const existing = readJsonFile(metadataPath, { records: [] });
    existing.records.push(record);
    return writeJsonFile(metadataPath, existing);
}

function getAppUsageRecords(sessionId) {
    const metadataPath = getAppUsageMetadataPath(sessionId);
    const data = readJsonFile(metadataPath, { records: [] });
    return data.records;
}

// ============ SESSION CONTEXT ============

function getSessionContextPath(sessionId) {
    return path.join(getSessionsDir(), sessionId, 'session-context.json');
}

// ============ SESSION QUESTIONS (Confusion Detection) ============

function getQuestionsPath(sessionId) {
    return path.join(getSessionsDir(), sessionId, 'questions.json');
}

function saveSessionQuestions(sessionId, questions) {
    const questionsPath = getQuestionsPath(sessionId);
    const dir = path.dirname(questionsPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return writeJsonFile(questionsPath, { questions });
}

function getSessionQuestions(sessionId) {
    const questionsPath = getQuestionsPath(sessionId);
    const data = readJsonFile(questionsPath, { questions: [] });
    return data.questions;
}

function addSessionQuestion(sessionId, question) {
    const questions = getSessionQuestions(sessionId);
    questions.push(question);
    return saveSessionQuestions(sessionId, questions);
}

function updateSessionQuestion(sessionId, questionId, updates) {
    const questions = getSessionQuestions(sessionId);
    const index = questions.findIndex(q => q.id === questionId);
    if (index === -1) {
        return false;
    }
    questions[index] = { ...questions[index], ...updates };
    return saveSessionQuestions(sessionId, questions);
}

function saveSessionContext(sessionId, context) {
    const contextPath = getSessionContextPath(sessionId);
    return writeJsonFile(contextPath, context);
}

function getSessionContext(sessionId) {
    const contextPath = getSessionContextPath(sessionId);
    return readJsonFile(contextPath, null);
}

// ============ SESSION TASKS (Task Detection) ============

function getTasksPath(sessionId) {
    return path.join(getSessionsDir(), sessionId, 'tasks.json');
}

function saveSessionTasks(sessionId, tasks) {
    const tasksPath = getTasksPath(sessionId);
    const dir = path.dirname(tasksPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return writeJsonFile(tasksPath, { tasks });
}

function getSessionTasks(sessionId) {
    const tasksPath = getTasksPath(sessionId);
    const data = readJsonFile(tasksPath, { tasks: [] });
    return data.tasks;
}

function addSessionTask(sessionId, task) {
    const tasks = getSessionTasks(sessionId);
    tasks.push(task);
    return saveSessionTasks(sessionId, tasks);
}

function updateSessionTask(sessionId, taskId, updates) {
    const tasks = getSessionTasks(sessionId);
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) {
        return false;
    }
    tasks[index] = { ...tasks[index], ...updates };
    return saveSessionTasks(sessionId, tasks);
}

function deleteSessionTask(sessionId, taskId) {
    const tasks = getSessionTasks(sessionId);
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) {
        return false;
    }
    tasks.splice(index, 1);
    return saveSessionTasks(sessionId, tasks);
}

// ============ SESSION SUMMARIES (Historical) ============

function getSessionSummariesPath(profileId) {
    return path.join(getProfileDir(profileId), 'session-summaries.json');
}

function saveSessionSummary(profileId, summary) {
    const summariesPath = getSessionSummariesPath(profileId);
    const existing = readJsonFile(summariesPath, { summaries: [] });
    existing.summaries.push(summary);
    // Keep only last 30 summaries to manage storage
    if (existing.summaries.length > 30) {
        existing.summaries = existing.summaries.slice(-30);
    }
    return writeJsonFile(summariesPath, existing);
}

function getSessionSummaries(profileId, limit = 10) {
    const summariesPath = getSessionSummariesPath(profileId);
    const data = readJsonFile(summariesPath, { summaries: [] });
    // Return most recent summaries first
    return data.summaries.slice(-limit).reverse();
}

function getAllSessionSummariesForProfile(profileId) {
    const summariesPath = getSessionSummariesPath(profileId);
    const data = readJsonFile(summariesPath, { summaries: [] });
    return data.summaries;
}

// ============ APP STATE (Crash Recovery) ============

function getAppStatePath() {
    return path.join(getConfigDir(), 'app-state.json');
}

function getAppState() {
    return readJsonFile(getAppStatePath(), null);
}

function saveAppState(state) {
    return writeJsonFile(getAppStatePath(), state);
}

// ============ PROFILES ============

function getProfilesDir() {
    return path.join(getConfigDir(), 'profiles');
}

function getProfileDir(profileId) {
    return path.join(getProfilesDir(), profileId);
}

function ensureProfileDir(profileId) {
    const dir = getProfileDir(profileId);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}

function getProfilePath(profileId) {
    return path.join(getProfileDir(profileId), 'profile.json');
}

function saveProfile(profileId, profile) {
    ensureProfileDir(profileId);
    const profilePath = getProfilePath(profileId);
    return writeJsonFile(profilePath, { ...profile, updatedAt: new Date().toISOString() });
}

function getProfile(profileId) {
    const profilePath = getProfilePath(profileId);
    return readJsonFile(profilePath, null);
}

function getAllProfilesWithSessions() {
    const profilesDir = getProfilesDir();
    try {
        if (!fs.existsSync(profilesDir)) {
            return [];
        }

        const dirs = fs.readdirSync(profilesDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        return dirs.map(profileId => {
            const profile = getProfile(profileId);
            if (profile) {
                return profile;
            }
            // Fallback to interview data for backwards compatibility
            const session = getInterviewSession(profileId);
            const summary = getInterviewSummary(profileId);
            return {
                id: profileId,
                profileId,
                name: summary?.role || 'Unknown',
                hasInterview: session !== null,
                interviewCompleted: session?.completed || false,
                hasSummary: summary !== null,
                role: summary?.role || null,
                createdAt: session?.startTime || null,
                totalObservationTime: 0,
                sessionCount: 0,
                lastSessionId: null
            };
        }).filter(Boolean);
    } catch (error) {
        console.error('Error reading profiles:', error.message);
        return [];
    }
}

// ============ OBSERVATION SESSIONS ============

function getObservationSessionsDir(profileId) {
    return path.join(getProfileDir(profileId), 'observation-sessions');
}

function getObservationSessionPath(profileId, sessionId) {
    return path.join(getObservationSessionsDir(profileId), sessionId, 'session.json');
}

function ensureObservationSessionDir(profileId, sessionId) {
    const dir = path.join(getObservationSessionsDir(profileId), sessionId);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}

function saveObservationSession(profileId, sessionId, session) {
    ensureObservationSessionDir(profileId, sessionId);
    const sessionPath = getObservationSessionPath(profileId, sessionId);
    return writeJsonFile(sessionPath, session);
}

function getObservationSession(profileId, sessionId) {
    const sessionPath = getObservationSessionPath(profileId, sessionId);
    return readJsonFile(sessionPath, null);
}

function getProfileSessions(profileId) {
    const sessionsDir = getObservationSessionsDir(profileId);
    try {
        if (!fs.existsSync(sessionsDir)) {
            return [];
        }

        const dirs = fs.readdirSync(sessionsDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        return dirs.map(sessionId => {
            return getObservationSession(profileId, sessionId);
        }).filter(Boolean);
    } catch (error) {
        console.error('Error reading profile sessions:', error.message);
        return [];
    }
}

// ============ INTERVIEW ============

function getInterviewPath(profileId) {
    return path.join(getProfileDir(profileId), 'interview.json');
}

function getInterviewSummaryPath(profileId) {
    return path.join(getProfileDir(profileId), 'interview-summary.json');
}

function saveInterviewSession(profileId, session) {
    ensureProfileDir(profileId);
    const interviewPath = getInterviewPath(profileId);
    return writeJsonFile(interviewPath, session);
}

function getInterviewSession(profileId) {
    const interviewPath = getInterviewPath(profileId);
    return readJsonFile(interviewPath, null);
}

function saveInterviewSummary(profileId, summary) {
    ensureProfileDir(profileId);
    const summaryPath = getInterviewSummaryPath(profileId);
    return writeJsonFile(summaryPath, summary);
}

function getInterviewSummary(profileId) {
    const summaryPath = getInterviewSummaryPath(profileId);
    return readJsonFile(summaryPath, null);
}

function hasCompletedInterview(profileId) {
    const session = getInterviewSession(profileId);
    return session && session.completed === true;
}

function getAllProfiles() {
    const profilesDir = getProfilesDir();
    try {
        if (!fs.existsSync(profilesDir)) {
            return [];
        }

        const dirs = fs.readdirSync(profilesDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        return dirs.map(profileId => {
            const session = getInterviewSession(profileId);
            const summary = getInterviewSummary(profileId);
            return {
                profileId,
                hasInterview: session !== null,
                interviewCompleted: session?.completed || false,
                hasSummary: summary !== null,
                role: summary?.role || null,
                createdAt: session?.startTime || null
            };
        });
    } catch (error) {
        console.error('Error reading profiles:', error.message);
        return [];
    }
}

function deleteProfile(profileId) {
    const profileDir = getProfileDir(profileId);
    try {
        if (fs.existsSync(profileDir)) {
            fs.rmSync(profileDir, { recursive: true, force: true });
            return true;
        }
    } catch (error) {
        console.error('Error deleting profile:', error.message);
    }
    return false;
}

// ============ HISTORY ============

function getSessionPath(sessionId) {
    return path.join(getHistoryDir(), `${sessionId}.json`);
}

function saveSession(sessionId, data) {
    const sessionPath = getSessionPath(sessionId);

    // Load existing session to preserve metadata
    const existingSession = readJsonFile(sessionPath, null);

    const sessionData = {
        sessionId,
        createdAt: existingSession?.createdAt || parseInt(sessionId),
        lastUpdated: Date.now(),
        // Profile context - set once when session starts
        profile: data.profile || existingSession?.profile || null,
        customPrompt: data.customPrompt || existingSession?.customPrompt || null,
        // Conversation data
        conversationHistory: data.conversationHistory || existingSession?.conversationHistory || [],
        screenAnalysisHistory: data.screenAnalysisHistory || existingSession?.screenAnalysisHistory || []
    };
    return writeJsonFile(sessionPath, sessionData);
}

function getSession(sessionId) {
    return readJsonFile(getSessionPath(sessionId), null);
}

function getAllSessions() {
    const historyDir = getHistoryDir();

    try {
        if (!fs.existsSync(historyDir)) {
            return [];
        }

        const files = fs.readdirSync(historyDir)
            .filter(f => f.endsWith('.json'))
            .sort((a, b) => {
                // Sort by timestamp descending (newest first)
                const tsA = parseInt(a.replace('.json', ''));
                const tsB = parseInt(b.replace('.json', ''));
                return tsB - tsA;
            });

        return files.map(file => {
            const sessionId = file.replace('.json', '');
            const data = readJsonFile(path.join(historyDir, file), null);
            if (data) {
                return {
                    sessionId,
                    createdAt: data.createdAt,
                    lastUpdated: data.lastUpdated,
                    messageCount: data.conversationHistory?.length || 0,
                    screenAnalysisCount: data.screenAnalysisHistory?.length || 0,
                    profile: data.profile || null,
                    customPrompt: data.customPrompt || null
                };
            }
            return null;
        }).filter(Boolean);
    } catch (error) {
        console.error('Error reading sessions:', error.message);
        return [];
    }
}

function deleteSession(sessionId) {
    const sessionPath = getSessionPath(sessionId);
    try {
        if (fs.existsSync(sessionPath)) {
            fs.unlinkSync(sessionPath);
            return true;
        }
    } catch (error) {
        console.error('Error deleting session:', error.message);
    }
    return false;
}

function deleteAllSessions() {
    const historyDir = getHistoryDir();
    try {
        if (fs.existsSync(historyDir)) {
            const files = fs.readdirSync(historyDir).filter(f => f.endsWith('.json'));
            files.forEach(file => {
                fs.unlinkSync(path.join(historyDir, file));
            });
        }
        return true;
    } catch (error) {
        console.error('Error deleting all sessions:', error.message);
        return false;
    }
}

// ============ CLEAR ALL DATA ============

function clearAllData() {
    resetConfigDir();
    return true;
}

module.exports = {
    // Initialization
    initializeStorage,
    getConfigDir,

    // Config
    getConfig,
    setConfig,
    updateConfig,

    // Credentials
    getCredentials,
    setCredentials,
    getApiKey,
    setApiKey,

    // Preferences
    getPreferences,
    setPreferences,
    updatePreference,

    // Keybinds
    getKeybinds,
    setKeybinds,

    // Capture Config
    getCaptureConfig,
    setCaptureConfig,
    updateCaptureConfig,

    // Session Screenshots
    getSessionsDir,
    getSessionScreenshotsDir,
    ensureSessionScreenshotsDir,
    saveScreenshotMetadata,
    getSessionScreenshots,
    saveAppUsageRecord,
    getAppUsageRecords,

    // Session Context
    saveSessionContext,
    getSessionContext,

    // Session Questions (Confusion Detection)
    saveSessionQuestions,
    getSessionQuestions,
    addSessionQuestion,
    updateSessionQuestion,

    // Session Tasks (Task Detection)
    saveSessionTasks,
    getSessionTasks,
    addSessionTask,
    updateSessionTask,
    deleteSessionTask,

    // Session Summaries (Historical)
    saveSessionSummary,
    getSessionSummaries,
    getAllSessionSummariesForProfile,

    // App State (Session Management)
    getAppState,
    saveAppState,

    // Profiles
    getProfilesDir,
    getProfileDir,
    ensureProfileDir,
    getProfile,
    saveProfile,
    getAllProfiles,
    getAllProfilesWithSessions,
    deleteProfile,

    // Observation Sessions
    getObservationSessionsDir,
    ensureObservationSessionDir,
    saveObservationSession,
    getObservationSession,
    getProfileSessions,

    // Interview
    saveInterviewSession,
    getInterviewSession,
    saveInterviewSummary,
    getInterviewSummary,
    hasCompletedInterview,

    // History
    saveSession,
    getSession,
    getAllSessions,
    deleteSession,
    deleteAllSessions,

    // Clear all
    clearAllData
};
