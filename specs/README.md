# Feature Specs Overview

## Features

| # | Feature | Description | Dependencies |
|---|---------|-------------|--------------|
| 00 | [Phase 0 Cleanup](./00-phase-0-cleanup.md) | Remove unnecessary features from original codebase | None (prerequisite) |
| 01 | [Screen Capture](./01-screen-capture.md) | Screenshots, app tracking, time logging | None (core) |
| 02 | [Interview Mode](./02-interview-mode.md) | Initial Q&A to understand user's role | LLM API |
| 03 | [Context Management](./03-context-management.md) | Memory across timeframes (immediate/session/historical) | 01 Screen Capture |
| 04 | [Confusion Detection](./04-confusion-detection.md) | Decides when to ask questions, handles Q&A | 03 Context Management, LLM API |
| 05 | [Task Detection](./05-task-detection.md) | Infers task boundaries from observations | 01 Screen Capture, 03 Context Management |
| 06 | [Session Management](./06-session-management.md) | Start/stop/resume sessions, persistence | 01 Screen Capture |
| 07 | [Documentation Generation](./07-documentation-generation.md) | Compiles everything into markdown output | All features |
| 08 | [UI Shell](./08-ui-shell.md) | Electron app, windows, shortcuts | All features |

## Dependency Graph

```
                    ┌─────────────────┐
                    │   08 UI Shell   │
                    └────────┬────────┘
                             │ hosts all
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ 02 Interview  │   │ 06 Session    │   │ 07 Document   │
│    Mode       │   │   Management  │   │  Generation   │
└───────────────┘   └───────┬───────┘   └───────┬───────┘
                            │                   │
                            │           uses all data
                            │                   │
                    ┌───────┴───────┐   ┌───────┴───────┐
                    │               │   │               │
                    ▼               ▼   ▼               │
            ┌───────────────┐   ┌───────────────┐       │
            │ 01 Screen     │──▶│ 03 Context    │       │
            │   Capture     │   │  Management   │       │
            └───────────────┘   └───────┬───────┘       │
                                        │               │
                        ┌───────────────┼───────────────┘
                        │               │
                        ▼               ▼
                ┌───────────────┐   ┌───────────────┐
                │ 04 Confusion  │   │ 05 Task       │
                │  Detection    │   │  Detection    │
                └───────────────┘   └───────────────┘
```

## Build Order (Suggested)

### Phase 0: Strip & Clean (DO THIS FIRST)
See [detailed cleanup guide](./00-phase-0-cleanup.md)
- Remove audio capture/playback
- Remove assistance profiles
- Remove answer generation
- Remove search integration
- Keep: screen capture, window management, settings infrastructure

### Phase 1: Foundation
1. **01 Screen Capture** - Core observation capability
2. **06 Session Management** - Basic persistence
3. **08 UI Shell (minimal)** - Window to host features

### Phase 2: Intelligence
4. **03 Context Management** - Memory system
5. **05 Task Detection** - Understand what user is doing
6. **02 Interview Mode** - Gather baseline info

### Phase 3: Interaction
7. **04 Confusion Detection** - Ask questions when confused

### Phase 4: Output
8. **07 Documentation Generation** - Produce final output
9. **08 UI Shell (complete)** - Polish, settings, export

## Shared Dependencies

### LLM API
Used by: 02, 03, 04, 05, 07

Needs:
- Vision capability (screenshot analysis)
- JSON structured output
- Reasonable context window (8k+ tokens)

Options: Gemini, GPT-4o, Claude

### Local Storage
Used by: All features

Structure:
```
~/.workflow-shadow/
├── config.json
├── app-state.json
├── profiles/
│   └── [profileId]/
│       ├── profile.json
│       ├── interview.json
│       ├── interview-summary.json
│       ├── documentation.json
│       ├── session-summaries.json
│       └── sessions/
│           └── [sessionId]/
│               ├── session.json
│               ├── session-context.json
│               ├── screenshots/
│               ├── tasks.json
│               ├── questions.json
│               └── timeline.json
└── exports/
```

### Electron APIs
Used by: 01, 06, 08

- `desktopCapturer` - Screenshots
- `BrowserWindow` - Window management
- `globalShortcut` - Keyboard shortcuts
- `Tray` - System tray
- `ipcMain/ipcRenderer` - IPC

## Data Flow Summary

```
[Screen Capture] ──screenshots──▶ [Context Management] ──context──▶ [Confusion Detection]
       │                                   │                              │
       │                                   │                              │
       ▼                                   ▼                              ▼
[Task Detection] ◀─────────────── [Session Context] ◀────────────── [Q&A Data]
       │                                   │                              │
       │                                   │                              │
       └───────────────────────────────────┼──────────────────────────────┘
                                           │
                                           ▼
                                 [Documentation Generation]
                                           │
                                           ▼
                                    [Markdown Export]
```
