# Feature Spec: Interview Mode

## Overview
The initial conversational interview that gathers baseline information about the user's role before observation begins.

## Responsibilities
- Display welcome/introduction screen
- Conduct AI-driven conversational interview
- Store interview responses verbatim
- Generate compressed summary for context loading
- Transition to observation mode when complete

## User Flow

```
[Launch App] → [Welcome Screen] → [Start Interview]
                                        ↓
                              [AI asks question]
                                        ↓
                              [User types response]
                                        ↓
                              [AI asks follow-up or next topic]
                                        ↓
                              [Repeat until baseline established]
                                        ↓
                              [AI indicates ready]
                                        ↓
                              [Transition to Observation]
```

## Data Structures

```typescript
interface InterviewMessage {
  id: string;
  role: 'ai' | 'user';
  content: string;
  timestamp: Date;
}

interface InterviewSession {
  profileId: string;
  startTime: Date;
  endTime: Date | null;
  messages: InterviewMessage[];
  completed: boolean;
}

interface InterviewSummary {
  role: string;
  department: string;
  reportsTo: string;
  responsibilities: string[];
  typicalDay: string;
  systemsUsed: string[];
  statedPainPoints: string[];
  interactions: string[];
  rawTokenCount: number;
  generatedAt: Date;
}
```

## Interview Topics

The AI should cover these areas (adaptive, not rigid script):

1. **Role basics**: Job title, department, who they report to
2. **Core responsibilities**: Main things they're responsible for
3. **Daily structure**: What a typical day looks like
4. **Systems used**: Software/tools they use regularly
5. **Pain points**: What's tedious or frustrating
6. **Interactions**: Who they work with (people, departments, external)
7. **Outputs**: What deliverables their work produces
8. **Edge cases**: Unusual situations that come up

## Core Functions

### `startInterview(profileId: string): InterviewSession`
- Create new interview session
- Display welcome message
- Send first AI message

### `sendMessage(session: InterviewSession, userMessage: string): InterviewMessage`
- Store user message
- Call LLM with conversation history
- Get AI response
- Check if AI indicates completion
- Return AI message

### `checkCompletion(messages: InterviewMessage[]): boolean`
- Analyze AI's latest message
- Return true if AI indicates sufficient baseline gathered

### `generateSummary(session: InterviewSession): InterviewSummary`
- Call LLM to extract structured summary from conversation
- Compress to ~500 tokens for context loading
- Store both full transcript and summary

### `transitionToObservation(profileId: string)`
- Mark interview complete
- Save summary
- Emit event to switch modes

## AI Prompts

### Interview Conductor Prompt
```
You are a workflow documenter helping the user capture their job.
Your goal is to gather enough information to later observe their work
and document their workflows.

Ask conversational questions to understand:
- What they do day-to-day
- What systems/tools they use
- What's tedious or frustrating
- Who they interact with
- What their outputs/deliverables are

Be friendly and curious. Explain why you're asking if needed.
Ask one question at a time. Follow up on interesting details.

When you feel you have a solid baseline understanding of their role,
say exactly: "I think I have a good picture of your role. Ready to
start observing?"
```

### Summary Generation Prompt
```
Extract a structured summary from this interview transcript.
Output JSON with these fields:
- role: job title
- department: department name
- reportsTo: manager/supervisor
- responsibilities: array of main duties
- typicalDay: brief description of daily structure
- systemsUsed: array of software/tools mentioned
- statedPainPoints: array of frustrations mentioned
- interactions: array of people/departments they work with

Be concise. This will be loaded as context for observation.
```

## UI Components

### Welcome Screen
- Brief explanation of what the tool does
- "Start Interview" button
- Estimated time (15-30 min)

### Interview Chat UI
- Message bubbles (AI left, user right)
- Text input at bottom
- Progress indicator (optional: topics covered)
- "Skip" option for individual questions

## Storage

```
~/.workflow-shadow/profiles/[profileId]/
  interview.json         # Full transcript (InterviewSession)
  interview-summary.json # Compressed summary (InterviewSummary)
```

## Events Emitted

- `interview:started` - Interview began
- `interview:message` - New message in conversation
- `interview:completed` - Interview finished
- `interview:ready-for-observation` - Transition signal

## Dependencies
- LLM API (Gemini/OpenAI/Anthropic)
- UI framework for chat interface
- Local storage for persistence

## Out of Scope
- Re-doing interview after completion (can be added later)
- Multiple profiles (handled by Profile Management)
- Voice input (text only for MVP)
