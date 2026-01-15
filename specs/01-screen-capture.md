# Feature Spec: Screen Capture & Application Tracking

## Overview
The core observation engine that captures what's happening on the user's screen.

## Responsibilities
- Take screenshots at configurable intervals
- Detect active application and window title
- Track time spent in each application
- Detect application switches
- Capture URLs for browser-based work (optional)

## Data Structures

```typescript
interface Screenshot {
  id: string;
  sessionId: string;
  timestamp: Date;
  imagePath: string;
  activeApplication: string;
  windowTitle: string;
  url?: string; // for browsers
}

interface AppUsageRecord {
  app: string;
  windowTitle: string;
  startTime: Date;
  endTime: Date | null;
  duration: number; // seconds
}
```

## Configuration

```typescript
interface CaptureConfig {
  screenshotInterval: number; // milliseconds, default 10000 (10s)
  imageQuality: number; // 0-1, default 0.7
  captureAllMonitors: boolean; // default false (primary only)
  trackUrls: boolean; // default true
  urlPrivacyMode: 'full' | 'domain-only'; // default 'full'
}
```

## Core Functions

### `startCapture(sessionId: string, config: CaptureConfig)`
- Begin screenshot loop at configured interval
- Start tracking active application
- Return cleanup function to stop

### `captureScreenshot(): Screenshot`
- Take screenshot of primary monitor (or all if configured)
- Get active window info (app name, title, URL if browser)
- Save image to session's screenshots folder
- Return Screenshot object

### `getActiveWindow(): { app: string, title: string, url?: string }`
- Use OS APIs to get frontmost application
- Extract window title
- If browser, extract URL from title or accessibility APIs

### `trackAppSwitch(previous: AppUsageRecord, current: Screenshot)`
- Detect when app changed
- Close out previous AppUsageRecord with endTime
- Start new AppUsageRecord
- Emit event for context management

## Platform Considerations

### macOS
- Use `NSWorkspace` for active app
- Use Accessibility APIs or AppleScript for window title/URL
- Screenshot via `CGWindowListCreateImage`

### Windows
- Use `GetForegroundWindow` + `GetWindowText`
- Screenshot via GDI or Desktop Duplication API

### Linux
- Use `xdotool` or X11 APIs
- Screenshot via `scrot` or X11

## Storage

Screenshots saved to:
```
~/.workflow-shadow/profiles/[profileId]/sessions/[sessionId]/screenshots/
  [timestamp]-[id].jpg
```

## Events Emitted

- `screenshot:captured` - New screenshot taken
- `app:switched` - User changed applications
- `capture:started` - Capture loop began
- `capture:stopped` - Capture loop ended

## Dependencies
- Electron `desktopCapturer` or native screenshot module
- OS-specific window info APIs
- File system for image storage

## Out of Scope
- Screenshot analysis (handled by AI/Context Management)
- Task detection (separate feature)
- Multi-monitor selection UI (Phase 2)
