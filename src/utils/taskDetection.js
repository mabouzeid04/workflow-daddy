/**
 * Task Detection Service
 *
 * Automatically infers when one task ends and another begins based on
 * application switches, time gaps, and content changes.
 */

const EventEmitter = require('events');
const { generateContent } = require('./gemini');

// Event emitter for task detection events
const taskDetectionEvents = new EventEmitter();

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * @typedef {Object} AppSegment
 * @property {string} app - Application name
 * @property {string} windowTitle - Window title
 * @property {Date} startTime - When app segment started
 * @property {Date|null} endTime - When app segment ended
 * @property {number} duration - Duration in seconds
 */

/**
 * @typedef {Object} Task
 * @property {string} id - Unique task ID
 * @property {string} sessionId - Session this task belongs to
 * @property {string} name - AI-inferred or user-provided task name
 * @property {Date} startTime - When task started
 * @property {Date|null} endTime - When task ended
 * @property {number} duration - Duration in seconds
 * @property {'active'|'completed'|'interrupted'} status - Task status
 * @property {AppSegment[]} applications - App segments during this task
 * @property {string[]} screenshots - Screenshot IDs associated with task
 * @property {string} [userExplanation] - User's explanation from Q&A
 */

/**
 * @typedef {Object} TaskBoundaryEvent
 * @property {'task_start'|'task_end'|'task_switch'} type - Event type
 * @property {Date} timestamp - When boundary was detected
 * @property {Task} [previousTask] - Task that ended
 * @property {Task} [newTask] - Task that started
 * @property {'app_switch'|'time_gap'|'context_change'|'time_pattern'|'user_indication'} trigger - What triggered the boundary
 */

/**
 * @typedef {Object} TaskDetectionConfig
 * @property {number} minTaskDuration - Minimum task duration in seconds (default 60)
 * @property {number} idleThreshold - Seconds before marking idle gap (default 300)
 * @property {number} appSwitchDebounce - Seconds before app switch counts (default 30)
 */

/**
 * @typedef {Object} ContextChangeAnalysis
 * @property {boolean} sameTask - Whether still on same task
 * @property {number} confidence - Confidence level 0-1
 * @property {string} reasoning - Brief explanation
 */

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG = {
    minTaskDuration: 60,      // seconds
    idleThreshold: 300,       // 5 minutes
    appSwitchDebounce: 30,    // 30 seconds
};

// App switches that likely don't indicate a new task
const SAME_TASK_PAIRS = [
    // Browser research while in main app
    ['*', 'Google Chrome'],
    ['*', 'Safari'],
    ['*', 'Firefox'],
    ['*', 'Arc'],
    ['*', 'Microsoft Edge'],

    // Quick reference lookups
    ['*', 'Calculator'],
    ['*', 'Notes'],
    ['*', 'Preview'],
    ['*', 'Finder'],
    ['*', 'File Explorer'],

    // Communication checks (brief)
    ['*', 'Slack'],
    ['*', 'Microsoft Teams'],
    ['*', 'Discord'],
];

// These switches likely indicate a new task
const NEW_TASK_APPS = [
    'Mail',
    'Outlook',
    'Calendar',
    'Zoom',
    'Google Meet',
    'Microsoft Teams', // When it's the primary app, not brief check
    'Webex',
    'FaceTime',
];

// ============================================================================
// State Management
// ============================================================================

/** @type {string|null} */
let currentSessionId = null;

/** @type {Task|null} */
let currentTask = null;

/** @type {Task[]} */
let sessionTasks = [];

/** @type {AppSegment|null} */
let currentAppSegment = null;

/** @type {TaskDetectionConfig} */
let config = { ...DEFAULT_CONFIG };

/** @type {Date|null} */
let lastActivityTime = null;

/** @type {Object|null} */
let lastScreenshot = null;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate unique task ID
 * @returns {string}
 */
