# Phase 0: Strip & Clean - Detailed Cleanup Guide

## Overview

This phase removes all features from the original "Cheating Daddy" codebase that are not needed for Workflow Shadow. The goal is to have a clean foundation with only the screen capture, window management, and basic storage infrastructure.

**Original Purpose:** Help users cheat in interviews/exams by providing AI answers
**New Purpose:** Document user's own workflows through observation

## Guiding Principles

**Delete if:**
- Related to audio (capture or playback)
- Related to generating/displaying "answers" to help user
- Related to assistance modes (interview help, sales help, etc.)
- Related to Google Search integration
- Related to emergency/privacy features for cheating

**Keep if:**
- Core screen capture functionality
- Window management (hide/show, positioning)
- Session/history storage patterns
- Settings infrastructure (we'll modify content later)
- Keyboard shortcuts infrastructure

## Detailed Deletion List

### 1. Audio Capture

**Why delete:** We're documenting workflows through visual observation only. Audio adds complexity without value for our use case.

#### Files to DELETE:
- [ ] `src/assets/SystemAudioDump` - macOS audio capture binary
- [ ] `src/handlers/audioCapture.ts` (or similar)
- [ ] `src/handlers/audioPlayback.ts` (or similar)
- [ ] `src/handlers/microphoneCapture.ts` (or similar)
- [ ] `src/utils/audioProcessing.ts` (or similar)
- [ ] Any audio buffer/stream handling code

#### Code to REMOVE from existing files:
- [ ] Audio device enumeration
- [ ] Audio recording start/stop logic
- [ ] Audio file writing
- [ ] Audio format conversion
- [ ] System audio routing setup

#### Settings to REMOVE:
- [ ] Audio quality settings
- [ ] Microphone selection
- [ ] System audio on/off
- [ ] Audio device dropdown

**How to identify:** Search for:
- `audio`, `microphone`, `mic`, `speaker`, `sound`
- `AudioContext`, `MediaRecorder`, `getUserMedia`
- `.wav`, `.mp3`, `.m4a` file extensions

---

### 2. Text-to-Speech (TTS) / Audio Playback

**Why delete:** We don't provide spoken answers. The AI asks questions via text, user responds via text.

#### Files to DELETE:
- [ ] TTS/speech synthesis modules
- [ ] Audio playback handlers
- [ ] Voice selection code

#### Code to REMOVE:
- [ ] `speechSynthesis` API usage
- [ ] Voice selection dropdown
- [ ] "Read aloud" features
- [ ] Audio output device selection

#### Settings to REMOVE:
- [ ] Voice selection
- [ ] Speech rate/pitch
- [ ] Audio output device

**How to identify:** Search for:
- `speechSynthesis`, `SpeechSynthesisUtterance`
- `speak`, `voice`, `utterance`

---

### 3. Assistance Profiles/Prompts

**Why delete:** Original app had multiple "modes" for different cheating scenarios. We have only two modes: interview and observation.

#### Files to DELETE:
- [ ] `src/prompts/interviewAssistant.ts` (or similar)
- [ ] `src/prompts/salesAssistant.ts`
- [ ] `src/prompts/examAssistant.ts`
- [ ] `src/prompts/meetingAssistant.ts`
- [ ] `src/prompts/presentationAssistant.ts`
- [ ] `src/prompts/negotiationAssistant.ts`
- [ ] Profile selection UI components

#### Code to REMOVE:
- [ ] Profile switching logic
- [ ] Profile-specific prompt templates
- [ ] Profile selection dropdown/menu
- [ ] Profile icons/assets

#### Settings to REMOVE:
- [ ] Profile selection UI
- [ ] Per-profile settings

**What to KEEP:**
- Prompt structure/templating system (we'll use it for interview/observation prompts)
- System prompt architecture

**How to identify:** Search for:
- `profile`, `assistant`, `mode` (in context of assistance)
- Lists of multiple prompt types

---

### 4. Answer Generation & Display

**Why delete:** We don't generate answers for the user. We ask questions and document what we observe.

#### Files to DELETE:
- [ ] Answer formatting components
- [ ] Answer display overlay (the part that shows AI answers)
- [ ] Answer history viewer

#### Code to REMOVE:
- [ ] Answer generation prompts
- [ ] Answer streaming/display logic
- [ ] Copy-to-clipboard for answers
- [ ] Answer rating/feedback

#### UI to REMOVE:
- [ ] Large overlay showing AI responses
- [ ] Answer text display
- [ ] "Generating answer..." loading states
- [ ] Answer actions (copy, regenerate, etc.)

**What to KEEP:**
- Basic overlay infrastructure (we'll use for questions)
- Message/chat bubble components (we'll use for interview)

**How to identify:** Search for:
- `answer`, `response`, `generate`
- Large text display components
- Streaming text components

---

### 5. Google Search Integration

**Why delete:** We're observing the user's screen, not searching the web for them.

#### Files to DELETE:
- [ ] Google Search API integration
- [ ] Search result parsing
- [ ] Search UI components

#### Code to REMOVE:
- [ ] Search query construction
- [ ] Search result fetching
- [ ] Search result display
- [ ] API key handling for search

#### Settings to REMOVE:
- [ ] Search provider selection
- [ ] Search API key input

**How to identify:** Search for:
- `google`, `search`, `serpapi`, `query`

---

### 6. Rate Limiting UI

**Why delete:** Original app tracked API usage for "Flash" vs "FlashLite" modes. We don't need this complexity.

#### Files to DELETE:
- [ ] Rate limit tracking UI
- [ ] Usage quota displays
- [ ] "Flash/FlashLite" mode switching

#### Code to REMOVE:
- [ ] Rate limit counters
- [ ] Usage tier logic
- [ ] Warning messages about usage

**What to KEEP:**
- Basic API error handling
- Request retry logic

**How to identify:** Search for:
- `rate`, `limit`, `quota`, `usage`
- `flash`, `flashlite`

---

### 7. Emergency Erase

**Why delete:** Original app had "panic button" to hide evidence of cheating. Not needed for legitimate workflow documentation.

#### Files to DELETE:
- [ ] Emergency erase handlers
- [ ] Panic button UI

#### Code to REMOVE:
- [ ] Emergency shutdown logic
- [ ] Data deletion on command
- [ ] Panic keyboard shortcuts

**What to KEEP:**
- Normal session end/cleanup logic

**How to identify:** Search for:
- `emergency`, `erase`, `panic`, `delete_all`

---

### 8. Compact Mode

**Why delete:** Original had multiple window layouts. We'll have simpler mode switching.

#### Code to REMOVE:
- [ ] Compact mode toggle
- [ ] Compact mode layout
- [ ] Mode switching UI

**What to KEEP:**
- Window resize/positioning infrastructure
- We'll implement our own mode switching (interview ↔ observation)

**How to identify:** Search for:
- `compact`, `mode` (in UI layout context)

---

## What to KEEP (Do Not Delete)

### ✅ Screen Capture
**Files:** Anything related to taking screenshots, screen recording permissions
**Why:** Core functionality we need
**Location:** Likely `src/handlers/screenCapture.ts` or similar

### ✅ Window Management
**Files:** Window positioning, visibility, always-on-top
**Why:** We need hide/show, positioning control
**Location:** Main process window creation, likely in `src/main.ts`

### ✅ Keyboard Shortcuts
**Files:** Global shortcut registration
**Why:** We'll modify shortcuts but need the infrastructure
**Location:** Likely in `src/main.ts` or `src/handlers/shortcuts.ts`

### ✅ Settings Infrastructure
**Files:** Settings storage, settings UI framework
**Why:** We'll change the settings, but need the system
**Location:** `src/components/Settings.tsx`, `src/storage/settings.ts`

### ✅ Session/History Storage
**Files:** Local storage patterns, file writing
**Why:** We need to persist sessions
**Location:** `src/storage/`, session management code

### ✅ IPC (Inter-Process Communication)
**Files:** IPC channels, handlers
**Why:** Electron main ↔ renderer communication
**Location:** `src/ipc/` or handlers in `src/main.ts`

### ✅ Basic UI Components
**Files:** Button, input, modal components
**Why:** Building blocks we'll reuse
**Location:** `src/components/ui/`

### ✅ LLM API Integration
**Files:** API client, request/response handling
**Why:** We'll use LLM differently but need the client
**Location:** `src/api/llm.ts` or similar

---

## Verification Checklist

After cleanup, verify:

### Build & Run
- [ ] `npm install` succeeds
- [ ] `npm run dev` starts without errors
- [ ] App window opens
- [ ] No console errors related to missing modules

### Core Functions Still Work
- [ ] Can take screenshots
- [ ] Can hide/show window with keyboard shortcut
- [ ] Settings panel opens
- [ ] Can write to local storage

### No Orphaned References
- [ ] No imports to deleted files (causes build errors)
- [ ] No broken UI references (missing components)
- [ ] No undefined functions being called

### Search for Leftovers
Search entire codebase for these terms, verify references are removed:
- [ ] `audio` - Should only be in package names, not feature code
- [ ] `speak` - Should not appear
- [ ] `profile` - Should not appear in assistance context
- [ ] `answer` - Should not appear in generation context
- [ ] `google` - Should not appear (unless in package.json)
- [ ] `search` - Should not appear in integration context
- [ ] `emergency` - Should not appear
- [ ] `panic` - Should not appear

---

## Cleanup Order (Recommended)

Do deletions in this order to minimize breakage:

1. **Delete audio files first** (binaries, assets)
2. **Remove audio handlers** (isolate before deleting)
3. **Remove TTS/playback** (separate from recording)
4. **Remove assistance profiles** (UI impact)
5. **Remove answer generation** (UI impact)
6. **Remove search integration** (external dependency)
7. **Remove rate limiting UI** (cosmetic)
8. **Remove emergency erase** (isolated feature)
9. **Remove compact mode** (UI layout)
10. **Clean up settings** (remove deleted feature settings)
11. **Clean up imports** (fix broken references)
12. **Test build** (ensure it compiles)

---

## File Structure: Before vs After

### BEFORE (Original Codebase)
```
src/
├── assets/
│   └── SystemAudioDump          ← DELETE
├── handlers/
│   ├── screenCapture.ts         ← KEEP
│   ├── audioCapture.ts          ← DELETE
│   ├── audioPlayback.ts         ← DELETE
│   └── googleSearch.ts          ← DELETE
├── prompts/
│   ├── interviewAssistant.ts   ← DELETE
│   ├── salesAssistant.ts       ← DELETE
│   ├── examAssistant.ts        ← DELETE
│   └── systemPrompt.ts         ← KEEP (modify)
├── components/
│   ├── AnswerDisplay.tsx       ← DELETE
│   ├── ProfileSelector.tsx     ← DELETE
│   ├── Settings.tsx            ← KEEP (modify)
│   └── ui/                     ← KEEP
├── storage/
│   └── session.ts              ← KEEP
└── main.ts                     ← KEEP (modify)
```

### AFTER (Clean Foundation)
```
src/
├── handlers/
│   └── screenCapture.ts         ← Kept
├── prompts/
│   └── systemPrompt.ts         ← Kept, will add new prompts
├── components/
│   ├── Settings.tsx            ← Kept, modified
│   └── ui/                     ← Kept
├── storage/
│   └── session.ts              ← Kept
└── main.ts                     ← Kept, modified
```

---

## Common Pitfalls

### ❌ Deleting too much
**Problem:** Delete window management thinking it's answer-related
**Solution:** Check against "What to KEEP" section before deleting

### ❌ Leaving orphaned imports
**Problem:** Delete file but leave `import` statements
**Solution:** After deleting, search for filename in entire project

### ❌ Breaking settings
**Problem:** Delete settings fields without removing UI
**Solution:** Update Settings component after removing features

### ❌ Not testing incrementally
**Problem:** Delete everything, then can't figure out what broke
**Solution:** Delete one category, test build, commit, repeat

---

## Commit Strategy

Make separate commits for each category:

```bash
git commit -m "Phase 0: Remove audio capture"
git commit -m "Phase 0: Remove TTS/playback"
git commit -m "Phase 0: Remove assistance profiles"
git commit -m "Phase 0: Remove answer generation UI"
git commit -m "Phase 0: Remove Google Search integration"
git commit -m "Phase 0: Remove rate limiting UI"
git commit -m "Phase 0: Remove emergency erase"
git commit -m "Phase 0: Remove compact mode"
git commit -m "Phase 0: Clean up settings panel"
git commit -m "Phase 0: Fix imports and build errors"
```

This makes it easy to revert if needed.

---

## Success Criteria

Phase 0 is complete when:

1. ✅ All listed files/code deleted
2. ✅ App builds without errors
3. ✅ App runs and shows window
4. ✅ Can take screenshot (core function test)
5. ✅ Can hide/show window (core function test)
6. ✅ Settings panel opens (UI test)
7. ✅ No references to deleted features in code search
8. ✅ Git history shows clean, atomic commits

---

## Next Steps

After Phase 0 cleanup, you'll have a minimal foundation with:
- Screen capture working
- Window management working
- Settings infrastructure present
- Session storage patterns available

Then proceed to **Phase 1: Foundation** (Screen Capture + Session Management + UI Shell)
