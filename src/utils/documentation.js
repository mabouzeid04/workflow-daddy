// documentation.js - Documentation Generation Service
// Compiles all observations, interview data, and Q&A into comprehensive markdown documentation

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { GoogleGenAI } = require('@google/genai');
const storage = require('../storage');

// Event emitter for documentation events
const documentationEvents = new EventEmitter();

// ============================================================================
// Type Definitions (JSDoc)
// ============================================================================

/**
 * @typedef {Object} AppUsageAggregate
 * @property {string} app - Application name
 * @property {number} totalTime - Total time in seconds across all sessions
 * @property {number} sessionCount - Number of sessions app was used in
 * @property {number} taskCount - Number of tasks app was used in
 * @property {number} averageSessionTime - Average time per session
 */

/**
 * @typedef {Object} TaskStats
 * @property {number} occurrences - Number of times task occurred
 * @property {number} totalTime - Total time spent on task in seconds
 * @property {number} avgDuration - Average duration per occurrence
 * @property {number} minDuration - Minimum duration
 * @property {number} maxDuration - Maximum duration
 * @property {string[]} appsUsed - List of apps used for this task
 */

/**
 * @typedef {Object} DocumentationInputs
 * @property {Object} profile - User profile
 * @property {Object} interviewData - Interview session data
 * @property {Object} interviewSummary - Interview summary
 * @property {Object[]} sessions - All observation sessions
 * @property {Object[]} allTasks - All tasks from all sessions
 * @property {Object[]} allQuestions - All clarification questions
 * @property {AppUsageAggregate[]} appUsage - Aggregated app usage stats
 */

/**
 * @typedef {Object} WorkflowStep
 * @property {number} order - Step order
 * @property {string} description - Step description
 * @property {string} app - Application used
 * @property {string} durationEstimate - Estimated duration
 */

// ============================================================================
// Constants
// ============================================================================

const EXPORTS_DIR = path.join(os.homedir(), '.workflow-shadow', 'exports');

// ============================================================================
// Data Aggregation Functions
// ============================================================================

/**
 * Aggregate all data for a profile
 * @param {string} profileId - Profile ID
 * @returns {DocumentationInputs}
 */
function aggregateSessions(profileId) {
    // Load profile
    const profile = storage.getProfile(profileId);
    if (!profile) {
        throw new Error(`Profile not found: ${profileId}`);
    }

    // Load interview data
    const interviewData = storage.getInterviewSession(profileId);
    const interviewSummary = storage.getInterviewSummary(profileId);

    // Load all observation sessions
    const sessions = storage.getProfileSessions(profileId);

    // Aggregate all tasks from all sessions
    const allTasks = [];
    for (const session of sessions) {
        const sessionTasks = storage.getSessionTasks(session.id);
        for (const task of sessionTasks) {
            allTasks.push({
                ...task,
                sessionId: session.id,
                sessionDate: session.startTime
            });
        }
    }

    // Aggregate all questions from all sessions
    const allQuestions = [];
    for (const session of sessions) {
        const sessionQuestions = storage.getSessionQuestions(session.id);
        for (const question of sessionQuestions) {
            if (question.status === 'answered') {
                allQuestions.push({
                    ...question,
                    sessionId: session.id,
                    sessionDate: session.startTime
                });
            }
        }
    }

    // Calculate app usage aggregates
    const appUsage = aggregateAppUsage(sessions, allTasks);

    return {
        profile,
        interviewData,
        interviewSummary,
        sessions,
        allTasks,
        allQuestions,
        appUsage
    };
}

/**
 * Aggregate app usage across sessions and tasks
 * @param {Object[]} sessions - All sessions
 * @param {Object[]} tasks - All tasks
 * @returns {AppUsageAggregate[]}
 */
