if (require('electron-squirrel-startup')) {
    process.exit(0);
}

const { app, BrowserWindow, shell, ipcMain } = require('electron');
const { createWindow, updateGlobalShortcuts } = require('./utils/window');
const { setupGeminiIpcHandlers, sendToRenderer } = require('./utils/gemini');
const storage = require('./storage');
const capture = require('./utils/capture');

const geminiSessionRef = { current: null };
let mainWindow = null;

function createMainWindow() {
    mainWindow = createWindow(sendToRenderer, geminiSessionRef);
    return mainWindow;
}

app.whenReady().then(async () => {
    // Initialize storage (checks version, resets if needed)
    storage.initializeStorage();

    createMainWindow();
    setupGeminiIpcHandlers(geminiSessionRef);
    setupStorageIpcHandlers();
    setupCaptureIpcHandlers();
    setupGeneralIpcHandlers();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    // Stop capture service if running
    capture.stopCapture();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});

function setupStorageIpcHandlers() {
    // ============ CONFIG ============
    ipcMain.handle('storage:get-config', async () => {
        try {
            return { success: true, data: storage.getConfig() };
        } catch (error) {
            console.error('Error getting config:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-config', async (event, config) => {
        try {
            storage.setConfig(config);
            return { success: true };
        } catch (error) {
            console.error('Error setting config:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:update-config', async (event, key, value) => {
        try {
            storage.updateConfig(key, value);
            return { success: true };
        } catch (error) {
            console.error('Error updating config:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ CREDENTIALS ============
    ipcMain.handle('storage:get-credentials', async () => {
        try {
            return { success: true, data: storage.getCredentials() };
        } catch (error) {
            console.error('Error getting credentials:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-credentials', async (event, credentials) => {
        try {
            storage.setCredentials(credentials);
            return { success: true };
        } catch (error) {
            console.error('Error setting credentials:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:get-api-key', async () => {
        try {
            return { success: true, data: storage.getApiKey() };
        } catch (error) {
            console.error('Error getting API key:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-api-key', async (event, apiKey) => {
        try {
            storage.setApiKey(apiKey);
            return { success: true };
        } catch (error) {
            console.error('Error setting API key:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ PREFERENCES ============
    ipcMain.handle('storage:get-preferences', async () => {
        try {
            return { success: true, data: storage.getPreferences() };
        } catch (error) {
            console.error('Error getting preferences:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-preferences', async (event, preferences) => {
        try {
            storage.setPreferences(preferences);
            return { success: true };
        } catch (error) {
            console.error('Error setting preferences:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:update-preference', async (event, key, value) => {
        try {
            storage.updatePreference(key, value);
            return { success: true };
        } catch (error) {
            console.error('Error updating preference:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ KEYBINDS ============
    ipcMain.handle('storage:get-keybinds', async () => {
        try {
            return { success: true, data: storage.getKeybinds() };
        } catch (error) {
            console.error('Error getting keybinds:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-keybinds', async (event, keybinds) => {
        try {
            storage.setKeybinds(keybinds);
            return { success: true };
        } catch (error) {
            console.error('Error setting keybinds:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ HISTORY ============
    ipcMain.handle('storage:get-all-sessions', async () => {
        try {
            return { success: true, data: storage.getAllSessions() };
        } catch (error) {
            console.error('Error getting sessions:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:get-session', async (event, sessionId) => {
        try {
            return { success: true, data: storage.getSession(sessionId) };
        } catch (error) {
            console.error('Error getting session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:save-session', async (event, sessionId, data) => {
        try {
            storage.saveSession(sessionId, data);
            return { success: true };
        } catch (error) {
            console.error('Error saving session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:delete-session', async (event, sessionId) => {
        try {
            storage.deleteSession(sessionId);
            return { success: true };
        } catch (error) {
            console.error('Error deleting session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:delete-all-sessions', async () => {
        try {
            storage.deleteAllSessions();
            return { success: true };
        } catch (error) {
            console.error('Error deleting all sessions:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ CLEAR ALL ============
    ipcMain.handle('storage:clear-all', async () => {
        try {
            storage.clearAllData();
            return { success: true };
        } catch (error) {
            console.error('Error clearing all data:', error);
            return { success: false, error: error.message };
        }
    });
}

function setupCaptureIpcHandlers() {
    // ============ CAPTURE CONFIG ============
    ipcMain.handle('capture:get-config', async () => {
        try {
            return { success: true, data: storage.getCaptureConfig() };
        } catch (error) {
            console.error('Error getting capture config:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('capture:set-config', async (event, config) => {
        try {
            storage.setCaptureConfig(config);
            capture.updateCaptureConfig(config);
            return { success: true };
        } catch (error) {
            console.error('Error setting capture config:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('capture:update-config', async (event, key, value) => {
        try {
            storage.updateCaptureConfig(key, value);
            capture.updateCaptureConfig({ [key]: value });
            return { success: true };
        } catch (error) {
            console.error('Error updating capture config:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ CAPTURE SERVICE ============
    ipcMain.handle('capture:start', async (event, sessionId, config) => {
        try {
            const captureConfig = config || storage.getCaptureConfig();
            capture.startCapture(sessionId, captureConfig);
            return { success: true };
        } catch (error) {
            console.error('Error starting capture:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('capture:stop', async () => {
        try {
            capture.stopCapture();
            return { success: true };
        } catch (error) {
            console.error('Error stopping capture:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('capture:get-state', async () => {
        try {
            return { success: true, data: capture.getCaptureState() };
        } catch (error) {
            console.error('Error getting capture state:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ ACTIVE WINDOW ============
    ipcMain.handle('capture:get-active-window', async () => {
        try {
            const windowInfo = await capture.getActiveWindow();
            return { success: true, data: windowInfo };
        } catch (error) {
            console.error('Error getting active window:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ SCREENSHOT METADATA ============
    ipcMain.handle('capture:save-screenshot-metadata', async (event, sessionId, metadata) => {
        try {
            storage.saveScreenshotMetadata(sessionId, metadata);
            return { success: true };
        } catch (error) {
            console.error('Error saving screenshot metadata:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('capture:get-session-screenshots', async (event, sessionId) => {
        try {
            return { success: true, data: storage.getSessionScreenshots(sessionId) };
        } catch (error) {
            console.error('Error getting session screenshots:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ APP USAGE ============
    ipcMain.handle('capture:save-app-usage', async (event, sessionId, record) => {
        try {
            storage.saveAppUsageRecord(sessionId, record);
            return { success: true };
        } catch (error) {
            console.error('Error saving app usage:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('capture:get-app-usage', async (event, sessionId) => {
        try {
            return { success: true, data: storage.getAppUsageRecords(sessionId) };
        } catch (error) {
            console.error('Error getting app usage:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ CAPTURE EVENTS ============
    // Forward capture events to renderer
    capture.captureEvents.on('screenshot:captured', (metadata) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('capture:screenshot-captured', metadata);
        }
    });

    capture.captureEvents.on('app:switched', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('capture:app-switched', data);
            // Also save the completed app usage record
            if (data.previous && data.previous.endTime) {
                const state = capture.getCaptureState();
                if (state.sessionId) {
                    storage.saveAppUsageRecord(state.sessionId, data.previous);
                }
            }
        }
    });

    capture.captureEvents.on('capture:started', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('capture:started', data);
        }
    });

    capture.captureEvents.on('capture:stopped', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('capture:stopped', data);
        }
    });
}

function setupGeneralIpcHandlers() {
    ipcMain.handle('get-app-version', async () => {
        return app.getVersion();
    });

    ipcMain.handle('quit-application', async event => {
        try {
            app.quit();
            return { success: true };
        } catch (error) {
            console.error('Error quitting application:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('open-external', async (event, url) => {
        try {
            await shell.openExternal(url);
            return { success: true };
        } catch (error) {
            console.error('Error opening external URL:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.on('update-keybinds', (event, newKeybinds) => {
        if (mainWindow) {
            // Also save to storage
            storage.setKeybinds(newKeybinds);
            updateGlobalShortcuts(newKeybinds, mainWindow, sendToRenderer, geminiSessionRef);
        }
    });

    // Debug logging from renderer
    ipcMain.on('log-message', (event, msg) => {
        console.log(msg);
    });
}
