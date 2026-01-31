# TASK-03: Update System Prompts for Workflow Documentation

## Scope
Review and update all system prompts in `src/utils/prompts.js` to focus on workflow documentation rather than personal assistance.

## Files to Modify
- `src/utils/prompts.js` (ONLY this file)

## Do NOT Touch
- Any other files
- The interview.js logic
- The confusion.js logic
- The gemini.js API calls

## Current Prompts to Review

### INTERVIEW_CONDUCTOR_PROMPT
**Current Focus:** Learning about user's job
**Status:** Likely already aligned, but verify:
- Questions should focus on workflows, processes, tools
- Should NOT offer to help with tasks
- Should be a learner/observer, not an assistant

### CONFUSION_DETECTOR_PROMPT (if exists)
**Should Focus On:**
- "I don't understand what workflow step this is"
- "Is this part of [previously mentioned task]?"
- "What is the purpose of this action in your workflow?"

**Should NOT:**
- Offer help or suggestions
- Try to assist with the task
- Provide answers or solutions

### TASK_INFERENCE_PROMPT (if exists)
**Should Focus On:**
- Identifying business processes
- Recognizing task boundaries
- Naming tasks by their business purpose

**Should NOT:**
- Categorize by app used
- Focus on personal productivity
- Suggest improvements

### SUMMARY_GENERATOR_PROMPT (if exists)
**Should Focus On:**
- Creating transferable documentation
- Describing workflows step-by-step
- Noting decision points and alternatives
- Listing tools and their purposes

**Output Format Should Be:**
- Handoff-ready documentation
- Could be given to a new employee or AI
- Describes "how to do this job"

## Prompt Writing Guidelines

For all prompts, ensure:

1. **Observer Mindset**
   - "I am learning how you work"
   - "Help me understand your process"
   - NOT "Let me help you"

2. **Documentation Focus**
   - "What would someone need to know to do this?"
   - "What are the steps in this workflow?"
   - NOT "How can I make this easier?"

3. **Neutral Tone**
   - No praise ("Great job!")
   - No judgment ("That seems inefficient")
   - Just curiosity and clarification

4. **Brevity**
   - Short responses (1-2 sentences)
   - One question at a time
   - No bullet points or lists in conversation

## Verification
1. Read each prompt and verify it fits the "workflow documentation" purpose
2. No prompts should position the AI as a helper/assistant
3. All prompts should position the AI as a learner/documenter
