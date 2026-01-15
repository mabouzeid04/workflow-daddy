# Workflow Shadow - Product Specification

## Overview

**Workflow Shadow** is a self-service Electron app that helps you document your own job. It observes how you work, asks clarifying questions when confused, and generates comprehensive documentation of your workflows, tools, and processes. This documentation can then be used for automation, training, process improvement, or any other purpose.

### Core Philosophy
The tool behaves like an intelligent intern shadowing an employee:
1. **Interview Phase**: Introduces itself, asks questions to understand the employee's role
2. **Observation Phase**: Watches silently, only interrupting when confused
3. **Documentation Phase**: Generates structured markdown documentation per employee role

### Important: Documentation Only (No Recommendations)
**The LLM in this system documents workflows but does NOT recommend solutions or identify optimizations.**

**What the LLM DOES do:**
- Understand what's happening on screen (required to document accurately)
- Ask clarifying questions when confused about what or why
- Organize observations into coherent workflow documentation
- Record employee explanations and stated pain points

**What the LLM does NOT do:**
- Recommend automation opportunities
- Suggest process improvements
- Prioritize or rank issues
- Propose solutions to problems
- Generate "insights" or actionable recommendations

The output is a comprehensive factual record—all the information needed to understand how you perform your computer-based tasks. You can then feed this documentation to an LLM for analysis, use it for training/handoffs, or build automation on top of it. This separation keeps the data collection clean and unbiased.

---

## Target Users

### Primary User
- Anyone who wants to document their own job/workflow
- Knowledge workers, administrative staff, operations roles, etc.
- Wants a comprehensive record of what they do and how they do it
- May use the documentation for automation, handoffs, training, or personal reference

---

## Use Case Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. DOWNLOAD & LAUNCH                                           │
│     - User downloads and installs the app                       │
│     - Launches it when ready to start documenting               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. INTERVIEW PHASE                                             │
│     - AI introduces itself and explains purpose                 │
│     - Asks structured questions about role, responsibilities    │
│     - Builds baseline understanding of what you do              │
│     - Duration: 15-30 minutes                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. OBSERVATION PHASE                                           │
│     - Passive screen monitoring (automatic screenshots)         │
│     - Tracks applications used, time spent, task switches       │
│     - Only interrupts when AI doesn't understand something      │
│     - Questions focus on "WHY" not just "WHAT"                  │
│     - Duration: Run as long as needed (days to weeks)           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. DOCUMENTATION GENERATION                                    │
│     - Generates markdown documentation of your workflows        │
│     - Structure: Tasks + Systems + Time + Your Statements       │
│     - Raw factual record (no synthesis or recommendations)      │
│     - Use for automation, training, handoffs, or feed to LLM    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Feature Specification

### Phase 1: Interview Mode

#### AI Introduction
When the tool first launches:

```
"Hi! I'm here to help you document your job.

I'll start by asking some questions about what you do, then I'll quietly
observe your work. If I get confused about something, I'll ask a quick
question - just like an intern shadowing you.

By the end, you'll have a complete record of your workflows, the tools
you use, and how you spend your time.

Ready to start? Let's begin with some questions about your role."
```

#### Interview Questions (AI-driven, adaptive)
The AI should gather:
- **Role basics**: Job title, department, who they report to
- **Core responsibilities**: What are the main things they're responsible for?
- **Daily structure**: What does a typical day look like?
- **Systems used**: What software/tools do they use regularly?
- **Pain points**: What parts of the job are tedious or frustrating?
- **Interactions**: Who do they work with? (other departments, vendors, customers)
- **Outputs**: What deliverables or results does their work produce?
- **Edge cases**: What unusual situations come up?

#### Transition to Observation
Once the AI has sufficient baseline understanding:

```
"Thanks for explaining your role! I have a good picture of what you do.

I'll now switch to observation mode. I'll watch quietly and only ask
questions if I see something I don't understand.

You can minimize me anytime. Press [Cmd/Ctrl + \] to hide/show me.

Let me know if you have questions - otherwise, just go about your work!"
```

---

### Phase 2: Observation Mode

#### Screen Capture
- **Method**: Automatic screenshots at configurable intervals
- **Default interval**: Every 10 seconds (adjustable: 5s, 10s, 30s, 60s)
- **Quality**: Medium (0.7 JPEG) to balance clarity and storage
- **Storage**: Local only, per-session organization

#### Application Tracking
Track and record:
- **Active application**: Window title, application name
- **Time in application**: Start/end timestamps
- **Transitions**: When user switches between applications
- **URL tracking**: For browser-based work, capture URLs (domain-level privacy option)

