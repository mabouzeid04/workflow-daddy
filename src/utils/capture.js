// capture.js - Screen Capture & Application Tracking Service
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const os = require('os');
const EventEmitter = require('events');

const execAsync = promisify(exec);

// Platform detection
const isMacOS = process.platform === 'darwin';
const isWindows = process.platform === 'win32';
const isLinux = process.platform === 'linux';

// Event emitter for capture events
const captureEvents = new EventEmitter();

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
 * @typedef {Object} AppUsageRecord
 * @property {string} app - Application name
 * @property {string} windowTitle - Window title
 * @property {Date} startTime - When the app became active
 * @property {Date|null} endTime - When the app became inactive (null if still active)
 * @property {number} duration - Duration in seconds
 */

/**
 * @typedef {Object} CaptureConfig
 * @property {number} screenshotInterval - Milliseconds between screenshots (default 10000)
 * @property {number} imageQuality - JPEG quality 0-1 (default 0.7)
 * @property {boolean} captureAllMonitors - Whether to capture all monitors (default false)
 * @property {boolean} trackUrls - Whether to track browser URLs (default true)
 * @property {'full'|'domain-only'} urlPrivacyMode - URL privacy level (default 'full')
 */

// Default capture configuration
const DEFAULT_CAPTURE_CONFIG = {
    screenshotInterval: 10000, // 10 seconds
    imageQuality: 0.7,
    captureAllMonitors: false,
    trackUrls: true,
    urlPrivacyMode: 'full'
};

// ============ STATE ============

let captureIntervalId = null;
let currentSession = null;
let currentAppRecord = null;
let captureConfig = { ...DEFAULT_CAPTURE_CONFIG };

// ============ ACTIVE WINDOW DETECTION ============

/**
 * Get the currently active window information
 * @returns {Promise<{app: string, title: string, url?: string}>}
 */
async function getActiveWindow() {
    if (isMacOS) {
        return getActiveWindowMacOS();
    } else if (isWindows) {
        return getActiveWindowWindows();
    } else if (isLinux) {
        return getActiveWindowLinux();
    }
    return { app: 'Unknown', title: 'Unknown' };
}

/**
 * Get active window on macOS using AppleScript
 */
async function getActiveWindowMacOS() {
    try {
        // Get the frontmost application name
        const appScript = `
            tell application "System Events"
                set frontApp to name of first application process whose frontmost is true
            end tell
            return frontApp
        `;
        const { stdout: appName } = await execAsync(`osascript -e '${appScript}'`);
        const app = appName.trim();

        // Get the window title
        const titleScript = `
            tell application "System Events"
                tell (first application process whose frontmost is true)
                    if (count of windows) > 0 then
                        return name of front window
                    else
                        return ""
                    end if
                end tell
            end tell
        `;
        const { stdout: windowTitle } = await execAsync(`osascript -e '${titleScript}'`);
        const title = windowTitle.trim();

        // Try to get URL if it's a browser
        let url = undefined;
        if (captureConfig.trackUrls && isBrowser(app)) {
            url = await getBrowserURLMacOS(app);
        }

        return { app, title, url };
    } catch (error) {
        console.error('Error getting active window (macOS):', error.message);
        return { app: 'Unknown', title: 'Unknown' };
    }
}

/**
 * Check if the application is a known browser
 */
function isBrowser(appName) {
    const browsers = [
        'Safari', 'Google Chrome', 'Firefox', 'Microsoft Edge',
        'Brave Browser', 'Arc', 'Opera', 'Vivaldi', 'Chromium'
    ];
    return browsers.some(browser =>
        appName.toLowerCase().includes(browser.toLowerCase())
    );
}

/**
 * Get browser URL on macOS
 */
async function getBrowserURLMacOS(appName) {
    try {
        let script = '';

        if (appName.includes('Safari')) {
            script = `
                tell application "Safari"
                    if (count of windows) > 0 then
                        return URL of front document
                    end if
                end tell
            `;
        } else if (appName.includes('Chrome') || appName.includes('Chromium')) {
            script = `
                tell application "Google Chrome"
                    if (count of windows) > 0 then
                        return URL of active tab of front window
                    end if
                end tell
            `;
        } else if (appName.includes('Firefox')) {
            // Firefox doesn't support AppleScript URL access well
            return undefined;
        } else if (appName.includes('Arc')) {
            script = `
                tell application "Arc"
                    if (count of windows) > 0 then
                        return URL of active tab of front window
                    end if
                end tell
            `;
        } else if (appName.includes('Edge')) {
            script = `
                tell application "Microsoft Edge"
                    if (count of windows) > 0 then
                        return URL of active tab of front window
                    end if
                end tell
            `;
        } else if (appName.includes('Brave')) {
            script = `
                tell application "Brave Browser"
                    if (count of windows) > 0 then
                        return URL of active tab of front window
                    end if
                end tell
            `;
        }

        if (!script) return undefined;

        const { stdout } = await execAsync(`osascript -e '${script}'`);
        let url = stdout.trim();

        // Apply privacy mode
        if (url && captureConfig.urlPrivacyMode === 'domain-only') {
            try {
                const urlObj = new URL(url);
                url = urlObj.origin;
            } catch {
                // Keep full URL if parsing fails
            }
        }

        return url || undefined;
    } catch (error) {
        // Browser might not be responding or doesn't support the script
        return undefined;
    }
}

