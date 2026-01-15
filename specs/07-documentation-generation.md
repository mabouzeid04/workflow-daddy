# Feature Spec: Documentation Generation

## Overview
Compiles all observations, interview data, and Q&A into a comprehensive markdown document that captures the user's workflow.

## Responsibilities
- Aggregate data across all sessions
- Structure into readable documentation
- Calculate time statistics
- Organize workflows by task
- Export to markdown file

## Key Principle: No Synthesis

This feature produces **factual documentation only**:
- What was observed
- What the user said
- Time measurements
- System/app usage

It does NOT produce:
- Recommendations
- Automation opportunities
- Prioritized improvements
- Analysis or insights

## Data Inputs

```typescript
interface DocumentationInputs {
  profile: Profile;
  interviewData: InterviewSession;
  interviewSummary: InterviewSummary;
  sessions: Session[];
  allTasks: Task[];
  allQuestions: ClarificationQuestion[];
  appUsage: AppUsageAggregate[];
}

interface AppUsageAggregate {
  app: string;
  totalTime: number; // seconds across all sessions
  sessionCount: number;
  taskCount: number;
  averageSessionTime: number;
}
```

## Output Structure

```markdown
# [Role Name] Workflow Documentation

## Role Overview
- **Title**: [Job Title]
- **Department**: [Department]
- **Reports To**: [Manager/Role]
- **Observation Period**: [Start Date] - [End Date]
- **Total Observation Time**: [Hours]

## Interview Responses
[Organized transcript of interview]

### Role & Responsibilities
- [What user said about their role]

### Typical Day
- [User's description]

### Stated Pain Points
- [Frustrations mentioned]

### People You Work With
- [Interactions described]

## Systems & Tools Observed
| System | Observed Usage | Time Logged | Sessions |
|--------|----------------|-------------|----------|

## Documented Workflows

### [Task Name 1]
**Observed Frequency**: X times over Y sessions
**Observed Duration**: Average Z minutes (range: A-B)
**Systems Used**: [List]

**Observed Steps**:
1. [Step]
2. [Step]

**Your Statements About This Task**:
- [Quotes from Q&A]

---
(repeat for each task)

## Time Log

### By Application
| Application | Total Time | Sessions | Avg Session |
|-------------|------------|----------|-------------|

### By Task
| Task | Occurrences | Total Time | Avg Duration |
|------|-------------|------------|--------------|

## Clarification Q&A Log
| Date | Context | Question | Response |
|------|---------|----------|----------|

## Session Log
| Session | Date | Duration | Tasks | Questions |
|---------|------|----------|-------|-----------|

## Raw Data References
- Interview transcript: [path]
- Session data: [path]
- Screenshots: [path]
```

## Core Functions

### Data Aggregation

#### `aggregateSessions(profileId: string): DocumentationInputs`
- Load all sessions for profile
- Combine task lists
- Combine Q&A lists
- Calculate app usage aggregates

#### `aggregateAppUsage(sessions: Session[], tasks: Task[]): AppUsageAggregate[]`
- Sum time per app across sessions
- Count sessions and tasks per app
- Calculate averages

#### `groupTasksByType(tasks: Task[]): Map<string, Task[]>`
- Group similar tasks together
- Use task names and apps to cluster
- Return grouped tasks

### Content Generation

#### `generateRoleOverview(profile: Profile, sessions: Session[]): string`
- Basic metadata
- Observation period
- Total time

#### `generateInterviewSection(interview: InterviewSession, summary: InterviewSummary): string`
- Organize interview by topic
- Use summary structure
- Include relevant quotes

#### `generateSystemsTable(appUsage: AppUsageAggregate[]): string`
- Sort by time spent
- Format as markdown table
- Include usage descriptions from context

#### `generateWorkflowSection(taskGroup: Task[], questions: ClarificationQuestion[]): string`
- For each task type:
  - Calculate frequency and duration
  - List systems used
  - Describe observed steps
  - Include relevant Q&A

#### `generateTimeLog(appUsage: AppUsageAggregate[], tasks: Task[]): string`
- By-app breakdown table
- By-task breakdown table

#### `generateQALog(questions: ClarificationQuestion[]): string`
- Chronological Q&A table
- Include context for each

### Document Assembly

#### `generateDocumentation(inputs: DocumentationInputs): string`
- Call all section generators
- Assemble into full markdown
- Add metadata and references

#### `exportDocumentation(profileId: string, outputPath?: string): string`
- Generate documentation
- Write to file
- Return file path

Default path: `~/.workflow-shadow/exports/[profileId]-[date].md`

## Workflow Step Inference

Since we observe screenshots, we need to infer steps:

#### `inferWorkflowSteps(task: Task, screenshots: Screenshot[]): WorkflowStep[]`
- Analyze screenshots from task
- Identify distinct actions
- Order chronologically
- Don't over-detail (high-level steps only)

**Step Inference Prompt:**
```
Based on these screenshots from a single task, describe the high-level
steps the user took. Be factual - describe what you observed, not what
you think should happen.

Task name: {taskName}
Duration: {duration}
Apps used: {apps}

Screenshots: [attached]

Output JSON array of steps:
[
  {
    "order": 1,
    "description": "Opened Excel spreadsheet 'Inventory.xlsx'",
    "app": "Microsoft Excel",
    "duration_estimate": "2 minutes"
  },
  ...
]

Keep steps high-level (5-10 steps max). Focus on what was done, not
minute details.
```

## Statistics Calculations

```typescript
function calculateTaskStats(tasks: Task[]): TaskStats {
  return {
    occurrences: tasks.length,
    totalTime: sum(tasks.map(t => t.duration)),
    avgDuration: average(tasks.map(t => t.duration)),
    minDuration: min(tasks.map(t => t.duration)),
    maxDuration: max(tasks.map(t => t.duration)),
    appsUsed: unique(tasks.flatMap(t => t.applications.map(a => a.app)))
  };
}

function calculateAppStats(appUsage: AppUsageAggregate[]): AppStats {
  const total = sum(appUsage.map(a => a.totalTime));
  return appUsage.map(a => ({
    ...a,
    percentOfTotal: (a.totalTime / total) * 100
  }));
}
```

## Export Formats

### MVP: Markdown
- Single .md file
- Human-readable
- Can be fed to other LLMs

### Future Considerations
- JSON export (structured data)
- HTML export (styled, shareable)
- PDF export

## Events

- `documentation:generating` - Generation started
- `documentation:complete` - Generation finished
- `documentation:exported` - File written

## UI Touchpoints

### Export Button
- "Generate Documentation"
- Shows progress during generation
- Opens file location when done

### Preview (Optional)
- Show documentation preview before export
- Allow re-generation if needed

## Dependencies
- All other features (provides the data)
- LLM API (for step inference, section generation)
- File system (for export)

## Out of Scope
- Real-time documentation updates (batch generation only)
- Collaborative editing
- Version history
- Analysis/recommendations (explicitly excluded)
