<img width="1299" height="424" alt="cd (1)" src="https://github.com/user-attachments/assets/b25fff4d-043d-4f38-9985-f832ae0d0f6e" />

## Recall.ai - API for desktop recording

If you’re looking for a hosted desktop recording API, consider checking out [Recall.ai](https://www.recall.ai/product/desktop-recording-sdk/?utm_source=github&utm_medium=sponsorship&utm_campaign=sohzm-cheating-daddy), an API that records Zoom, Google Meet, Microsoft Teams, in-person meetings, and more.

This project is sponsored by Recall.ai.

---

> [!NOTE]  
> Use latest MacOS and Windows version, older versions have limited support

> [!NOTE]  
> During testing it wont answer if you ask something, you need to simulate interviewer asking question, which it will answer

A real-time AI assistant that provides contextual help during video calls, interviews, presentations, and meetings using screen capture and audio analysis.

## Features

- **Live AI Assistance**: Real-time help powered by Google Gemini 2.0 Flash Live
- **Screen & Audio Capture**: Analyzes what you see and hear for contextual responses
- **Screen Capture Service**: Automatic screenshot capture and application tracking
- **Session Management**: Organize captured data by sessions with metadata
- **Application Tracking**: Monitor active applications and window titles
- **Browser URL Tracking**: Capture URLs from supported browsers (with privacy options)
- **Multiple Profiles**: Interview, Sales Call, Business Meeting, Presentation, Negotiation
- **Transparent Overlay**: Always-on-top window that can be positioned anywhere
- **Click-through Mode**: Make window transparent to clicks when needed
- **Cross-platform**: Works on macOS, Windows, and Linux (kinda, dont use, just for testing rn)

## Setup

1. **Get a Gemini API Key**: Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. **Install Dependencies**: `npm install`
3. **Run the App**: `npm start`

## Usage

1. Enter your Gemini API key in the main window
2. Choose your profile and language in settings
3. Click "Start Session" to begin
4. Position the window using keyboard shortcuts
5. The AI will provide real-time assistance based on your screen and what interview asks

## Keyboard Shortcuts

- **Window Movement**: `Ctrl/Cmd + Arrow Keys` - Move window
- **Click-through**: `Ctrl/Cmd + M` - Toggle mouse events
- **Close/Back**: `Ctrl/Cmd + \` - Close window or go back
- **Send Message**: `Enter` - Send text to AI

## Audio Capture

- **macOS**: [SystemAudioDump](https://github.com/Mohammed-Yasin-Mulla/Sound) for system audio
- **Windows**: Loopback audio capture
- **Linux**: Microphone input

## Screen Capture

The app includes a comprehensive screen capture service that automatically captures screenshots and tracks application usage during sessions.

### Features

- **Automatic Screenshots**: Configurable interval-based screenshot capture
- **Application Tracking**: Monitors active applications and window titles
- **Browser Integration**: Captures URLs from supported browsers (Safari, Chrome, Firefox, Edge, etc.)
- **Privacy Controls**: Option to limit URL tracking to domain-only
- **Session Organization**: All captured data organized by session ID
- **Cross-platform Support**: Native implementations for macOS, Windows, and Linux

### Configuration

Screen capture settings can be configured through the app interface:

- **Screenshot Interval**: Time between captures (default: 10 seconds)
- **Image Quality**: JPEG compression quality (default: 0.7)
- **Monitor Selection**: Capture primary monitor or all monitors
- **URL Tracking**: Enable/disable browser URL capture
- **Privacy Mode**: Full URLs or domain-only for privacy

### Supported Browsers

- **macOS**: Safari, Google Chrome, Firefox, Microsoft Edge, Brave Browser, Arc
- **Windows**: URL tracking via window titles (limited support)
- **Linux**: URL tracking via window titles (limited support)

### Data Storage

Captured data is stored locally in the app's configuration directory:
- Screenshots: `~/Library/Application Support/cheating-daddy-config/sessions/{sessionId}/screenshots/`
- Metadata: JSON files containing screenshot metadata and application usage records

## Requirements

- Electron-compatible OS (macOS, Windows, Linux)
- Gemini API key
- Screen recording permissions
- Microphone/audio permissions