function aggregateAppUsage(sessions, tasks) {
    const appMap = new Map();

    // Process tasks to get app usage
    for (const task of tasks) {
        if (!task.applications) continue;

        for (const appSegment of task.applications) {
            const appName = appSegment.app;
            if (!appName) continue;

            if (!appMap.has(appName)) {
                appMap.set(appName, {
                    app: appName,
                    totalTime: 0,
                    sessionIds: new Set(),
                    taskIds: new Set()
                });
            }

            const appData = appMap.get(appName);
            appData.totalTime += appSegment.duration || 0;
            if (task.sessionId) {
                appData.sessionIds.add(task.sessionId);
            }
            appData.taskIds.add(task.id);
        }
    }

    // Also process app usage records from sessions
    for (const session of sessions) {
        const appRecords = storage.getAppUsageRecords(session.id);
        for (const record of appRecords) {
            const appName = record.app || record.activeApp;
            if (!appName) continue;

            if (!appMap.has(appName)) {
                appMap.set(appName, {
                    app: appName,
                    totalTime: 0,
                    sessionIds: new Set(),
                    taskIds: new Set()
                });
            }

            const appData = appMap.get(appName);
            appData.totalTime += record.duration || 0;
            appData.sessionIds.add(session.id);
        }
    }

    // Convert to array and calculate averages
    const result = [];
    for (const [appName, data] of appMap) {
        const sessionCount = data.sessionIds.size;
        result.push({
            app: appName,
            totalTime: data.totalTime,
            sessionCount,
            taskCount: data.taskIds.size,
            averageSessionTime: sessionCount > 0 ? Math.round(data.totalTime / sessionCount) : 0
        });
    }

    // Sort by total time descending
    result.sort((a, b) => b.totalTime - a.totalTime);

    return result;
}

/**
 * Group tasks by their name/type
 * @param {Object[]} tasks - All tasks
 * @returns {Map<string, Object[]>}
 */
function groupTasksByType(tasks) {
    const grouped = new Map();

    for (const task of tasks) {
        const taskName = task.name || 'Unnamed task';

        // Normalize task name for grouping
        const normalizedName = normalizeTaskName(taskName);

        if (!grouped.has(normalizedName)) {
            grouped.set(normalizedName, []);
        }
        grouped.get(normalizedName).push(task);
    }

    return grouped;
}

/**
 * Normalize task name for grouping similar tasks
 * @param {string} name - Task name
 * @returns {string}
 */
