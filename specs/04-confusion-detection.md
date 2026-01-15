# Feature Spec: Confusion Detection & Questioning

## Overview
The AI logic that analyzes observations, decides when to ask clarifying questions, and handles the Q&A interaction with the user.

## Responsibilities
- Analyze screenshots to understand what's happening
- Detect when clarification is needed
- Generate contextual questions
- Display non-blocking question UI
- Store Q&A for documentation

## When to Ask Questions

The AI should ask when it observes:

1. **Unfamiliar applications** - App not mentioned in interview
2. **Unclear purpose** - Can't infer what task this serves
3. **Repeated actions** - Might indicate a workaround
4. **Multi-system task** - Switching between apps for one goal
5. **Pattern deviation** - Different from previous sessions
6. **Manual data entry** - Typing data that exists elsewhere
7. **Error states** - User encountering problems

## When NOT to Ask

- Can reasonably infer from context
- Already asked similar question this session
- User appears to be in flow (minimize interruption)
- Question rate limit reached

## Data Structures

```typescript
interface ConfusionSignal {
  type: 'unfamiliar_app' | 'unclear_purpose' | 'repeated_action' |
        'multi_system' | 'pattern_deviation' | 'manual_entry' | 'error_state';
  confidence: number; // 0-1
  context: string; // what triggered this
  suggestedQuestion: string;
}

interface ClarificationQuestion {
  id: string;
  sessionId: string;
  timestamp: Date;
  triggerContext: string; // what the AI observed
  question: string;
  status: 'pending' | 'answered' | 'dismissed' | 'deferred';
  answer?: string;
  answeredAt?: Date;
}

interface QuestioningConfig {
  maxQuestionsPerHour: number; // default 5
  minTimeBetweenQuestions: number; // seconds, default 300 (5 min)
  confidenceThreshold: number; // 0-1, default 0.7
}
```

## Core Functions

### Confusion Detection

#### `analyzeForConfusion(context: AssembledContext): ConfusionSignal | null`
- Send current context to LLM
- Ask LLM to identify if clarification needed
- Return signal if confused, null if not

**Analysis Prompt:**
```
You are observing the user's screen to document their workflow.

CONTEXT:
{assembledContext}

RECENT SCREENSHOTS:
[attached images]

Analyze what the user is doing. Are you confused about anything?

If you ARE confused, respond with JSON:
{
  "confused": true,
  "type": "unfamiliar_app|unclear_purpose|repeated_action|multi_system|pattern_deviation|manual_entry|error_state",
  "confidence": 0.0-1.0,
  "context": "what you observed that confused you",
  "question": "a brief, specific question to ask the user"
}

If you are NOT confused, respond with:
{
  "confused": false,
  "understanding": "brief description of what you think they're doing"
}

Only be confused if you genuinely cannot understand. Infer when possible.
Do not ask about things already explained in interview or previous Q&A.
```

#### `shouldAskQuestion(signal: ConfusionSignal, config: QuestioningConfig, session: SessionContext): boolean`
- Check confidence threshold
- Check rate limit (questions per hour)
- Check time since last question
- Check if similar question already asked
- Return true if should ask

### Question Management

#### `createQuestion(signal: ConfusionSignal, sessionId: string): ClarificationQuestion`
- Create question record
- Status: 'pending'
- Emit event to show UI

#### `answerQuestion(questionId: string, answer: string): ClarificationQuestion`
- Update question with answer
- Update status to 'answered'
- Add to session context (questionsAsked)
- Emit event to hide UI

#### `dismissQuestion(questionId: string): ClarificationQuestion`
- Update status to 'dismissed'
- Still counts toward rate limit
- Emit event to hide UI

#### `deferQuestion(questionId: string): ClarificationQuestion`
- Update status to 'deferred'
- Will resurface later (or in summary)
- Emit event to hide UI

### Rate Limiting

#### `getQuestionCount(sessionId: string, windowMinutes: number): number`
- Count questions asked in last N minutes
- Include answered + dismissed + deferred

#### `canAskQuestion(sessionId: string, config: QuestioningConfig): boolean`
- Check if under rate limit
- Check time since last question

## Question UI

### Overlay Behavior
- **Position**: Top-right corner, non-blocking
- **Size**: Small notification (400x150), expandable
- **Appearance**: Subtle, not alarming

### States

1. **Notification** (collapsed)
   - Small indicator: "Quick question..."
   - Click to expand

2. **Expanded**
   - Context: "I noticed you just [context]"
   - Question: "[question]"
   - Input: Text field for response
   - Buttons: [Submit] [Skip] [Ask Later]

3. **Hidden**
   - After answered/dismissed
   - Can re-show via keyboard shortcut

### Interaction
- `Cmd/Ctrl + Q`: Toggle question visibility
- `Enter`: Submit answer
- `Escape`: Dismiss question

## Storage

Questions stored in session:
```
~/.workflow-shadow/profiles/[profileId]/sessions/[sessionId]/
  questions.json  # Array of ClarificationQuestion
```

## Events

- `question:created` - New question ready to show
- `question:answered` - User answered
- `question:dismissed` - User skipped
- `question:deferred` - User chose "ask later"

## Integration Points

### From Screen Capture
- Receives new screenshots
- Triggers analysis

### From Context Management
- Gets assembled context for analysis
- Reports answered questions for session context

### To Documentation
- Provides Q&A records for final documentation

## Example Question Flow

```
1. [Screenshot captured: User in unfamiliar app "SAP"]
2. [Confusion Detection: Analyzes with context]
3. [Signal: type=unfamiliar_app, confidence=0.85]
4. [Check: Under rate limit? Yes. Threshold met? Yes.]
5. [Create question: "I see you're using SAP. What are you doing here?"]
6. [Show UI: Notification appears]
7. [User clicks, expands, types: "Checking inventory levels for the Johnson order"]
8. [Answer stored, UI hides]
9. [Context updated: Now knows about SAP inventory checking]
```

## Dependencies
- Context Management (provides assembled context)
- Screen Capture (triggers analysis)
- LLM API (for confusion detection)
- UI framework (for question overlay)

## Out of Scope
- Voice responses (text only)
- Proactive suggestions ("You could do this faster by...")
- Learning from dismissals (for MVP, just track them)
