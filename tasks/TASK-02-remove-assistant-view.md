# TASK-02: Remove or Repurpose AssistantView

## Scope
Remove the AssistantView component which was designed for the old "chat assistant" paradigm that doesn't fit workflow documentation.

## Files to Modify
- `src/components/views/AssistantView.js` - Remove or gut this file
- `src/components/index.js` - Remove AssistantView export
- `src/components/app/WorkflowDaddyApp.js` - Remove AssistantView from navigation/routing

## Do NOT Touch
- `src/utils/gemini.js` (shared by other features)
- `src/utils/prompts.js` (separate task)
- Any other views
- `src/index.js` main process

## Steps

### 1. Check WorkflowDaddyApp.js
Find where AssistantView is imported and used in navigation. Remove:
- Import statement
- Any navigation item/button that leads to AssistantView
- Any route/view switching logic for 'assistant'

### 2. Check index.js (components)
Remove the export of AssistantView from the components barrel file.

### 3. Handle AssistantView.js
Either:
- **Option A**: Delete the file entirely
- **Option B**: Keep file but empty it with a comment explaining it's deprecated

Recommended: Option A (delete)

### 4. Check for Other References
Search for "AssistantView" or "assistant" view references in:
- `src/components/app/AppHeader.js` - Remove any nav links
- Any other component that might reference it

## Verification
1. App launches without errors
2. No "Assistant" option visible in navigation
3. No console errors about missing AssistantView
4. Other views (Interview, Observation, etc.) still work

## Notes
- The AI chat functionality in AssistantView is different from Interview chat
- Interview uses structured Q&A for learning about the job
- AssistantView was for open-ended "help me" chat - not needed for workflow documentation