function normalizeTaskName(name) {
    return name
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

// ============================================================================
// Statistics Calculations
// ============================================================================

/**
 * Calculate statistics for a group of tasks
 * @param {Object[]} tasks - Tasks to analyze
 * @returns {TaskStats}
 */
function calculateTaskStats(tasks) {
    if (!tasks || tasks.length === 0) {
        return {
            occurrences: 0,
            totalTime: 0,
            avgDuration: 0,
            minDuration: 0,
            maxDuration: 0,
            appsUsed: []
        };
    }

    const durations = tasks.map(t => t.duration || 0).filter(d => d > 0);
    const allApps = new Set();

    for (const task of tasks) {
        if (task.applications) {
            for (const app of task.applications) {
                if (app.app) {
                    allApps.add(app.app);
                }
            }
        }
    }

    return {
        occurrences: tasks.length,
        totalTime: durations.reduce((sum, d) => sum + d, 0),
        avgDuration: durations.length > 0
            ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
            : 0,
        minDuration: durations.length > 0 ? Math.min(...durations) : 0,
        maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
        appsUsed: Array.from(allApps)
    };
}

/**
 * Calculate total observation time from sessions
 * @param {Object[]} sessions - All sessions
 * @returns {number} Total time in seconds
 */
function calculateTotalObservationTime(sessions) {
    let total = 0;
    for (const session of sessions) {
        total += session.totalActiveTime || 0;
    }
    return total;
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format duration in human-readable form
 * @param {number} seconds - Duration in seconds
 * @returns {string}
 */
function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '0s';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @returns {string}
 */
function formatDate(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Format datetime for display
 * @param {Date|string} date - Date to format
 * @returns {string}
 */
function formatDateTime(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Escape markdown special characters
 * @param {string} text - Text to escape
 * @returns {string}
 */
function escapeMarkdown(text) {
    if (!text) return '';
    return text
        .replace(/\|/g, '\\|')
        .replace(/\n/g, ' ');
}

// ============================================================================
// Section Generators
// ============================================================================

/**
 * Generate role overview section
 * @param {Object} profile - Profile data
 * @param {Object} interviewSummary - Interview summary
 * @param {Object[]} sessions - All sessions
 * @returns {string}
 */
function generateRoleOverview(profile, interviewSummary, sessions) {
    const totalTime = calculateTotalObservationTime(sessions);

    // Get observation period
    let startDate = null;
    let endDate = null;
    for (const session of sessions) {
        const sessionStart = new Date(session.startTime);
        const sessionEnd = session.endTime ? new Date(session.endTime) : sessionStart;

        if (!startDate || sessionStart < startDate) {
            startDate = sessionStart;
        }
        if (!endDate || sessionEnd > endDate) {
            endDate = sessionEnd;
        }
    }

    const roleTitle = interviewSummary?.role || profile?.name || 'Unknown Role';
    const department = interviewSummary?.department || 'N/A';
    const reportsTo = interviewSummary?.reportsTo || 'N/A';

    return `## Role Overview

- **Title**: ${roleTitle}
- **Department**: ${department}
- **Reports To**: ${reportsTo}
- **Observation Period**: ${formatDate(startDate)} - ${formatDate(endDate)}
- **Total Observation Time**: ${formatDuration(totalTime)}
- **Sessions Recorded**: ${sessions.length}
`;
}

/**
 * Generate interview section
 * @param {Object} interviewData - Interview session data
 * @param {Object} interviewSummary - Interview summary
 * @returns {string}
 */
function generateInterviewSection(interviewData, interviewSummary) {
    if (!interviewData && !interviewSummary) {
        return `## Interview Responses

*No interview data available.*
`;
    }

    let content = `## Interview Responses

`;

    // Add summary sections
    if (interviewSummary) {
        content += `### Role & Responsibilities
`;
        if (interviewSummary.responsibilities && interviewSummary.responsibilities.length > 0) {
            for (const resp of interviewSummary.responsibilities) {
                content += `- ${resp}\n`;
            }
        } else {
            content += `*Not discussed in interview*\n`;
        }
        content += '\n';

        content += `### Typical Day
`;
        content += interviewSummary.typicalDay
            ? `${interviewSummary.typicalDay}\n\n`
            : `*Not discussed in interview*\n\n`;

        content += `### Stated Pain Points
`;
        if (interviewSummary.statedPainPoints && interviewSummary.statedPainPoints.length > 0) {
            for (const pain of interviewSummary.statedPainPoints) {
                content += `- ${pain}\n`;
            }
        } else {
            content += `*None mentioned*\n`;
        }
        content += '\n';

        content += `### People You Work With
`;
        if (interviewSummary.interactions && interviewSummary.interactions.length > 0) {
            for (const interaction of interviewSummary.interactions) {
                content += `- ${interaction}\n`;
            }
        } else {
            content += `*Not discussed*\n`;
        }
        content += '\n';
    }

    // Add interview transcript excerpts
    if (interviewData && interviewData.messages && interviewData.messages.length > 0) {
        content += `### Interview Transcript

<details>
<summary>Click to expand full interview transcript</summary>

`;
        for (const msg of interviewData.messages) {
            const role = msg.role === 'ai' ? 'Interviewer' : 'User';
            const timestamp = formatDateTime(msg.timestamp);
            content += `**${role}** (${timestamp}):\n${msg.content}\n\n`;
        }
        content += `</details>\n\n`;
    }

    return content;
}

/**
 * Generate systems/tools table
 * @param {AppUsageAggregate[]} appUsage - App usage aggregates
 * @returns {string}
 */
function generateSystemsTable(appUsage) {
    if (!appUsage || appUsage.length === 0) {
        return `## Systems & Tools Observed

*No system usage data recorded.*
`;
    }

    let content = `## Systems & Tools Observed

| System | Time Logged | Sessions | Tasks |
|--------|-------------|----------|-------|
`;

    for (const app of appUsage) {
        content += `| ${escapeMarkdown(app.app)} | ${formatDuration(app.totalTime)} | ${app.sessionCount} | ${app.taskCount} |\n`;
    }

    content += '\n';
    return content;
}

/**
 * Generate workflow section for a task group
 * @param {string} taskName - Task name
 * @param {Object[]} tasks - Tasks in this group
 * @param {Object[]} questions - Related Q&A
 * @returns {string}
 */
function generateWorkflowSection(taskName, tasks, questions) {
    const stats = calculateTaskStats(tasks);

    // Get the display name (capitalize first letter of each word)
    const displayName = taskName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    let content = `### ${displayName}

**Observed Frequency**: ${stats.occurrences} time${stats.occurrences !== 1 ? 's' : ''} over ${new Set(tasks.map(t => t.sessionId)).size} session${new Set(tasks.map(t => t.sessionId)).size !== 1 ? 's' : ''}
**Observed Duration**: Average ${formatDuration(stats.avgDuration)}`;

    if (stats.minDuration !== stats.maxDuration) {
        content += ` (range: ${formatDuration(stats.minDuration)} - ${formatDuration(stats.maxDuration)})`;
    }
    content += `
**Systems Used**: ${stats.appsUsed.length > 0 ? stats.appsUsed.join(', ') : 'N/A'}

`;

    // Add observed steps if available
    const stepsFromTasks = extractStepsFromTasks(tasks);
    if (stepsFromTasks.length > 0) {
        content += `**Observed Steps**:
`;
        for (let i = 0; i < stepsFromTasks.length; i++) {
            content += `${i + 1}. ${stepsFromTasks[i]}\n`;
        }
        content += '\n';
    }

    // Add related Q&A
    const relatedQA = findRelatedQuestions(tasks, questions);
    if (relatedQA.length > 0) {
        content += `**Your Statements About This Task**:
`;
        for (const qa of relatedQA) {
            content += `- *"${qa.question}"* — "${qa.answer}"\n`;
        }
        content += '\n';
    }

    content += '---\n\n';
    return content;
}

/**
 * Extract steps from task application segments
 * @param {Object[]} tasks - Tasks to analyze
 * @returns {string[]}
 */
function extractStepsFromTasks(tasks) {
    const steps = [];
    const seenApps = new Set();

    // Take the most detailed task (most app segments)
    const sortedTasks = [...tasks].sort((a, b) =>
        (b.applications?.length || 0) - (a.applications?.length || 0)
    );

    const representativeTask = sortedTasks[0];
    if (!representativeTask || !representativeTask.applications) {
        return steps;
    }

    for (const app of representativeTask.applications) {
        if (!seenApps.has(app.app)) {
            seenApps.add(app.app);
            const title = app.windowTitle ? ` (${app.windowTitle})` : '';
            steps.push(`Worked in ${app.app}${title}`);
        }
    }

    return steps;
}

/**
 * Find questions related to specific tasks
 * @param {Object[]} tasks - Tasks to match
 * @param {Object[]} questions - All questions
 * @returns {Object[]}
 */
function findRelatedQuestions(tasks, questions) {
    const related = [];
    const taskIds = new Set(tasks.map(t => t.id));
    const sessionIds = new Set(tasks.map(t => t.sessionId));

    for (const question of questions) {
        // Check if question was asked during one of these task sessions
        if (sessionIds.has(question.sessionId) && question.answer) {
            related.push(question);
        }
    }

    return related;
}

/**
 * Generate time log section
 * @param {AppUsageAggregate[]} appUsage - App usage aggregates
 * @param {Object[]} tasks - All tasks
 * @returns {string}
 */
function generateTimeLog(appUsage, tasks) {
    let content = `## Time Log

### By Application

| Application | Total Time | Sessions | Avg Session |
|-------------|------------|----------|-------------|
`;

    for (const app of appUsage) {
        content += `| ${escapeMarkdown(app.app)} | ${formatDuration(app.totalTime)} | ${app.sessionCount} | ${formatDuration(app.averageSessionTime)} |\n`;
    }

    content += '\n### By Task\n\n';
    content += '| Task | Occurrences | Total Time | Avg Duration |\n';
    content += '|------|-------------|------------|--------------||\n';

    const taskGroups = groupTasksByType(tasks);
    for (const [taskName, taskList] of taskGroups) {
        const stats = calculateTaskStats(taskList);
        const displayName = taskName.charAt(0).toUpperCase() + taskName.slice(1);
        content += `| ${escapeMarkdown(displayName)} | ${stats.occurrences} | ${formatDuration(stats.totalTime)} | ${formatDuration(stats.avgDuration)} |\n`;
    }

    content += '\n';
    return content;
}

/**
 * Generate Q&A log section
 * @param {Object[]} questions - All answered questions
 * @returns {string}
 */
function generateQALog(questions) {
    if (!questions || questions.length === 0) {
        return `## Clarification Q&A Log

*No clarification questions were asked during observation.*
`;
    }

    let content = `## Clarification Q&A Log

| Date | Context | Question | Response |
|------|---------|----------|----------|
`;

    // Sort by date
    const sorted = [...questions].sort((a, b) =>
        new Date(a.timestamp) - new Date(b.timestamp)
    );

    for (const q of sorted) {
        content += `| ${formatDate(q.timestamp)} | ${escapeMarkdown(q.triggerContext || 'N/A')} | ${escapeMarkdown(q.question)} | ${escapeMarkdown(q.answer || 'N/A')} |\n`;
    }

    content += '\n';
    return content;
}

/**
 * Generate session log section
 * @param {Object[]} sessions - All sessions
 * @param {Object[]} allTasks - All tasks
 * @param {Object[]} allQuestions - All questions
 * @returns {string}
 */
function generateSessionLog(sessions, allTasks, allQuestions) {
    if (!sessions || sessions.length === 0) {
        return `## Session Log

*No observation sessions recorded.*
`;
    }

    let content = `## Session Log

| Session | Date | Duration | Tasks | Questions |
|---------|------|----------|-------|-----------|
`;

    // Sort by date
    const sorted = [...sessions].sort((a, b) =>
        new Date(a.startTime) - new Date(b.startTime)
    );

    for (let i = 0; i < sorted.length; i++) {
        const session = sorted[i];
        const sessionTasks = allTasks.filter(t => t.sessionId === session.id);
        const sessionQuestions = allQuestions.filter(q => q.sessionId === session.id);

        content += `| ${i + 1} | ${formatDate(session.startTime)} | ${formatDuration(session.totalActiveTime || 0)} | ${sessionTasks.length} | ${sessionQuestions.length} |\n`;
    }

    content += '\n';
    return content;
}

// ============================================================================
// Document Assembly
// ============================================================================

/**
 * Generate complete documentation markdown
 * @param {DocumentationInputs} inputs - All aggregated data
 * @returns {string}
 */
function generateDocumentation(inputs) {
    const {
        profile,
        interviewData,
        interviewSummary,
        sessions,
        allTasks,
        allQuestions,
        appUsage
    } = inputs;

    const roleTitle = interviewSummary?.role || profile?.name || 'Workflow';

    let markdown = `# ${roleTitle} Workflow Documentation

*Generated: ${formatDateTime(new Date())}*

`;

    // Role Overview
    markdown += generateRoleOverview(profile, interviewSummary, sessions);

    // Interview Responses
    markdown += generateInterviewSection(interviewData, interviewSummary);

    // Systems & Tools
    markdown += generateSystemsTable(appUsage);

    // Documented Workflows
    markdown += `## Documented Workflows

`;

    const taskGroups = groupTasksByType(allTasks);
    if (taskGroups.size === 0) {
        markdown += '*No workflows documented yet.*\n\n';
    } else {
        for (const [taskName, tasks] of taskGroups) {
            markdown += generateWorkflowSection(taskName, tasks, allQuestions);
        }
    }

    // Time Log
    markdown += generateTimeLog(appUsage, allTasks);

    // Q&A Log
    markdown += generateQALog(allQuestions);

    // Session Log
    markdown += generateSessionLog(sessions, allTasks, allQuestions);

    // Raw Data References
    markdown += `## Raw Data References

- Profile ID: \`${profile?.id || 'N/A'}\`
- Interview transcript: Available in app
- Session data: Available in app
- Screenshots: Stored locally
`;

    return markdown;
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Ensure exports directory exists
 * @returns {string} Export directory path
 */
function ensureExportsDir() {
    if (!fs.existsSync(EXPORTS_DIR)) {
        fs.mkdirSync(EXPORTS_DIR, { recursive: true });
    }
    return EXPORTS_DIR;
}

/**
 * Generate filename for export
 * @param {string} profileId - Profile ID
 * @returns {string}
 */
function generateExportFilename(profileId) {
    const date = new Date().toISOString().split('T')[0];
    return `${profileId}-${date}.md`;
}

/**
 * Export documentation to file
 * @param {string} profileId - Profile ID
 * @param {string} [outputPath] - Optional custom output path
 * @returns {Promise<{success: boolean, path?: string, error?: string}>}
 */
async function exportDocumentation(profileId, outputPath = null) {
    documentationEvents.emit('documentation:generating', { profileId });

    try {
        // Aggregate all data
        const inputs = aggregateSessions(profileId);

        // Generate documentation
        const markdown = generateDocumentation(inputs);

        // Determine output path
        const exportsDir = ensureExportsDir();
        const filename = generateExportFilename(profileId);
        const filePath = outputPath || path.join(exportsDir, filename);

        // Ensure directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Write file
        fs.writeFileSync(filePath, markdown, 'utf8');

        documentationEvents.emit('documentation:complete', { profileId, markdown });
        documentationEvents.emit('documentation:exported', { profileId, path: filePath });

        return {
            success: true,
            path: filePath
        };
    } catch (error) {
        console.error('Error exporting documentation:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Generate documentation without saving to file
 * @param {string} profileId - Profile ID
 * @returns {Promise<{success: boolean, markdown?: string, error?: string}>}
 */
async function generateDocumentationForProfile(profileId) {
    documentationEvents.emit('documentation:generating', { profileId });

    try {
        // Aggregate all data
        const inputs = aggregateSessions(profileId);

        // Generate documentation
        const markdown = generateDocumentation(inputs);

        documentationEvents.emit('documentation:complete', { profileId, markdown });

        return {
            success: true,
            markdown
        };
    } catch (error) {
        console.error('Error generating documentation:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get documentation preview (shorter version)
 * @param {string} profileId - Profile ID
 * @returns {Promise<{success: boolean, preview?: string, error?: string}>}
 */
async function getDocumentationPreview(profileId) {
    try {
        const inputs = aggregateSessions(profileId);

        // Generate a shorter preview
        let preview = `# ${inputs.interviewSummary?.role || inputs.profile?.name || 'Workflow'} Documentation Preview\n\n`;
        preview += `**Sessions**: ${inputs.sessions.length}\n`;
        preview += `**Tasks Documented**: ${inputs.allTasks.length}\n`;
        preview += `**Questions Answered**: ${inputs.allQuestions.length}\n`;
        preview += `**Total Observation Time**: ${formatDuration(calculateTotalObservationTime(inputs.sessions))}\n\n`;

        preview += `**Systems Used**:\n`;
        for (const app of inputs.appUsage.slice(0, 5)) {
            preview += `- ${app.app} (${formatDuration(app.totalTime)})\n`;
        }
        if (inputs.appUsage.length > 5) {
            preview += `- ... and ${inputs.appUsage.length - 5} more\n`;
        }

        return {
            success: true,
            preview
        };
    } catch (error) {
        console.error('Error generating preview:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ============================================================================
// LLM-Assisted Step Inference (Optional)
// ============================================================================

/**
 * Infer workflow steps from screenshots using LLM
 * @param {Object} task - Task with screenshot references
 * @param {Object[]} screenshots - Screenshot data with images
 * @returns {Promise<WorkflowStep[]>}
 */
async function inferWorkflowSteps(task, screenshots) {
    const apiKey = storage.getApiKey();
    if (!apiKey) {
        console.warn('No API key for step inference');
        return [];
    }

    if (!screenshots || screenshots.length === 0) {
        return [];
    }

    const client = new GoogleGenAI({ apiKey });

    const apps = task.applications?.map(a => a.app).join(', ') || 'Unknown';
    const durationMinutes = Math.round((task.duration || 0) / 60);

    const prompt = `Based on these screenshots from a single task, describe the high-level
steps the user took. Be factual - describe what you observed, not what
you think should happen.

Task name: ${task.name || 'Unknown task'}
Duration: ${durationMinutes} minutes
Apps used: ${apps}

Output JSON array of steps:
[
  {
    "order": 1,
    "description": "Opened Excel spreadsheet 'Inventory.xlsx'",
    "app": "Microsoft Excel",
    "duration_estimate": "2 minutes"
  }
]

Keep steps high-level (5-10 steps max). Focus on what was done, not
minute details.`;

    try {
        // Build content with images
        const parts = [];

        for (const screenshot of screenshots.slice(0, 5)) {
            if (screenshot.base64Image || screenshot.imageBuffer) {
                parts.push({
                    inlineData: {
                        mimeType: 'image/png',
                        data: screenshot.base64Image || screenshot.imageBuffer.toString('base64')
                    }
                });
            }
        }

        parts.push({ text: prompt });

        if (parts.length === 1) {
            // Only text, no images
            return [];
        }

        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 1000
            }
        });

        const responseText = response.text || '';

        // Parse JSON from response
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        return [];
    } catch (error) {
        console.error('Error inferring workflow steps:', error);
        return [];
    }
}

// ============================================================================
// Module Exports
// ============================================================================

module.exports = {
    // Events
    documentationEvents,

    // Data Aggregation
    aggregateSessions,
    aggregateAppUsage,
    groupTasksByType,

    // Statistics
    calculateTaskStats,
    calculateTotalObservationTime,

    // Section Generators
    generateRoleOverview,
    generateInterviewSection,
    generateSystemsTable,
    generateWorkflowSection,
    generateTimeLog,
    generateQALog,
    generateSessionLog,

    // Document Assembly
    generateDocumentation,

    // Export
    exportDocumentation,
    generateDocumentationForProfile,
    getDocumentationPreview,

    // LLM-Assisted
    inferWorkflowSteps,

    // Utilities
    formatDuration,
    formatDate,
    formatDateTime,
    escapeMarkdown,

    // Constants
    EXPORTS_DIR
};