/**
 * Get active window on Windows using PowerShell
 */
async function getActiveWindowWindows() {
    try {
        const script = `
            Add-Type @"
                using System;
                using System.Runtime.InteropServices;
                using System.Text;
                public class Win32 {
                    [DllImport("user32.dll")]
                    public static extern IntPtr GetForegroundWindow();
                    [DllImport("user32.dll")]
                    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
                    [DllImport("user32.dll")]
                    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
                }
"@
            $hwnd = [Win32]::GetForegroundWindow()
            $title = New-Object System.Text.StringBuilder 256
            [Win32]::GetWindowText($hwnd, $title, 256) | Out-Null
            $processId = 0
            [Win32]::GetWindowThreadProcessId($hwnd, [ref]$processId) | Out-Null
            $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
            $appName = if ($process) { $process.ProcessName } else { "Unknown" }
            Write-Output "$appName|$($title.ToString())"
        `;

        const { stdout } = await execAsync(`powershell -Command "${script.replace(/"/g, '\\"')}"`);
        const [app, title] = stdout.trim().split('|');

        return { app: app || 'Unknown', title: title || 'Unknown' };
    } catch (error) {
        console.error('Error getting active window (Windows):', error.message);
        return { app: 'Unknown', title: 'Unknown' };
    }
}

/**
 * Get active window on Linux using xdotool
 */
async function getActiveWindowLinux() {
    try {
        // Get active window ID
        const { stdout: windowId } = await execAsync('xdotool getactivewindow');
        const wid = windowId.trim();

        // Get window title
        const { stdout: title } = await execAsync(`xdotool getwindowname ${wid}`);

        // Get window PID and then process name
        const { stdout: pid } = await execAsync(`xdotool getwindowpid ${wid}`);
        const { stdout: appName } = await execAsync(`ps -p ${pid.trim()} -o comm=`);

        return {
            app: appName.trim() || 'Unknown',
            title: title.trim() || 'Unknown'
        };
    } catch (error) {
        console.error('Error getting active window (Linux):', error.message);
        return { app: 'Unknown', title: 'Unknown' };
    }
}

// ============ APP TRACKING ============

/**
 * Track application switch
 * @param {AppUsageRecord|null} previous - Previous app record
 * @param {{app: string, title: string, url?: string}} current - Current active window
 * @returns {AppUsageRecord|null} - New app record if switched, null otherwise
 */
function trackAppSwitch(previous, current) {
    const now = new Date();

    // Check if app changed
    if (previous && previous.app === current.app) {
        // Same app, just update window title if different
        if (previous.windowTitle !== current.title) {
            previous.windowTitle = current.title;
        }
        return null;
    }

    // App changed - close out previous record
    if (previous) {
        previous.endTime = now;
        previous.duration = Math.floor((now - previous.startTime) / 1000);
        captureEvents.emit('app:switched', { previous, current });
    }

    // Create new record for current app
    const newRecord = {
        app: current.app,
        windowTitle: current.title,
        startTime: now,
        endTime: null,
        duration: 0
    };

    return newRecord;
}

// ============ CAPTURE SERVICE ============

/**
 * Generate unique screenshot ID
 */
function generateScreenshotId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get screenshots directory for a session
 * @param {string} sessionId
 * @returns {string}
 */
function getScreenshotsDir(sessionId) {
    const configDir = getConfigDir();
    return path.join(configDir, 'sessions', sessionId, 'screenshots');
}

/**
 * Get config directory (matches storage.js)
 */
function getConfigDir() {
    const platform = os.platform();
    let configDir;

    if (platform === 'win32') {
        configDir = path.join(os.homedir(), 'AppData', 'Roaming', 'cheating-daddy-config');
    } else if (platform === 'darwin') {
        configDir = path.join(os.homedir(), 'Library', 'Application Support', 'cheating-daddy-config');
    } else {
        configDir = path.join(os.homedir(), '.config', 'cheating-daddy-config');
    }

    return configDir;
}

