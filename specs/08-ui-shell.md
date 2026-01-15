# Feature Spec: UI Shell (Electron App)

## Overview
The Electron application shell that hosts all features, manages windows, and provides the user interface.

## Responsibilities
- Application window management
- Mode switching (interview ↔ observation)
- Keyboard shortcuts
- System tray integration
- Settings management
- IPC between main and renderer

## Window Modes

### 1. Interview Mode
- **Size**: 600x500, centered
- **Behavior**: Standard window, closable
- **Content**: Chat interface for interview
- **Resizable**: Yes

### 2. Observation Mode (Expanded)
- **Size**: 400x150, top-right corner
- **Behavior**: Always on top, minimal
- **Content**: Status indicator, time elapsed
- **Resizable**: No

### 3. Observation Mode (Question)
- **Size**: 500x250, top-right corner
- **Behavior**: Always on top, draws attention
- **Content**: Question + input field
- **Resizable**: No

### 4. Hidden Mode
- **Size**: N/A (window hidden)
- **Behavior**: Running in background
- **Access**: System tray or keyboard shortcut

## Window Specifications

```typescript
interface WindowConfig {
  interview: {
    width: 600,
    height: 500,
    center: true,
    resizable: true,
    alwaysOnTop: false,
    frame: true
  },
  observation: {
    width: 400,
    height: 150,
    x: 'screen.width - 420',
    y: 20,
    resizable: false,
    alwaysOnTop: true,
    frame: false,
    transparent: true
  },
  question: {
    width: 500,
    height: 250,
    x: 'screen.width - 520',
    y: 20,
    resizable: false,
    alwaysOnTop: true,
    frame: false
  }
}
```

## UI Components

### Interview View
```
┌────────────────────────────────────────┐
│  Workflow Shadow              [─][□][×]│
├────────────────────────────────────────┤
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ AI: Hi! I'm here to help you     │  │
│  │ document your job...             │  │
│  └──────────────────────────────────┘  │
│                                        │
│            ┌────────────────────────┐  │
│            │ User: I work in        │  │
│            │ procurement...         │  │
│            └────────────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ AI: Interesting! What systems    │  │
│  │ do you use for that?             │  │
│  └──────────────────────────────────┘  │
│                                        │
├────────────────────────────────────────┤
│  [Type your response...]         [Send]│
└────────────────────────────────────────┘
```

### Observation Status Bar
```
┌─────────────────────────────────────┐
│  ● Recording    02:34:15    ⚙  ─    │
│  Task: Processing invoices          │
│  [Hide]                             │
└─────────────────────────────────────┘
```

### Question Overlay
```
┌─────────────────────────────────────────┐
│  Quick Question                      ×  │
├─────────────────────────────────────────┤
│                                         │
│  I noticed you switched from Excel to   │
│  a web app I don't recognize.           │
│                                         │
│  What are you doing in this system?     │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [Answer]  [Skip]  [Ask Later]          │
└─────────────────────────────────────────┘
```

## Keyboard Shortcuts

| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| Toggle visibility | `Cmd+\` | `Ctrl+\` |
| Move window | `Opt+Arrow` | `Alt+Arrow` |
| Submit response | `Cmd+Enter` | `Ctrl+Enter` |
| Dismiss question | `Escape` | `Escape` |
| Open settings | `Cmd+,` | `Ctrl+,` |
| Quit app | `Cmd+Q` | `Alt+F4` |

### Global Shortcuts
Register these even when app is hidden:
- Toggle visibility (`Cmd/Ctrl+\`)

## System Tray

### Tray Icon
- Shows recording state (green dot when active)
- Click to show/hide window

### Tray Menu
```
┌────────────────────┐
│ ● Recording        │
│ ──────────────────│
│ Show Window        │
│ Pause Recording    │
│ ──────────────────│
│ Settings...        │
│ Export Docs...     │
│ ──────────────────│
│ Quit               │
└────────────────────┘
```

## Settings Panel

```
┌────────────────────────────────────────┐
│  Settings                        [×]   │
├────────────────────────────────────────┤
│                                        │
│  CAPTURE                               │
│  ┌──────────────────────────────────┐  │
│  │ Screenshot interval:  [10s ▼]    │  │
│  │ ○ 5s  ● 10s  ○ 30s  ○ 60s       │  │
│  └──────────────────────────────────┘  │
│                                        │
│  QUESTIONS                             │
│  ┌──────────────────────────────────┐  │
│  │ Max questions/hour:   [5 ▼]      │  │
│  │ Min time between:     [5 min ▼]  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  STORAGE                               │
│  ┌──────────────────────────────────┐  │
│  │ Data location: ~/.workflow-shadow│  │
│  │ [Open Folder]  [Change...]       │  │
│  └──────────────────────────────────┘  │
│                                        │
│  API                                   │
│  ┌──────────────────────────────────┐  │
│  │ Provider: [Gemini ▼]             │  │
│  │ API Key:  [••••••••••] [Show]    │  │
│  └──────────────────────────────────┘  │
│                                        │
│              [Save]  [Cancel]          │
└────────────────────────────────────────┘
```

## IPC Channels

### Main → Renderer
- `session:status-update` - Session state changed
- `question:show` - Display question overlay
- `question:hide` - Hide question overlay
- `mode:change` - Switch interview/observation mode

### Renderer → Main
- `session:start` - Start new session
- `session:pause` - Pause session
- `session:resume` - Resume session
- `session:end` - End session
- `question:answer` - Submit answer
- `question:dismiss` - Dismiss question
- `settings:update` - Save settings
- `export:start` - Generate documentation

## State Management

```typescript
interface UIState {
  mode: 'interview' | 'observation';
  windowVisible: boolean;
  sessionActive: boolean;
  currentQuestion: ClarificationQuestion | null;
  elapsedTime: number;
  taskCount: number;
  questionCount: number;
}
```

## Electron Main Process

### Window Management
```typescript
// Main process
let mainWindow: BrowserWindow | null;

function createWindow(mode: 'interview' | 'observation') {
  const config = WindowConfig[mode];
  mainWindow = new BrowserWindow({
    width: config.width,
    height: config.height,
    // ... other config
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
}

function switchMode(newMode: 'interview' | 'observation') {
  const config = WindowConfig[newMode];
  mainWindow.setSize(config.width, config.height);
  mainWindow.setPosition(config.x, config.y);
  mainWindow.setAlwaysOnTop(config.alwaysOnTop);
  mainWindow.webContents.send('mode:change', newMode);
}
```

### Tray Setup
```typescript
let tray: Tray | null;

function createTray() {
  tray = new Tray(trayIcon);
  tray.setContextMenu(buildTrayMenu());
  tray.on('click', toggleWindow);
}
```

## Technology Stack

- **Framework**: Electron
- **UI**: React (or vanilla HTML/CSS for simplicity)
- **State**: Simple state management (Context or Zustand)
- **Styling**: CSS modules or Tailwind
- **Build**: Electron Builder

## Platform Considerations

### macOS
- Request screen recording permission
- Request accessibility permission (for window titles)
- App notarization for distribution

### Windows
- No special permissions needed
- Consider Windows Defender exclusion for screenshot folder

### Linux
- X11 for window management
- May need additional dependencies for screenshots

## Events

- `window:shown` - Window became visible
- `window:hidden` - Window was hidden
- `mode:changed` - Mode switched
- `shortcut:triggered` - Keyboard shortcut used

## Dependencies
- Electron
- All feature modules (interview, observation, etc.)
- Icon assets

## Out of Scope
- Custom theming
- Animations/transitions
- Onboarding tutorial
- Multi-language support