#### Task Boundary Detection
Automatically infer task boundaries based on:
- Application switches (e.g., Excel → Email → ERP)
- Significant time gaps (>5 minutes idle)
- Content context changes (AI analysis of screenshots)
- Time of day patterns (start of day, after lunch, end of day)

#### Time Tracking
For each detected task:
- Start timestamp
- End timestamp
- Duration
- Applications involved
- Interruptions (if task was paused and resumed)

#### Confusion Detection (Triggers Questions)
AI should ask clarifying questions when it observes:
- Unfamiliar applications or workflows
- Repeated actions that might indicate workarounds
- Switching between multiple systems for what seems like one task
- Manual data entry that could be automated
- Patterns that don't match what was described in interview
- Error states or unusual UI patterns

#### Question UX
When AI needs clarification:
- **Subtle overlay**: Small notification at top of screen
- **Non-blocking**: Employee can dismiss and answer later
- **Context included**: "I noticed you just did X, Y, Z..."
- **Simple question**: "Why is this done this way?" / "What are you trying to accomplish?"
- **Quick response**: Text input or voice-to-text (if mic enabled)
- **Skip option**: "I'll figure it out" / "Ask me later"

---

### Phase 3: Documentation Generation

#### Output Format: Markdown

The app produces a markdown file with this structure:

```markdown
# [Role Name] Workflow Documentation

## Role Overview
- **Title**: [Job Title]
- **Department**: [Department]
- **Reports To**: [Manager/Role]
- **Observation Period**: [Start Date] - [End Date]
- **Total Observation Time**: [Hours]

## Interview Responses
[Complete transcript of interview answers, organized by topic]

### Role & Responsibilities
- [What you said about your role]
- [Responsibilities you described]

### Typical Day
- [Your description of daily structure]

### Stated Pain Points
- [Frustrations you mentioned]

### People You Work With
- [Interactions you described]

## Systems & Tools Observed
| System | Observed Usage | Time Logged | Sessions Observed |
|--------|----------------|-------------|-------------------|
| [App]  | [What employee did in it] | [Hours:mins] | [Count] |

## Documented Workflows

### [Task Name 1]
**Observed Frequency**: [How often seen]
**Observed Duration**: [Average time from observations]
**Systems Used**: [List]

**Observed Steps**:
1. [Step description - what was observed]
   - *System*: [App used]
   - *Employee explanation*: [What they said when asked, if applicable]
2. [Step description]
   ...

**Employee Statements About This Task**:
- [Direct quotes or paraphrased explanations from employee]

---

### [Task Name 2]
...

## Time Log

### By Application
| Application | Total Time | Sessions | Average Session |
|-------------|------------|----------|-----------------|
| [App]       | [Time]     | [Count]  | [Time]          |

### By Task
| Task | Occurrences | Total Time | Average Duration |
|------|-------------|------------|------------------|
| [Task] | [Count]   | [Time]     | [Time]           |

## Clarification Q&A Log
[Complete record of questions asked during observation and employee responses]

| Timestamp | Context | Question Asked | Employee Response |
|-----------|---------|----------------|-------------------|
| [Time]    | [What triggered it] | [Question] | [Answer] |

## Raw Data References
- Interview transcript: [link]
- Session logs: [link]
- Screenshot archive: [link]
- Timeline data: [link]
```

**Note**: This documentation contains only observed facts and your statements. It does not include analysis, recommendations, or synthesized insights. You can feed this document to an LLM for analysis, or use it directly for training, handoffs, or automation.

---

## Technical Specification

### Data Model

