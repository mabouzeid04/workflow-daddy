const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('node:path');

let tray = null;
let mainWindowRef = null;
let currentState = {
    sessionActive: false,
    isPaused: false,
    profileId: null,
};

/**
 * Create the system tray icon and context menu.
 * @param {BrowserWindow} mainWindow
 * @returns {Tray}
 */
function createTray(mainWindow) {
    mainWindowRef = mainWindow;

    // Load and resize the logo for tray use
    const iconPath = path.join(__dirname, '..', 'assets', 'logo.png');
    let icon = nativeImage.createFromPath(iconPath);

    // Resize for tray (16x16 on macOS, 16x16 on Windows/Linux)
    icon = icon.resize({ width: 16, height: 16 });

    // On macOS, mark as template image for native dark/light mode support
    if (process.platform === 'darwin') {
        icon.setTemplateImage(true);
    }

    tray = new Tray(icon);
    tray.setToolTip('Workflow Daddy');

    // Click to toggle window visibility
    tray.on('click', () => {
        if (!mainWindowRef || mainWindowRef.isDestroyed()) return;
        if (mainWindowRef.isVisible()) {
            mainWindowRef.hide();
        } else {
            mainWindowRef.show();
        }
    });

    // Build initial menu
    updateTrayMenu(currentState);

    return tray;
}

/**
 * Update the tray context menu based on current session state.
 * @param {{ sessionActive: boolean, isPaused: boolean, profileId: string|null }} state
 */
function updateTrayMenu(state) {
    if (!tray) return;

    currentState = { ...currentState, ...state };

    const statusLabel = currentState.sessionActive
        ? (currentState.isPaused ? 'Paused' : 'Recording')
        : 'Idle';

    const statusIcon = currentState.sessionActive
        ? (currentState.isPaused ? '⏸' : '●')
        : '○';

    const menu = Menu.buildFromTemplate([
        {
            label: `${statusIcon}  ${statusLabel}`,
            enabled: false,
        },
        { type: 'separator' },
        {
            label: 'Show Window',
            click: () => {
                if (mainWindowRef && !mainWindowRef.isDestroyed()) {
                    mainWindowRef.show();
                    mainWindowRef.focus();
                }
            },
        },
        {
            label: currentState.sessionActive && !currentState.isPaused
                ? 'Pause Recording'
                : 'Resume Recording',
            enabled: currentState.sessionActive,
            click: () => {
                if (!mainWindowRef || mainWindowRef.isDestroyed()) return;
                if (currentState.isPaused) {
                    mainWindowRef.webContents.send('tray:resume-recording');
                } else {
                    mainWindowRef.webContents.send('tray:pause-recording');
                }
            },
        },
        { type: 'separator' },
        {
            label: 'Settings...',
            click: () => {
                if (mainWindowRef && !mainWindowRef.isDestroyed()) {
                    mainWindowRef.show();
                    mainWindowRef.focus();
                    mainWindowRef.webContents.send('navigate-to-settings');
                }
            },
        },
        {
            label: 'Export Docs...',
            enabled: currentState.sessionActive || currentState.profileId != null,
            click: () => {
                if (mainWindowRef && !mainWindowRef.isDestroyed()) {
                    mainWindowRef.webContents.send('tray:export-docs');
                }
            },
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                app.quit();
            },
        },
    ]);

    tray.setContextMenu(menu);

    // Update tooltip
    tray.setToolTip(`Workflow Daddy - ${statusLabel}`);
}

/**
 * Destroy the tray icon.
 */
function destroyTray() {
    if (tray) {
        tray.destroy();
        tray = null;
    }
}

module.exports = {
    createTray,
    updateTrayMenu,
    destroyTray,
};
