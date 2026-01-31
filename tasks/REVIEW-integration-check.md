# REVIEW: Integration Check & Validation

## Purpose
After all parallel tasks are complete, this review ensures no conflicts, duplicates, or integration issues.

## Run This Review AFTER
- TASK-01: Remove audio dead code ✓
- TASK-02: Remove AssistantView ✓
- TASK-03: Update prompts ✓
- TASK-04: Clean up settings ✓
- TASK-05: Wire screenshot analysis ✓
- TASK-06: Add export flow ✓
- TASK-07: Add documentation preview ✓
- TASK-08: Naming audit ✓

---

## 1. Check for Duplicate Code

### Gemini API Calls
Verify there's only ONE way to call the Gemini API:
- `src/utils/gemini.js` should be the single source
- No duplicate API call implementations in confusion.js or taskDetection.js
- All vision calls should use the same helper

### Context Assembly
Verify context is assembled consistently:
- `src/utils/context.js` should be the single source
- confusion.js and taskDetection.js should both use it
- No duplicate context-building logic

### Storage Access
Verify storage is accessed consistently:
- `src/storage.js` should be the single source
- No direct file system access scattered in components
- All session data goes through session.js

---

## 2. Check for Conflicts

### session.js Modifications
TASK-05 modified session.js for screenshot analysis.
TASK-06 may have added export triggers.

Verify:
- No conflicting state management
- Screenshot capture still works
- Session stop/export flow is clean

### WorkflowDaddyApp.js Navigation
TASK-02 removed AssistantView.
TASK-07 added DocumentationPreviewView.

Verify:
- Navigation state machine is consistent
- All view transitions work
- No orphaned routes

### IPC Handlers
Multiple tasks may have added IPC handlers.

Verify in `src/index.js`:
- No duplicate handler names
- All handlers have matching renderer calls
- Error handling is consistent

---

## 3. Test Full Workflow

### Interview Phase
1. Start app
2. Begin new interview
3. Answer 5-10 questions
4. Interview completes with summary
5. Transition view appears

**Check:** No errors, data saved correctly

### Transition Phase
1. Click "Start Observing"
2. App minimizes to tray
3. Observation begins

**Check:** Smooth transition, tray icon works

### Observation Phase
1. Work normally for 5 minutes
2. Screenshots are captured
3. AI analysis runs (check logs)
4. Confusion questions appear (if triggered)

**Check:** Screenshots saved, analysis logged, questions work

### Export Phase
1. Click "End Session & Export" (or from tray menu)
2. Preview appears (if implemented)
3. Export to file
4. Documentation contains all data

**Check:** File created, content complete

---

## 4. Check for Removed Features

Verify these are completely gone:

### Audio Capture
- [ ] No audio variables in renderer.js
- [ ] No microphone permissions requested
- [ ] No audio-related settings

### AssistantView
- [ ] Not in navigation
- [ ] Not importable
- [ ] No assistant-related IPC handlers (unless repurposed)

### Old Features
- [ ] No emergency erase
- [ ] No rate limiting UI
- [ ] No Google Search
- [ ] No "cheating" references

---

## 5. Check Naming Consistency

Run these searches (should return 0 results except in docs/history):

```bash
grep -ri "cheating" src/
grep -ri "cheat" src/
grep -ri "CheatingDaddy" src/
```

Verify:
- [ ] App title is "Workflow Daddy"
- [ ] Tray tooltip is "Workflow Daddy - ..."
- [ ] Config directory is workflow-daddy-config
- [ ] package.json name is correct

---

## 6. Check for Console Errors

Start the app and check for:
- [ ] No import errors
- [ ] No undefined function calls
- [ ] No missing IPC handlers
- [ ] No React/Lit rendering errors

---

## 7. Check File Structure

Verify expected files exist:
```
src/
├── components/
│   ├── views/
│   │   ├── InterviewView.js ✓
│   │   ├── TransitionView.js ✓
│   │   ├── ObservationView.js ✓
│   │   ├── DocumentationPreviewView.js ✓ (new)
│   │   ├── MainView.js ✓
│   │   ├── CustomizeView.js ✓
│   │   ├── HistoryView.js ✓
│   │   └── HelpView.js ✓
│   ├── overlays/
│   │   └── QuestionOverlay.js ✓
│   └── app/
│       ├── WorkflowDaddyApp.js ✓
│       └── AppHeader.js ✓
└── utils/
    ├── gemini.js ✓
    ├── prompts.js ✓
    ├── capture.js ✓
    ├── session.js ✓
    ├── context.js ✓
    ├── confusion.js ✓
    ├── taskDetection.js ✓
    ├── documentation.js ✓
    ├── interview.js ✓
    ├── renderer.js ✓ (cleaned)
    ├── window.js ✓
    ├── tray.js ✓
    └── storage.js ✓
```

Verify files that should NOT exist:
```
src/components/views/AssistantView.js ✗ (removed)
src/components/app/CheatingDaddyApp.js ✗ (removed)
```

---

## 8. Final Verification Commands

```bash
# Build the app
npm run make

# Start in dev mode
npm start

# Run any tests
npm test
```

---

## Issues Found

Document any issues here:

| Issue | File | Description | Severity | Fixed? |
|-------|------|-------------|----------|--------|
| | | | | |

---

## Sign-Off

- [ ] All parallel tasks verified complete
- [ ] No duplicate code found
- [ ] No conflicts found
- [ ] Full workflow tested
- [ ] Naming consistent
- [ ] No console errors
- [ ] Build succeeds

Reviewer: _________________
Date: _________________