```typescript
interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  company: string;
  interviewCompleted: boolean;
  observationStartDate: Date | null;
  observationEndDate: Date | null;
}

interface InterviewResponse {
  employeeId: string;
  question: string;
  answer: string;
  timestamp: Date;
}

interface Session {
  id: string;
  employeeId: string;
  startTime: Date;
  endTime: Date | null;
  phase: 'interview' | 'observation';
}

interface Screenshot {
  id: string;
  sessionId: string;
  timestamp: Date;
  imagePath: string;
  activeApplication: string;
  windowTitle: string;
  url?: string;
  aiAnalysis?: string;
}

interface Task {
  id: string;
  sessionId: string;
  name: string;
  startTime: Date;
  endTime: Date;
  duration: number; // seconds
  applications: string[];
  screenshots: string[]; // screenshot IDs
  aiInferredPurpose?: string;
  employeeExplanation?: string;
}

interface ClarificationQuestion {
  id: string;
  sessionId: string;
  timestamp: Date;
  context: string; // What triggered the question
  question: string;
  answer?: string;
  dismissed: boolean;
  answeredAt?: Date;
}

interface WorkflowDocumentation {
  employeeId: string;
  tasks: DocumentedTask[];
  systems: DocumentedSystem[];
  employeeStatements: EmployeeStatement[];
  lastUpdated: Date;
}

interface DocumentedTask {
  name: string;
  observedFrequency: string;
  observedDurations: number[]; // array of observed durations in seconds
  steps: DocumentedStep[];
  systemsUsed: string[];
  employeeExplanations: string[]; // what employee said about this task
}

interface DocumentedStep {
  order: number;
  description: string; // factual description of what was observed
  system?: string;
  employeeExplanation?: string; // what employee said when asked
  observedDuration?: number;
}

interface DocumentedSystem {
  name: string;
  observedUsage: string; // factual description of how it was used
  totalTimeLogged: number; // seconds
  sessionCount: number;
  associatedTasks: string[];
}

interface EmployeeStatement {
  topic: string; // e.g., "pain points", "daily routine", "why they do X"
  statement: string; // verbatim or close paraphrase
  context: string; // when/why they said it
  timestamp: Date;
}

// Context Management Types

interface ImmediateContext {
  recentScreenshots: Screenshot[]; // last 3-6 screenshots
  currentApp: string;
  currentWindowTitle: string;
  lastAppSwitch: Date | null;
  lastSignificantChange: string | null;
}

interface SessionContext {
  sessionId: string;
  startTime: Date;
  tasksSoFar: TaskSummary[];
  appTimeToday: Record<string, number>; // app name -> seconds
  questionsAsked: string[]; // to avoid repeating
  currentTaskTheory: string | null; // what we think they're doing now
  lastSummaryUpdate: Date;
}

interface TaskSummary {
  name: string;
  startTime: Date;
  endTime: Date | null;
  duration: number;
  apps: string[];
  brief: string; // one-line description
}

interface HistoricalContext {
  interviewSummary: string;
  knownTasks: string[]; // task names we've seen before
  previousSessionSummaries: SessionSummary[];
  relevantQA: ClarificationQuestion[]; // past answers that might be relevant
}

interface SessionSummary {
  date: Date;
  duration: number;
  tasksCompleted: string[];
  newObservations: string[]; // things learned this session
  brief: string; // paragraph summary of the session
}
```

### Storage Structure

```
~/.workflow-shadow/
├── config.json              # App configuration
├── profiles/
│   └── [profileId]/
│       ├── profile.json         # User info (role, department, etc.)
│       ├── interview.json       # Interview responses (verbatim)
│       ├── interview-summary.json  # Compressed summary for context loading
│       ├── documentation.json   # Accumulated factual documentation
│       ├── session-summaries.json  # Historical context: summaries of past sessions
│       └── sessions/
│           └── [sessionId]/
│               ├── session.json      # Session metadata
│               ├── session-context.json  # Current session context (updates live)
│               ├── screenshots/      # Screenshot images (immediate context source)
│               ├── tasks.json        # Detected tasks (factual)
│               ├── questions.json    # Clarification Q&A (verbatim)
│               └── timeline.json     # Activity timeline
└── exports/
    └── [profileId]-[date].md       # Generated documentation (no synthesis)
```

### AI Integration

#### Model Requirements
- Vision capability (screenshot analysis)
- Long context (accumulate knowledge across sessions)
- Structured output (JSON for data, Markdown for docs)

#### Context Management

The LLM needs different levels of context to ask relevant questions and document accurately:

**1. Immediate Context (last ~60 seconds)**
- Last 3-6 screenshots (raw images)
- Current active application + window title
- What just changed (app switch, significant UI change)
- Used for: "I just saw you do X, why?"

**2. Session Context (current work session)**
- Summary of tasks completed so far today
- Applications used and time in each
- Questions already asked (avoid repeating)
- Current "working theory" of what task they're doing
- Used for: "You've been in Excel for 20 minutes, is this the same report from earlier?"

**3. Historical Context (previous sessions)**
- Accumulated workflow documentation from past days
- Known tasks and their typical patterns
- Previous Q&A responses
- Used for: "Yesterday you did this differently, is today an exception?"

**Context Assembly per LLM Call:**
```
Each observation call includes:
├── Immediate: Last N screenshots (images)
├── Session: Today's activity summary (text, ~500 tokens)
├── Historical: Relevant workflow excerpts (text, ~1000 tokens)
└── Interview: Role baseline from initial interview (~500 tokens)
```

