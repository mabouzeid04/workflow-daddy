# Workflow Daddy: Refactoring Suggestions

This document outlines changes needed to fully align the codebase with its new purpose as a **workflow documentation tool** rather than its original "Cheating Daddy" design.

---

## Executive Summary

The codebase has been partially migrated but still carries architectural assumptions and dead code from its original purpose. The six-phase workflow (Interview → Transition → Observation → Confusion Detection → Task Detection → Documentation) is ~75% implemented, but key integration points are missing.

---

## 1. Dead Code Cleanup

### 1.1 Remove Audio Processing Remnants

**File:** `src/utils/renderer.js`

The renderer still contains audio-related variables and logic that were part of the removed audio capture feature:

```javascript
// Lines 4-18 contain:
let mediaStream = null;
let audioContext = null;
let audioProcessor = null;
let micProcessor = null;
// ... more audio-related state
```

**Action:** Remove all audio-related code, variables, and functions from `renderer.js`. The app no longer needs audio capture for workflow documentation.

### 1.2 Remove "Cheating" References

Search for and update any remaining comments or internal strings that reference the old purpose:
- Variable names with "cheat" or similar
- Comments explaining old behaviors
- Config keys that don't match new functionality

---

## 2. Architecture Alignment

### 2.1 Simplify the View System

**Current State:** The app has multiple views (Main, Customize, Help, History, Assistant, Interview, Observation, Transition) but the flow described in WORKFLOW.md is linear:

```
Interview → Transition → Observation (with Question Overlays) → Documentation Export
```

**Suggestion:** Consider consolidating or removing views that don't fit this flow:

| View | Purpose | Keep/Remove/Modify |
|------|---------|-------------------|
| MainView | Entry point, start interview | **Keep** - Rename to "WelcomeView" |
| InterviewView | Chat-based interview | **Keep** |
| TransitionView | Explains observation | **Keep** |
| ObservationView | Shows recording status | **Keep** |
| AssistantView | Original "chat with AI" | **Remove or Repurpose** - Not in workflow |
| CustomizeView | Settings | **Modify** - Focus on workflow-relevant settings |
| HelpView | Help content | **Modify** - Update for workflow documentation |
| HistoryView | Past sessions | **Keep** - Important for reviewing workflows |

### 2.2 Rename MainView to Better Reflect Purpose

The current `MainView` serves as a landing page. For workflow documentation:
- Show interview progress/status
- Display "Start New Interview" or "Resume Interview"
- Show quick access to past documentation exports
- Remove any "cheating" oriented UI elements

---

## 3. Feature Integration Gaps

### 3.1 Wire Up Screenshot Analysis

**Problem:** Screenshots are captured but not analyzed for confusion detection or task inference.

**Current State:**
- `capture.js` captures screenshots ✓
- `confusion.js` has detection logic ✓
- `taskDetection.js` has inference logic ✓
- **Missing:** The actual AI vision calls connecting them

**Files to Modify:**
- `src/utils/session.js` - After capturing screenshot, trigger analysis
- `src/utils/confusion.js` - Implement `analyzeScreenshots()` with Gemini vision
- `src/utils/taskDetection.js` - Implement `inferFromScreenshot()` with Gemini vision

**Suggested Flow:**
```
Screenshot captured
    ↓
Session.onScreenshotCaptured()
    ↓
ConfusionDetector.analyze(screenshot, context)
    ↓
If confused → QuestionOverlay.show()
    ↓
TaskDetector.processScreenshot(screenshot)
    ↓
If task boundary → Update current task
```

### 3.2 Connect Question Overlay to Observation

**Problem:** QuestionOverlay exists but integration with observation flow is loose.

**Current State:**
- `QuestionOverlay.js` has UI for questions ✓
- Notification system exists ✓
- **Missing:** Seamless appearance during observation

**Suggestion:**
- When app is in tray and question generated → Native notification
- Clicking notification → Show app with question overlay
- After answering → Return to tray automatically

### 3.3 Documentation Generation Trigger

**Problem:** Documentation can be exported but there's no clear UI flow for when/how.

**Suggestion:** Add explicit export triggers:
- "End Session & Generate Documentation" button in ObservationView
- Export button in HistoryView for past sessions
- Preview capability before final export

---

## 4. Prompts Alignment

### 4.1 Review System Prompts

**File:** `src/utils/prompts.js`

Current prompts may still carry assumptions from the original purpose. Review each prompt:

| Prompt | Current Focus | Should Focus On |
|--------|--------------|-----------------|
| INTERVIEW_CONDUCTOR | Learning about job | ✓ Aligned |
| CONFUSION_DETECTOR | Unclear | Workflow-oriented questions |
| TASK_INFERENCER | Unclear | Business task recognition |
| SUMMARY_GENERATOR | Unclear | Workflow documentation format |

**Key Changes:**
- Confusion questions should ask about **workflow steps**, not help with tasks
- Task detection should identify **business processes**, not just app usage
- Documentation output should be **transferable knowledge**, not personal assistance

### 4.2 Add Documentation-Focused Prompts

Add prompts specifically for:
- Summarizing a complete workflow
- Identifying decision points in processes
- Describing tool usage patterns
- Generating handoff-ready documentation

---

## 5. UI/UX Adjustments

### 5.1 Remove Assistant-Style Interactions

The original app had an "AssistantView" for interactive help. For workflow documentation:
- The AI should observe, not assist
- Questions should clarify understanding, not provide answers
- The relationship is **learner** (AI) and **teacher** (user)

**Action:** Remove or hide AssistantView from navigation.

### 5.2 Observation-First Design

The app should feel like a **recording studio**, not a **chat assistant**:

- Prominent recording indicator when observing
- Clear session boundaries (start time, duration, events)
- Task timeline visualization
- Minimal interaction during observation (user should work normally)

### 5.3 Documentation Preview

Add a view that shows:
- What documentation would look like before export
- Tasks identified with their steps
- Questions and answers collected
- Tool usage summary

---

## 6. Settings Consolidation

### 6.1 Remove Irrelevant Settings

Review `CustomizeView` for settings that don't apply:
- Rate limiting (removed per commit history)
- Emergency features (removed)
- Audio capture settings (removed)

### 6.2 Add Workflow-Relevant Settings

Settings should include:
- Screenshot capture interval
- Screenshot quality
- Notification preferences for questions
- Export format preferences (Markdown, JSON, PDF)
- Session auto-pause rules (idle time, specific apps)

---

## 7. Storage Structure Alignment

### 7.1 Current Structure
```
workflow-daddy-config/
├── profiles/interview/     # Interview data
├── sessions/[id]/          # Session data
└── history/                # Session history
```

### 7.2 Suggested Additions
```
workflow-daddy-config/
├── exports/               # Generated documentation
│   └── [date]-[profile]/  # Organized by date and profile
├── templates/             # Documentation templates
└── workflows/             # Identified recurring workflows
```

---

## 8. Naming Consistency

### 8.1 App Identity

Ensure consistent naming throughout:
- Window title: "Workflow Daddy"
- Tray icon tooltip: "Workflow Daddy - Recording" / "Workflow Daddy - Paused"
- Notifications source: "Workflow Daddy"
- Config directory: `workflow-daddy-config` ✓

### 8.2 Internal Naming

Review and update:
- IPC channel names
- Event names
- Storage keys
- Class names

---

## 9. Implementation Priority

### High Priority (Core Functionality)
1. Wire screenshot analysis to confusion detection
2. Wire screenshot analysis to task detection
3. Complete documentation generation flow
4. Add session end / export flow

### Medium Priority (Polish)
5. Remove dead audio code
6. Consolidate views
7. Update prompts for documentation focus
8. Add documentation preview

### Low Priority (Enhancement)
9. Storage structure optimization
10. Template system for exports
11. Recurring workflow identification
12. Cross-session pattern analysis

---

## 10. Testing Recommendations

Before considering the migration complete, test:

1. **Full Flow Test**
   - Start interview → Complete interview → Start observation → Work for 10 min → Answer questions → Export documentation

2. **Confusion Detection Test**
   - Use an app not mentioned in interview
   - Verify question appears appropriately

3. **Task Detection Test**
   - Switch between multiple tasks
   - Verify task boundaries detected

4. **Documentation Quality Test**
   - Export documentation
   - Verify it captures the actual workflow performed
   - Verify it's useful as a handoff document

---

## Summary

The core architecture is sound and most of the old "Cheating Daddy" features have been removed. The main work is:

1. **Integration** - Connect the pieces that exist but aren't wired together
2. **Cleanup** - Remove dead code and old references
3. **Focus** - Ensure all features serve the workflow documentation purpose
4. **Polish** - UI/UX refinements for the documentation-first experience

The app is ~75% ready; the remaining 25% is integration and polish rather than new features.
