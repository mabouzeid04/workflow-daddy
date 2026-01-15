# Feature Spec: Task Boundary Detection

## Overview
Automatically infers when one task ends and another begins based on application switches, time gaps, and content changes.

## Responsibilities
- Detect task boundaries from observation signals
- Name/categorize detected tasks
- Track task duration and associated apps
- Maintain current task state
- Provide task data for context and documentation

## Task Boundary Signals

A new task likely started when:

1. **Application switch** - User moves to different app (with exceptions)
2. **Significant time gap** - 5+ minutes of inactivity
3. **Content context change** - AI detects different work topic
4. **Time-of-day patterns** - Start of day, after lunch, end of day
5. **User indication** - User mentions starting new task in Q&A

## Data Structures

```typescript
interface Task {
  id: string;
  sessionId: string;
  name: string; // AI-inferred or user-provided
  startTime: Date;
  endTime: Date | null;
  duration: number; // seconds
  status: 'active' | 'completed' | 'interrupted';
  applications: AppSegment[];
  screenshots: string[]; // screenshot IDs
  userExplanation?: string; // from Q&A
}

interface AppSegment {
  app: string;
  windowTitle: string;
  startTime: Date;
  endTime: Date;
  duration: number;
}

interface TaskBoundaryEvent {
  type: 'task_start' | 'task_end' | 'task_switch';
  timestamp: Date;
  previousTask?: Task;
  newTask?: Task;
  trigger: 'app_switch' | 'time_gap' | 'context_change' | 'time_pattern' | 'user_indication';
}

interface TaskDetectionConfig {
  minTaskDuration: number; // seconds, ignore shorter "tasks", default 60
  idleThreshold: number; // seconds before marking gap, default 300
  appSwitchDebounce: number; // seconds, brief switches don't count, default 30
}
```

## Core Functions

### Task Lifecycle

#### `startTask(sessionId: string, trigger: string): Task`
- Create new task with status 'active'
- Start tracking applications
- Return task object

#### `endTask(task: Task, trigger: string): Task`
- Set endTime
- Calculate duration
- Update status to 'completed'
- Emit boundary event

#### `switchTask(currentTask: Task, trigger: string): { ended: Task, started: Task }`
- End current task
- Start new task
- Link them in sequence

### Boundary Detection

#### `detectBoundary(screenshots: Screenshot[], currentTask: Task, config: TaskDetectionConfig): TaskBoundaryEvent | null`
- Analyze recent screenshots
- Check for boundary signals
- Return event if boundary detected, null otherwise

#### `isSignificantAppSwitch(prev: Screenshot, curr: Screenshot, config: TaskDetectionConfig): boolean`
- Check if apps are different
- Ignore brief switches (< debounce time)
- Ignore certain app pairs (e.g., browser tabs within same site)

#### `isIdleGap(screenshots: Screenshot[], config: TaskDetectionConfig): boolean`
- Check time between screenshots
- Return true if gap exceeds threshold

#### `detectContextChange(screenshots: Screenshot[], context: AssembledContext): boolean`
- Ask LLM if content/topic changed significantly
- Use conservative threshold (avoid over-segmentation)

**Context Change Prompt:**
```
Looking at these recent screenshots, has the user switched to a
different task or are they continuing the same work?

Current task theory: {currentTaskTheory}
Recent activity: {recentActivitySummary}

Respond with JSON:
{
  "sameTask": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

Be conservative - minor context switches within the same goal
(e.g., checking email mid-task) don't count as new tasks.
```

### Task Naming

#### `inferTaskName(task: Task, context: AssembledContext): string`
- Analyze screenshots and apps used
- Generate descriptive name
- Use interview context for domain language

**Task Naming Prompt:**
```
Based on these observations, give this task a brief, descriptive name.

Applications used: {apps}
Window titles seen: {titles}
Duration: {duration}
User's role: {roleSummary}

Respond with just the task name (2-5 words), e.g.:
- "Process purchase orders"
- "Update inventory spreadsheet"
- "Email customer about delivery"
- "Review sales report"
```

### Task Merging

#### `shouldMergeTasks(task1: Task, task2: Task): boolean`
- Check if tasks are likely the same work
- Short gap between them
- Same applications
- Similar context

#### `mergeTasks(task1: Task, task2: Task): Task`
- Combine into single task
- Sum durations
- Merge app segments

## App Switch Heuristics

Not every app switch is a task boundary:

```typescript
const SAME_TASK_PAIRS = [
  // Browser research while in main app
  ['*', 'Google Chrome'],
  ['*', 'Safari'],
  ['*', 'Firefox'],

  // Quick reference lookups
  ['*', 'Calculator'],
  ['*', 'Notes'],
  ['*', 'Preview'],

  // Communication checks (brief)
  ['*', 'Slack'],
  ['*', 'Microsoft Teams'],
];

// These switches likely indicate new task
const NEW_TASK_APPS = [
  'Mail', 'Outlook', // Email often = new context
  'Calendar', // Scheduling = different work
  'Zoom', 'Meet', // Meetings = distinct task
];
```

## State Machine

```
[NO TASK]
    │
    ├─(first activity)──→ [TASK ACTIVE]
    │                          │
    │   ┌──────────────────────┤
    │   │                      │
    │   │  (continued work)    │
    │   │       ↓              │
    │   └──[TASK ACTIVE]       │
    │                          │
    │   (boundary detected)    │
    │          ↓               │
    │   [TASK COMPLETED]───────┤
    │          │               │
    │          ↓               │
    └────[NEW TASK ACTIVE]─────┘

    (idle gap)
         ↓
    [TASK INTERRUPTED]
         │
         ├─(resume same work)──→ [TASK ACTIVE] (merge)
         │
         └─(different work)────→ [NEW TASK ACTIVE]
```

## Storage

```
~/.workflow-shadow/profiles/[profileId]/sessions/[sessionId]/
  tasks.json  # Array of Task objects
```

## Events

- `task:started` - New task begun
- `task:ended` - Task completed
- `task:switched` - One task ended, another started
- `task:merged` - Two tasks combined

## Integration Points

### From Screen Capture
- Receives screenshots and app switch events
- Triggers boundary detection

### To Context Management
- Provides task list for session context
- Triggers summary updates on task boundaries

### To Documentation
- Provides task data for final output

## Example Flow

```
09:00 - User opens Excel, starts working
        → startTask("task-1")

09:15 - User briefly checks Slack (30 sec)
        → No boundary (brief switch)

09:20 - User switches to SAP
        → Boundary detected (app_switch)
        → endTask("task-1"), startTask("task-2")

09:45 - User goes to lunch (no activity)
        → After 5 min: task-2 status = 'interrupted'

10:30 - User returns, opens Excel again
        → Context similar to task-1
        → startTask("task-3") - new task, but similar pattern noted
```

## Dependencies
- Screen Capture (app switch events, screenshots)
- Context Management (provides assembled context)
- LLM API (for context change detection, task naming)

## Out of Scope
- Task prediction ("you usually do X next")
- Task templates (recognizing recurring task patterns)
- Manual task annotation UI (let AI infer for MVP)