**Session Summary Updates:**
- Every 5 minutes (or on task boundary), update session summary
- Summarize: what tasks were done, time spent, any questions asked
- This compressed summary replaces raw screenshot history

**Cross-Session Persistence:**
- On session end: generate session summary, append to documentation
- On session start: load interview data + accumulated documentation
- The LLM doesn't see raw screenshots from yesterday, only summaries

#### System Prompts

**Interview Phase Prompt**:
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
Once you feel you have a solid baseline understanding, indicate you're
ready to move to observation mode.
```

**Observation Phase Prompt**:
```
You are observing the user's screen to document their workflow.

CONTEXT PROVIDED:
- Interview baseline: {interviewSummary}
- Today so far: {sessionContext}
- Previous sessions: {historicalContext}
- Recent activity: [last N screenshots attached]

Analyze the current screenshot to understand:
- What application/system they're using
- What task they appear to be doing
- How this relates to what they were just doing
- Whether this matches patterns from previous sessions

Only ask a question if you're genuinely confused about:
- Why they're doing something a particular way
- What the purpose of an action is
- Why they switched between systems
- Something that differs from their usual pattern

When asking questions, be brief and specific. Reference what you observed.
Do not interrupt for things you can reasonably infer.
Do not repeat questions you've already asked this session.

Update your task tracking and session summary as needed.
```

**Documentation Generation Prompt**:
```
Generate comprehensive workflow documentation based on accumulated
observations and interview data.

Document factually:
1. What tasks the user performs
2. How they perform each task (step by step)
3. What systems are involved
4. How long things take (from observations)
5. What the user said about WHY things are done certain ways
6. Pain points the user stated (verbatim or paraphrased)
7. Workarounds you observed and user explanations for them

DO NOT include:
- Recommendations or suggested improvements
- Automation opportunities or optimization ideas
- Prioritization or ranking of issues
- Any prescriptive analysis

Output in clean markdown format. Be thorough and factual.
The user will use this documentation for their own purposes.
```

---

## UI/UX Specification

### Window Behavior

#### Interview Mode
- **Size**: 600x500 (centered on screen)
- **Appearance**: Clean, friendly, conversational
- **Elements**:
  - AI message bubble
  - Text input for responses
  - Progress indicator (questions answered)
  - "I'm ready to observe" button (appears when AI is satisfied)

#### Observation Mode
- **Size**: 400x100 (top-right corner, minimal)
- **Appearance**: Subtle, unobtrusive
- **Elements**:
  - Status indicator ("Observing...")
  - Time elapsed
  - Hide button
- **When asking questions**:
  - Expands to 500x200
  - Shows context + question
  - Text input for response
  - Dismiss button

#### Keyboard Shortcuts
| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| Toggle visibility | Cmd+\ | Ctrl+\ |
| Move window | Alt+Arrow | Ctrl+Arrow |
| Quick response | Cmd+Enter | Ctrl+Enter |

### User Experience Flow

```
[Install] → [Launch] → [Welcome Screen] → [Interview ~20min]
                                              ↓
[Observation Active] ←─── [Occasional Questions] ───→ [Continue Working]
       ↓
[Session End] → [Auto-save] → [Resume Next Day]
       ↓
