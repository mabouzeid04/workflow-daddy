# Workflow Daddy: How It Works

## Purpose

Workflow Daddy is a **workflow documentation tool**. Its job is to:

1. Learn about your current job through an interview
2. Observe you working via screen capture
3. Ask clarifying questions when confused
4. Generate documentation of your workflows, processes, tools, and decisions

The final output is a document that could be handed to an AI to replicate or assist with your job.

---

## The Flow

### Phase 1: Interview

**What happens:**
- User clicks "Start"
- App shows the Interview View - a chat interface
- AI asks one question at a time about the user's job
- Questions cover: job title, daily work, tools, tasks, decisions, pain points, collaborators

**AI behavior:**
- Short responses (max 2 sentences)
- Brief acknowledgment ("Got it.", "Okay.") + one question
- No lists, no bullets, no praise, no summarizing
- Adapts questions based on answers

**How it ends:**
- After 10-15 exchanges, AI says: "I think I have a good picture. Ready to start observing?"
- Interview data is saved and summarized for context

**Files involved:**
- `src/components/views/InterviewView.js` - Chat UI
- `src/utils/interview.js` - Interview logic and AI calls
- `src/utils/prompts.js` - System prompts

---

### Phase 2: Transition

**What happens:**
- After interview completes, Transition View appears
- Explains what's about to happen:
  - "I'll watch your screen as you work"
  - "I'll ask when I don't understand something"
  - "Questions will appear as notifications"
- User clicks "Start Observing"

**What it triggers:**
1. Starts observation mode (screen capture, context tracking)
2. Minimizes app to system tray
3. User continues working normally

**Files involved:**
- `src/components/views/TransitionView.js` - Transition UI
- `src/components/app/WorkflowDaddyApp.js` - Flow control

---

### Phase 3: Observation

**What happens:**
- App runs in background (system tray)
- Takes periodic screenshots
- Tracks active applications and windows
- Analyzes what user is doing using interview context as baseline

**Screen capture:**
- Configurable interval (default: every few seconds)
- Configurable quality
- Screenshots stored with metadata (timestamp, active app, window title)

**Context tracking:**
- Immediate context: current screenshot, active app
- Session context: accumulated observations
- Historical context: previous sessions for this profile

**Files involved:**
- `src/utils/capture.js` - Screen capture
- `src/utils/context.js` - Context assembly
- `src/components/views/ObservationView.js` - Compact observation UI
- `src/utils/tray.js` - System tray

---

### Phase 4: Confusion Detection & Questions

**What happens:**
- AI periodically analyzes screenshots against interview context
- When confused about what user is doing, generates a question
- Question appears as notification (when app hidden) or overlay (when visible)

**Confusion types:**
- `unfamiliar_app` - App not mentioned in interview
- `unclear_purpose` - Can't infer what task this serves
- `repeated_action` - User doing same thing multiple times
- `multi_system` - Switching between apps for one goal
- `pattern_deviation` - Different from previous sessions
- `manual_entry` - Typing data that might exist elsewhere
- `error_state` - User encountering problems

**Question UI:**
- Native macOS notification when app is hidden
- Click notification to open app and answer
- Can answer, skip, or defer questions

**Files involved:**
- `src/utils/confusion.js` - Confusion detection logic
- `src/components/overlays/QuestionOverlay.js` - Question UI
- `src/index.js` - Native notifications

---

### Phase 5: Task Detection

**What happens:**
- AI identifies distinct tasks during observation
- Groups related screenshots into tasks
- Infers task names from activity
- Tracks task switches

**Task structure:**
- Task name (inferred or user-provided)
- Start/end timestamps
- Associated screenshots
- Steps identified

**Files involved:**
- `src/utils/taskDetection.js` - Task detection logic

---

### Phase 6: Documentation Generation

**What happens:**
- User can export documentation at any time
- Aggregates:
  - Interview summary (role, responsibilities, tools)
  - Observed tasks and their steps
  - Q&A from confusion questions
  - Tool/app usage patterns

**Output format:**
- Structured document suitable for AI consumption
- Describes workflows, processes, decision points
- Can be used to train/prompt an AI to replicate or assist with the job

**Files involved:**
- `src/utils/documentation.js` - Documentation generation

---

## Data Storage

All data stored in:
- macOS: `~/Library/Application Support/workflow-daddy-config/`
- Windows: `%APPDATA%/workflow-daddy-config/`
- Linux: `~/.config/workflow-daddy-config/`

**Structure:**
```
workflow-daddy-config/
├── config.json           # App configuration
├── credentials.json      # API keys
├── preferences.json      # User preferences
├── profiles/
│   └── interview/
│       ├── profile.json      # Profile metadata
│       ├── interview.json    # Interview session data
│       └── interview-summary.json  # Compressed summary
├── sessions/
│   └── [session-id]/
│       ├── screenshots/      # Captured screenshots
│       ├── screenshots.json  # Screenshot metadata
│       ├── app-usage.json    # App usage records
│       ├── tasks.json        # Detected tasks
│       └── questions.json    # Q&A history
└── history/              # Session history
```

---

## Key Interactions

### User → App
- Answers interview questions
- Answers clarifying questions during observation
- Pauses/resumes observation
- Exports documentation

### App → AI (Gemini)
- Interview conversation (text)
- Screenshot analysis (vision)
- Confusion detection (vision + context)
- Task inference (vision + context)
- Summary generation (text)

### App → System
- Screen capture (screenshots)
- Active window detection
- System tray integration
- Native notifications

---

## API Usage

Uses Google Gemini API:
- Model: `gemini-2.5-flash`
- Interview: Text generation
- Observation: Vision + text (screenshot analysis)

User provides their own API key in settings.

---

## Summary

1. **Interview** - Learn about your job (5-10 minutes)
2. **Transition** - Explain what's next
3. **Observe** - Watch you work (runs in background)
4. **Question** - Ask when confused (notifications)
5. **Document** - Generate workflow documentation

The goal: Create a document that captures your job well enough that an AI could understand and potentially help automate parts of it.