function generateTaskId() {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate duration between two dates in seconds
 * @param {Date} start
 * @param {Date} end
 * @returns {number}
 */
function calculateDuration(start, end) {
    return Math.floor((end.getTime() - start.getTime()) / 1000);
}

/**
 * Check if an app is in the "new task" list
 * @param {string} appName
 * @returns {boolean}
 */
function isNewTaskApp(appName) {
    if (!appName) return false;
    return NEW_TASK_APPS.some(app =>
        appName.toLowerCase().includes(app.toLowerCase())
    );
}

/**
 * Check if app switch is likely within same task
 * @param {string} fromApp
 * @param {string} toApp
 * @returns {boolean}
 */
function isSameTaskSwitch(fromApp, toApp) {
    if (!fromApp || !toApp) return false;

    for (const [app1, app2] of SAME_TASK_PAIRS) {
        // Check wildcard matches
        if (app1 === '*' && toApp.toLowerCase().includes(app2.toLowerCase())) {
            return true;
        }
        if (app2 === '*' && fromApp.toLowerCase().includes(app1.toLowerCase())) {
            return true;
        }
        // Check exact matches
        if (fromApp.toLowerCase().includes(app1.toLowerCase()) &&
            toApp.toLowerCase().includes(app2.toLowerCase())) {
            return true;
        }
    }

    return false;
}

// ============================================================================
// Task Lifecycle Functions
// ============================================================================

/**
 * Start a new task
 * @param {string} sessionId
 * @param {'app_switch'|'time_gap'|'context_change'|'time_pattern'|'user_indication'} trigger
 * @param {Object} [initialData] - Optional initial data (app, title)
 * @returns {Task}
 */
function startTask(sessionId, trigger, initialData = {}) {
    const now = new Date();

    const task = {
        id: generateTaskId(),
        sessionId,
        name: 'Unnamed task', // Will be inferred later
        startTime: now,
        endTime: null,
        duration: 0,
        status: 'active',
        applications: [],
        screenshots: [],
        userExplanation: undefined,
    };

    // Start initial app segment if we have app info
    if (initialData.app) {
        currentAppSegment = {
            app: initialData.app,
            windowTitle: initialData.windowTitle || '',
            startTime: now,
            endTime: null,
            duration: 0,
        };
    }

    currentTask = task;
    sessionTasks.push(task);
    lastActivityTime = now;

    /** @type {TaskBoundaryEvent} */
    const boundaryEvent = {
        type: 'task_start',
        timestamp: now,
        newTask: task,
        trigger,
    };

    taskDetectionEvents.emit('task:started', task);
    taskDetectionEvents.emit('task:boundary', boundaryEvent);

    console.log(`[TaskDetection] Started task ${task.id} (trigger: ${trigger})`);

    return task;
}

/**
 * End the current task
 * @param {Task} task
 * @param {'app_switch'|'time_gap'|'context_change'|'time_pattern'|'user_indication'} trigger
 * @returns {Task}
 */
function endTask(task, trigger) {
    const now = new Date();

    // Finalize current app segment
    if (currentAppSegment) {
        currentAppSegment.endTime = now;
        currentAppSegment.duration = calculateDuration(currentAppSegment.startTime, now);
        task.applications.push({ ...currentAppSegment });
        currentAppSegment = null;
    }

    task.endTime = now;
    task.duration = calculateDuration(task.startTime, now);
    task.status = 'completed';

    /** @type {TaskBoundaryEvent} */
    const boundaryEvent = {
        type: 'task_end',
        timestamp: now,
        previousTask: task,
        trigger,
    };

    taskDetectionEvents.emit('task:ended', task);
    taskDetectionEvents.emit('task:boundary', boundaryEvent);

    console.log(`[TaskDetection] Ended task ${task.id} (duration: ${task.duration}s, trigger: ${trigger})`);

    return task;
}

/**
 * Switch from current task to a new task
 * @param {Task} currentTaskToEnd
 * @param {'app_switch'|'time_gap'|'context_change'|'time_pattern'|'user_indication'} trigger
 * @param {Object} [newTaskData] - Optional data for new task
 * @returns {{ ended: Task, started: Task }}
 */
function switchTask(currentTaskToEnd, trigger, newTaskData = {}) {
    const now = new Date();

    // End current task
    const ended = endTask(currentTaskToEnd, trigger);

    // Start new task
    const started = startTask(currentTaskToEnd.sessionId, trigger, newTaskData);

    /** @type {TaskBoundaryEvent} */
    const boundaryEvent = {
        type: 'task_switch',
        timestamp: now,
        previousTask: ended,
        newTask: started,
        trigger,
    };

    taskDetectionEvents.emit('task:switched', { ended, started });
    taskDetectionEvents.emit('task:boundary', boundaryEvent);

    console.log(`[TaskDetection] Switched from task ${ended.id} to ${started.id}`);

    return { ended, started };
}

/**
 * Mark current task as interrupted (idle)
 * @param {Task} task
 * @returns {Task}
 */
function interruptTask(task) {
    const now = new Date();

    // Finalize current app segment
    if (currentAppSegment) {
        currentAppSegment.endTime = now;
        currentAppSegment.duration = calculateDuration(currentAppSegment.startTime, now);
        task.applications.push({ ...currentAppSegment });
        currentAppSegment = null;
    }

    task.endTime = now;
    task.duration = calculateDuration(task.startTime, now);
    task.status = 'interrupted';

    taskDetectionEvents.emit('task:interrupted', task);

    console.log(`[TaskDetection] Task ${task.id} interrupted (idle)`);

    return task;
}

// ============================================================================
// Boundary Detection Functions
// ============================================================================

/**
 * Check if there's a significant app switch
 * @param {Object} prevScreenshot - Previous screenshot metadata
 * @param {Object} currScreenshot - Current screenshot metadata
 * @returns {boolean}
 */
function isSignificantAppSwitch(prevScreenshot, currScreenshot) {
    if (!prevScreenshot || !currScreenshot) return false;

    const prevApp = prevScreenshot.activeApp;
    const currApp = currScreenshot.activeApp;

    // Same app, not a switch
    if (prevApp === currApp) return false;

    // Check if this is a "same task" type of switch
    if (isSameTaskSwitch(prevApp, currApp)) {
        console.log(`[TaskDetection] App switch ${prevApp} -> ${currApp} considered same task`);
        return false;
    }

    // Check if new app indicates new task
    if (isNewTaskApp(currApp)) {
        console.log(`[TaskDetection] App ${currApp} is a new-task indicator`);
        return true;
    }

    return true;
}

/**
 * Check if there's been an idle gap
 * @param {Object[]} screenshots - Recent screenshots
 * @returns {boolean}
 */
function isIdleGap(screenshots) {
    if (!screenshots || screenshots.length < 2) return false;

    const sorted = [...screenshots].sort((a, b) =>
        new Date(b.timestamp) - new Date(a.timestamp)
    );

    const latest = sorted[0];
    const previous = sorted[1];

    if (!latest || !previous) return false;

    const gap = calculateDuration(
        new Date(previous.timestamp),
        new Date(latest.timestamp)
    );

    return gap >= config.idleThreshold;
}

/**
 * Check for idle gap since last activity
 * @returns {boolean}
 */
function isIdleSinceLastActivity() {
    if (!lastActivityTime) return false;

    const now = new Date();
    const gap = calculateDuration(lastActivityTime, now);

    return gap >= config.idleThreshold;
}

/**
 * Detect context change using LLM
 * @param {Object[]} screenshots - Recent screenshots with image data
 * @param {Object} context - Assembled context
 * @returns {Promise<ContextChangeAnalysis|null>}
 */
async function detectContextChange(screenshots, context) {
    if (!screenshots || screenshots.length < 2) return null;

    const currentTaskTheory = context?.session?.currentTaskTheory || 'Unknown task';
    const recentApps = screenshots.map(s => s.activeApp).filter(Boolean);
    const recentTitles = screenshots.map(s => s.windowTitle).filter(Boolean);

    const prompt = `Looking at these recent screenshots, has the user switched to a different task or are they continuing the same work?

Current task theory: ${currentTaskTheory}
Recent applications: ${[...new Set(recentApps)].join(', ')}
Recent window titles: ${recentTitles.slice(-3).join(' | ')}

Respond with JSON only:
{
  "sameTask": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

Be conservative - minor context switches within the same goal (e.g., checking email mid-task) don't count as new tasks.`;

    try {
        // Prepare images for the prompt
        const imageData = screenshots
            .filter(s => s.imageBuffer || s.base64Image)
            .slice(-3) // Last 3 screenshots
            .map(s => ({
                inlineData: {
                    mimeType: 'image/png',
                    data: s.base64Image || s.imageBuffer.toString('base64'),
                }
            }));

        if (imageData.length === 0) {
            console.log('[TaskDetection] No images available for context change detection');
            return null;
        }

        const response = await generateContent([
            ...imageData,
            { text: prompt }
        ], {
            temperature: 0.3,
            maxOutputTokens: 256,
        });

        // Parse JSON response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        console.log('[TaskDetection] Could not parse context change response');
        return null;
    } catch (error) {
        console.error('[TaskDetection] Error detecting context change:', error);
        return null;
    }
}

/**
 * Main boundary detection function
 * @param {Object[]} screenshots - Recent screenshots
 * @param {Object} context - Assembled context
 * @returns {Promise<TaskBoundaryEvent|null>}
 */
async function detectBoundary(screenshots, context) {
    if (!currentTask) return null;
    if (!screenshots || screenshots.length < 2) return null;

    const sorted = [...screenshots].sort((a, b) =>
        new Date(b.timestamp) - new Date(a.timestamp)
    );

    const curr = sorted[0];
    const prev = sorted[1];

    // Check for idle gap
    if (isIdleGap(screenshots)) {
        console.log('[TaskDetection] Idle gap detected');
        interruptTask(currentTask);
        currentTask = null;
        return {
            type: 'task_end',
            timestamp: new Date(),
            previousTask: sessionTasks[sessionTasks.length - 1],
            trigger: 'time_gap',
        };
    }

    // Check for significant app switch
    if (isSignificantAppSwitch(prev, curr)) {
        // Check debounce - was the switch sustained?
        const switchTime = calculateDuration(
            new Date(prev.timestamp),
            new Date(curr.timestamp)
        );

        if (switchTime >= config.appSwitchDebounce) {
            console.log(`[TaskDetection] Significant app switch: ${prev.activeApp} -> ${curr.activeApp}`);

            const { ended, started } = switchTask(currentTask, 'app_switch', {
                app: curr.activeApp,
                windowTitle: curr.windowTitle,
            });

            return {
                type: 'task_switch',
                timestamp: new Date(),
                previousTask: ended,
                newTask: started,
                trigger: 'app_switch',
            };
        }
    }

    // Check for context change (less frequent, more expensive)
    // Only do this if we have multiple screenshots showing same app
    const sameAppScreenshots = screenshots.filter(s => s.activeApp === curr.activeApp);
    if (sameAppScreenshots.length >= 3) {
        const contextAnalysis = await detectContextChange(sameAppScreenshots, context);

        if (contextAnalysis && !contextAnalysis.sameTask && contextAnalysis.confidence >= 0.7) {
            console.log(`[TaskDetection] Context change detected: ${contextAnalysis.reasoning}`);

            const { ended, started } = switchTask(currentTask, 'context_change', {
                app: curr.activeApp,
                windowTitle: curr.windowTitle,
            });

            return {
                type: 'task_switch',
                timestamp: new Date(),
                previousTask: ended,
                newTask: started,
                trigger: 'context_change',
            };
        }
    }

    return null;
}

// ============================================================================
// Task Naming Functions
// ============================================================================

/**
 * Infer a name for a task based on its activity
 * @param {Task} task
 * @param {Object} context - Assembled context
 * @returns {Promise<string>}
 */
async function inferTaskName(task, context) {
    const apps = [...new Set(task.applications.map(a => a.app))];
    const titles = [...new Set(task.applications.map(a => a.windowTitle).filter(Boolean))];
    const durationMinutes = Math.round(task.duration / 60);
    const roleSummary = context?.historical?.interviewSummary?.roleSummary || 'Unknown role';

    const prompt = `Based on these observations, give this task a brief, descriptive name.

Applications used: ${apps.join(', ')}
Window titles seen: ${titles.slice(0, 5).join(' | ')}
Duration: ${durationMinutes} minutes
User's role: ${roleSummary}

Respond with just the task name (2-5 words), e.g.:
- "Process purchase orders"
- "Update inventory spreadsheet"
- "Email customer about delivery"
- "Review sales report"`;

    try {
        const response = await generateContent([{ text: prompt }], {
            temperature: 0.5,
            maxOutputTokens: 50,
        });

        const name = response.trim().replace(/^["']|["']$/g, '');
        return name || 'Unnamed task';
    } catch (error) {
        console.error('[TaskDetection] Error inferring task name:', error);

        // Fallback: use primary app name
        if (apps.length > 0) {
            return `Work in ${apps[0]}`;
        }
        return 'Unnamed task';
    }
}

// ============================================================================
// Task Merging Functions
// ============================================================================

/**
 * Check if two tasks should be merged
 * @param {Task} task1
 * @param {Task} task2
 * @returns {boolean}
 */
function shouldMergeTasks(task1, task2) {
    // Tasks must be adjacent (task1 ended, task2 started)
    if (!task1.endTime || !task2.startTime) return false;

    // Short gap between them (less than 2 minutes)
    const gap = calculateDuration(task1.endTime, task2.startTime);
    if (gap > 120) return false;

    // Same primary app
    const task1Apps = new Set(task1.applications.map(a => a.app));
    const task2Apps = new Set(task2.applications.map(a => a.app));
    const commonApps = [...task1Apps].filter(a => task2Apps.has(a));

    if (commonApps.length === 0) return false;

    // Both tasks are short (likely over-segmented)
    if (task1.duration < 120 && task2.duration < 120) {
        return true;
    }

    return false;
}

/**
 * Merge two tasks into one
 * @param {Task} task1 - Earlier task
 * @param {Task} task2 - Later task
 * @returns {Task}
 */
function mergeTasks(task1, task2) {
    const merged = {
        ...task1,
        endTime: task2.endTime,
        duration: task1.duration + task2.duration,
        status: task2.status,
        applications: [...task1.applications, ...task2.applications],
        screenshots: [...task1.screenshots, ...task2.screenshots],
    };

    // Remove task2 from session tasks and update task1
    const task1Index = sessionTasks.findIndex(t => t.id === task1.id);
    const task2Index = sessionTasks.findIndex(t => t.id === task2.id);

    if (task1Index >= 0) {
        sessionTasks[task1Index] = merged;
    }
    if (task2Index >= 0) {
        sessionTasks.splice(task2Index, 1);
    }

    taskDetectionEvents.emit('task:merged', { task1, task2, merged });

    console.log(`[TaskDetection] Merged tasks ${task1.id} and ${task2.id}`);

    return merged;
}

// ============================================================================
// Public API Functions
// ============================================================================

/**
 * Initialize task detection for a session
 * @param {string} sessionId
 * @param {Partial<TaskDetectionConfig>} [customConfig]
 */
function initTaskDetection(sessionId, customConfig = {}) {
    currentSessionId = sessionId;
    currentTask = null;
    sessionTasks = [];
    currentAppSegment = null;
    lastActivityTime = null;
    lastScreenshot = null;
    config = { ...DEFAULT_CONFIG, ...customConfig };

    console.log(`[TaskDetection] Initialized for session ${sessionId}`);
    taskDetectionEvents.emit('taskdetection:initialized', { sessionId, config });
}

/**
 * Process a new screenshot for task detection
 * @param {Object} screenshot - Screenshot metadata with optional image data
 * @param {Object} context - Assembled context
 * @returns {Promise<TaskBoundaryEvent|null>}
 */
async function processScreenshot(screenshot, context) {
    if (!currentSessionId) {
        console.warn('[TaskDetection] Not initialized, ignoring screenshot');
        return null;
    }

    const now = new Date();
    lastActivityTime = now;

    // If no current task, start one
    if (!currentTask) {
        // Check if resuming from idle
        const lastTask = sessionTasks[sessionTasks.length - 1];
        if (lastTask && lastTask.status === 'interrupted') {
            // Check if context is similar (could merge)
            if (lastTask.applications.some(a => a.app === screenshot.activeApp)) {
                // Resume - merge with interrupted task
                lastTask.status = 'active';
                lastTask.endTime = null;
                currentTask = lastTask;

                currentAppSegment = {
                    app: screenshot.activeApp,
                    windowTitle: screenshot.windowTitle || '',
                    startTime: now,
                    endTime: null,
                    duration: 0,
                };

                console.log(`[TaskDetection] Resumed task ${currentTask.id}`);
                taskDetectionEvents.emit('task:resumed', currentTask);
            } else {
                // Different context, start new task
                startTask(currentSessionId, 'time_gap', {
                    app: screenshot.activeApp,
                    windowTitle: screenshot.windowTitle,
                });
            }
        } else {
            // First task of session
            startTask(currentSessionId, 'time_pattern', {
                app: screenshot.activeApp,
                windowTitle: screenshot.windowTitle,
            });
        }
    }

    // Add screenshot to current task
    if (currentTask && screenshot.id) {
        currentTask.screenshots.push(screenshot.id);
    }

    // Track app segment changes
    if (currentAppSegment && currentAppSegment.app !== screenshot.activeApp) {
        // End current segment
        currentAppSegment.endTime = now;
        currentAppSegment.duration = calculateDuration(currentAppSegment.startTime, now);
        currentTask.applications.push({ ...currentAppSegment });

        // Start new segment
        currentAppSegment = {
            app: screenshot.activeApp,
            windowTitle: screenshot.windowTitle || '',
            startTime: now,
            endTime: null,
            duration: 0,
        };
    } else if (currentAppSegment) {
        // Update window title if changed
        currentAppSegment.windowTitle = screenshot.windowTitle || currentAppSegment.windowTitle;
    }

    // Build recent screenshots for boundary detection
    const recentScreenshots = lastScreenshot
        ? [lastScreenshot, screenshot]
        : [screenshot];

    lastScreenshot = screenshot;

    // Detect boundaries
    return await detectBoundary(recentScreenshots, context);
}

/**
 * Handle app switch event from capture service
 * @param {Object} event - { previous, current } app info
 * @param {Object} context - Assembled context
 * @returns {TaskBoundaryEvent|null}
 */
function handleAppSwitch(event, context) {
    if (!currentTask || !currentSessionId) return null;

    const { previous, current } = event;
    const now = new Date();

    // Check if significant switch
    if (isNewTaskApp(current.app) && !isSameTaskSwitch(previous.app, current.app)) {
        console.log(`[TaskDetection] Significant app switch detected: ${previous.app} -> ${current.app}`);

        const { ended, started } = switchTask(currentTask, 'app_switch', {
            app: current.app,
            windowTitle: current.title,
        });

        return {
            type: 'task_switch',
            timestamp: now,
            previousTask: ended,
            newTask: started,
            trigger: 'app_switch',
        };
    }

    return null;
}

/**
 * Handle user indication of task change (from Q&A)
 * @param {string} taskDescription - User's description of new task
 * @returns {Task}
 */
function handleUserTaskIndication(taskDescription) {
    if (!currentSessionId) {
        console.warn('[TaskDetection] Not initialized');
        return null;
    }

    if (currentTask) {
        const { started } = switchTask(currentTask, 'user_indication');
        started.name = taskDescription;
        started.userExplanation = taskDescription;
        return started;
    } else {
        const task = startTask(currentSessionId, 'user_indication');
        task.name = taskDescription;
        task.userExplanation = taskDescription;
        return task;
    }
}

/**
 * End the current session's task tracking
 * @returns {Task[]}
 */
function endSession() {
    if (currentTask) {
        endTask(currentTask, 'time_pattern');
    }

    const tasks = [...sessionTasks];

    currentSessionId = null;
    currentTask = null;
    sessionTasks = [];
    currentAppSegment = null;
    lastActivityTime = null;
    lastScreenshot = null;

    console.log(`[TaskDetection] Session ended, ${tasks.length} tasks recorded`);
    taskDetectionEvents.emit('taskdetection:session-ended', { tasks });

    return tasks;
}

/**
 * Get current task
 * @returns {Task|null}
 */
function getCurrentTask() {
    return currentTask;
}

/**
 * Get all tasks for current session
 * @returns {Task[]}
 */
function getSessionTasks() {
    return [...sessionTasks];
}

/**
 * Get task detection configuration
 * @returns {TaskDetectionConfig}
 */
function getConfig() {
    return { ...config };
}

/**
 * Update task detection configuration
 * @param {Partial<TaskDetectionConfig>} newConfig
 */
function updateConfig(newConfig) {
    config = { ...config, ...newConfig };
    taskDetectionEvents.emit('taskdetection:config-updated', config);
}

/**
 * Name all unnamed tasks in the session
 * @param {Object} context - Assembled context
 * @returns {Promise<void>}
 */
async function nameUnnamedTasks(context) {
    for (const task of sessionTasks) {
        if (task.name === 'Unnamed task' && task.applications.length > 0) {
            task.name = await inferTaskName(task, context);
            taskDetectionEvents.emit('task:named', task);
        }
    }
}

/**
 * Get tasks formatted for documentation
 * @returns {Object[]}
 */
function getTasksForDocumentation() {
    return sessionTasks.map(task => ({
        id: task.id,
        name: task.name,
        startTime: task.startTime,
        endTime: task.endTime,
        duration: task.duration,
        durationFormatted: formatDuration(task.duration),
        status: task.status,
        applications: task.applications.map(a => ({
            app: a.app,
            duration: a.duration,
        })),
        screenshotCount: task.screenshots.length,
        userExplanation: task.userExplanation,
    }));
}

/**
 * Format duration in human-readable form
 * @param {number} seconds
 * @returns {string}
 */
function formatDuration(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
}

// ============================================================================
// Module Exports
// ============================================================================

module.exports = {
    // Events
    taskDetectionEvents,

    // Constants
    DEFAULT_CONFIG,
    SAME_TASK_PAIRS,
    NEW_TASK_APPS,

    // Initialization
    initTaskDetection,

    // Processing
    processScreenshot,
    handleAppSwitch,
    handleUserTaskIndication,

    // Task lifecycle
    startTask,
    endTask,
    switchTask,
    interruptTask,

    // Boundary detection
    detectBoundary,
    isSignificantAppSwitch,
    isIdleGap,
    detectContextChange,

    // Task naming
    inferTaskName,
    nameUnnamedTasks,

    // Task merging
    shouldMergeTasks,
    mergeTasks,

    // Getters
    getCurrentTask,
    getSessionTasks,
    getConfig,
    getTasksForDocumentation,

    // Configuration
    updateConfig,

    // Session management
    endSession,
};