[Export Documentation]
```

---

## Implementation Phases

### Phase 1: Strip & Simplify (Week 1)
Remove unused features from original codebase:
- [ ] Remove audio capture (system audio, microphone)
- [ ] Remove audio playback/TTS
- [ ] Remove all "assistance" prompts (interview, sales, exam, etc.)
- [ ] Remove Google Search integration
- [ ] Remove rate limiting UI
- [ ] Remove emergency erase
- [ ] Simplify settings (remove audio-related options)

### Phase 2: Core Observation (Week 2-3)
Build observation infrastructure:
- [ ] Application tracking (active window, title)
- [ ] Automatic screenshot capture with intervals
- [ ] Task boundary detection
- [ ] Time tracking per application/task
- [ ] Local storage structure for sessions

### Phase 3: Interview Flow (Week 3-4)
Build interview mode:
- [ ] Welcome/introduction screen
- [ ] Conversational interview UI
- [ ] Interview data storage
- [ ] Transition logic to observation mode
- [ ] Profile management

### Phase 4: Intelligent Questioning (Week 4-5)
Build confusion detection:
- [ ] AI analysis of screenshots for context
- [ ] Pattern detection for unusual behavior
- [ ] Question generation with context
- [ ] Subtle question overlay UI
- [ ] Q&A storage and linking to observations

### Phase 5: Documentation Generation (Week 5-6)
Build export functionality:
- [ ] Documentation aggregation across sessions
- [ ] Markdown template generation
- [ ] Time log compilation
- [ ] Statement/explanation organization
- [ ] Export to file (factual documentation only)

### Phase 6: Polish (Week 6+)
- [ ] Dashboard for reviewing collected data
- [ ] Multiple profile support (if user has multiple roles)
- [ ] Refinement of AI prompts based on testing
- [ ] Cross-platform testing

---

## What to Remove (from original codebase)

### Files to Delete
- `src/assets/SystemAudioDump` (macOS audio binary)
- Audio-related utilities in `src/utils/`

### Features to Remove
1. **Audio capture** - All system audio and microphone functionality
2. **Audio playback** - TTS responses
3. **Assistance profiles** - All 6 prompts (interview, sales, meeting, presentation, negotiation, exam)
4. **Google Search** - Tool integration
5. **Rate limiting** - Flash/FlashLite usage tracking UI
6. **Emergency erase** - Less critical for this use case
7. **Compact mode** - Simplify to single layout

### Code Areas to Strip
- `src/handlers/audio*` - Audio handling
- `src/components/*` - Assistance-related components
- Profile/prompt selection UI
- Answer generation and display logic

---

## What to Add

### New Data Layer
1. **Profile management** - CRUD for user profile/role info
2. **Session management** - Start/stop/resume observations
3. **Documentation accumulation** - Persist observations across sessions
4. **Application tracking** - Window/app detection
5. **Task detection** - Boundary inference logic

### New UI Components
1. **Interview chat UI** - Conversational interview flow
2. **Observation status bar** - Minimal observation indicator
3. **Question overlay** - Subtle clarification UI
4. **Documentation preview** - Review before export

### New AI Integration
1. **Interview conductor** - Drives initial questioning
2. **Screenshot analyzer** - Understands what's happening (for documentation)
3. **Confusion detector** - Decides when to ask clarifying questions
4. **Documentation generator** - Produces factual workflow documentation (no recommendations)

### New Export
1. **Markdown generator** - Structured documentation output
2. **Knowledge aggregator** - Combines sessions into coherent picture

---

## What to Modify

### Window Behavior
- **Original**: Prominent overlay for displaying answers
- **New**: Minimal observation indicator, expands only for questions

### AI Purpose
- **Original**: "Help me cheat" - provide answers
- **New**: "Help me document" - ask questions, generate documentation

### Data Flow
- **Original**: Session-based, ephemeral
- **New**: Accumulated documentation across sessions

### User Interaction
- **Original**: User asks, AI answers
- **New**: AI observes, AI asks (occasionally), AI documents

### Settings
- **Original**: Audio modes, profiles, quality settings
- **New**: Screenshot interval, question frequency, profile selection

---

## Success Metrics

For the tool to be successful, it should:

1. **Minimize disruption**: <5 questions per hour during observation
2. **Capture comprehensive workflows**: Document 90%+ of tasks described in interview
3. **Record complete context**: Capture explanations for observed behaviors
4. **Generate thorough documentation**: Output contains all information needed to understand the role
5. **Be invisible when needed**: User should forget it's running most of the time

---

## Open Questions

1. **Multi-monitor support**: Should we capture all monitors or just primary?
2. **Sensitive data handling**: How to handle when user views sensitive data (PII, passwords)?
3. **Network/cloud sync**: Should data sync anywhere, or strictly local?
4. **Session resumption**: How to handle multi-day observations elegantly?

---

## Appendix: Original Feature Reference

Features from original "Cheating Daddy" app and their disposition:

| Feature | Original Purpose | Disposition |
|---------|-----------------|-------------|
| Screen capture | See what user sees | **KEEP** - Core functionality |
| Invisible window | Hide from screen share | **KEEP** - Unobtrusive observation |
| System audio | Hear interview questions | **REMOVE** - Not needed |
| Microphone | Hear user responses | **REMOVE** - Text input sufficient |
| TTS playback | Speak answers aloud | **REMOVE** - No answers to speak |
| Interview prompt | Answer interview Qs | **REMOVE** - Replaced with discovery |
| Sales prompt | Handle sales calls | **REMOVE** - Not applicable |
| Exam prompt | Answer exam Qs | **REMOVE** - Not applicable |
| Google Search | Find recent info | **REMOVE** - Not needed |
| Emergency erase | Hide evidence | **REMOVE** - Less critical |
| Keyboard shortcuts | Control overlay | **MODIFY** - Simplify |
| Settings panel | Configure behavior | **MODIFY** - Different options |
| History | Review past sessions | **MODIFY** - Per-session organization |