/**
 * Ensure screenshots directory exists
 */
function ensureScreenshotsDir(sessionId) {
    const dir = getScreenshotsDir(sessionId);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}

/**
 * Capture screenshot with metadata
 * This creates the metadata object - actual image capture happens in renderer
 * @param {string} sessionId
 * @returns {Promise<Screenshot>}
 */
async function captureScreenshotMetadata(sessionId) {
    const id = generateScreenshotId();
    const timestamp = new Date();
    const windowInfo = await getActiveWindow();

    const screenshotsDir = ensureScreenshotsDir(sessionId);
    const filename = `${timestamp.getTime()}-${id}.jpg`;
    const imagePath = path.join(screenshotsDir, filename);

    const screenshot = {
        id,
        sessionId,
        timestamp,
        imagePath,
        activeApplication: windowInfo.app,
        windowTitle: windowInfo.title,
        url: windowInfo.url
    };

    return screenshot;
}

/**
 * Save screenshot image data to file
 * @param {string} imagePath
 * @param {Buffer} imageBuffer
 */
function saveScreenshotImage(imagePath, imageBuffer) {
    const dir = path.dirname(imagePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(imagePath, imageBuffer);
}

/**
 * Start the capture service
 * @param {string} sessionId
 * @param {Partial<CaptureConfig>} config
 * @returns {Function} - Cleanup function to stop capture
 */
function startCapture(sessionId, config = {}) {
    if (captureIntervalId) {
        console.warn('Capture already running, stopping previous capture');
        stopCapture();
    }

    currentSession = sessionId;
    captureConfig = { ...DEFAULT_CAPTURE_CONFIG, ...config };

    console.log(`Starting capture for session ${sessionId} with interval ${captureConfig.screenshotInterval}ms`);

    captureEvents.emit('capture:started', { sessionId, config: captureConfig });

    // Initialize app tracking
    getActiveWindow().then(windowInfo => {
        currentAppRecord = {
            app: windowInfo.app,
            windowTitle: windowInfo.title,
            startTime: new Date(),
            endTime: null,
            duration: 0
        };
    });

    // Start capture loop
    captureIntervalId = setInterval(async () => {
        try {
            // Get active window info
            const windowInfo = await getActiveWindow();

            // Track app switches
            const newRecord = trackAppSwitch(currentAppRecord, windowInfo);
            if (newRecord) {
                currentAppRecord = newRecord;
            }

            // Emit screenshot event (actual capture happens in renderer)
            const metadata = await captureScreenshotMetadata(currentSession);
            captureEvents.emit('screenshot:captured', metadata);

        } catch (error) {
            console.error('Error during capture interval:', error);
        }
    }, captureConfig.screenshotInterval);

    // Return cleanup function
    return () => stopCapture();
}

/**
 * Stop the capture service
 */
function stopCapture() {
    if (captureIntervalId) {
        clearInterval(captureIntervalId);
        captureIntervalId = null;
    }

    // Close out current app record
    if (currentAppRecord) {
        currentAppRecord.endTime = new Date();
        currentAppRecord.duration = Math.floor(
            (currentAppRecord.endTime - currentAppRecord.startTime) / 1000
        );
    }

    const sessionId = currentSession;
    currentSession = null;
    currentAppRecord = null;

    captureEvents.emit('capture:stopped', { sessionId });
    console.log('Capture stopped');
}

/**
 * Get current capture state
 */
function getCaptureState() {
    return {
        isCapturing: captureIntervalId !== null,
        sessionId: currentSession,
        currentApp: currentAppRecord,
        config: captureConfig
    };
}

/**
 * Update capture configuration
 * @param {Partial<CaptureConfig>} newConfig
 */
function updateCaptureConfig(newConfig) {
    captureConfig = { ...captureConfig, ...newConfig };

    // If capture is running, restart with new config
    if (captureIntervalId && currentSession) {
        const sessionId = currentSession;
        stopCapture();
        startCapture(sessionId, captureConfig);
    }
}

// ============ EXPORTS ============

module.exports = {
    // Core functions
    startCapture,
    stopCapture,
    getCaptureState,
    updateCaptureConfig,

    // Active window detection
    getActiveWindow,

    // Screenshot helpers
    captureScreenshotMetadata,
    saveScreenshotImage,
    getScreenshotsDir,
    ensureScreenshotsDir,

    // App tracking
    trackAppSwitch,

    // Events
    captureEvents,

    // Config
    DEFAULT_CAPTURE_CONFIG,

    // Platform info
    isMacOS,
    isWindows,
    isLinux
};
