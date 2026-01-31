# TASK-08: Naming Consistency Audit

## Scope
Find and fix any remaining references to old naming ("Cheating Daddy") and ensure consistent "Workflow Daddy" branding throughout.

## Files to Check (Read-Only Unless Fix Needed)
- All files in `src/`
- `package.json`
- `forge.config.js`
- `index.html`
- Any config files

## Do NOT Touch
- Functional logic
- Component behavior
- Storage structure
- API calls

## What to Look For

### 1. String Literals
Search for:
- "Cheating Daddy"
- "cheating-daddy"
- "cheatingDaddy"
- "CheatingDaddy"
- "cheat" (in context of app name)

### 2. Variable/Function Names
Look for variables like:
- `cheatingConfig`
- `cheatingDaddyApp`
- Any camelCase with "cheat"

### 3. File Names
Check if any files still have old naming:
- `CheatingDaddyApp.js` (should be removed, replaced by WorkflowDaddyApp.js)
- Any backup or temp files with old names

### 4. Comments
Old comments explaining "cheating" behavior:
- "// for hiding during cheating"
- "// emergency erase for cheating"
- etc.

### 5. Config Keys
In storage/config files:
- `cheating-daddy-config` → should be `workflow-daddy-config`
- Any localStorage keys

### 6. IPC Channel Names
Check for channels like:
- `cheating:*`
- Should all be workflow-relevant names

### 7. CSS Classes
Check for:
- `.cheating-*`
- `.cheat-*`

## Correct Naming

| Context | Correct Name |
|---------|-------------|
| App title | Workflow Daddy |
| Config directory | workflow-daddy-config |
| Main component | WorkflowDaddyApp |
| Package name | workflow-daddy |
| CSS prefix | .workflow-* or .wd-* |

## Audit Checklist

```
[ ] package.json - name field
[ ] package.json - productName
[ ] forge.config.js - app name
[ ] index.html - title tag
[ ] src/index.js - window title
[ ] src/utils/tray.js - tray tooltip
[ ] src/storage.js - config directory name
[ ] All component files - class names
[ ] All component files - comments
[ ] IPC channel names in index.js
[ ] IPC channel names in renderer.js
```

## Output

Create a report listing:
1. Files with issues found
2. Line numbers
3. Current text
4. Suggested replacement

Example:
```
FILE: src/utils/tray.js
LINE: 42
CURRENT: "Cheating Daddy - Hidden"
REPLACE: "Workflow Daddy - Recording"
```

## Verification

After fixes:
1. Search entire codebase for "cheat" (case insensitive)
2. Only results should be in git history or this task doc
3. App title shows "Workflow Daddy"
4. Tray tooltip shows "Workflow Daddy"
5. Config folder is `workflow-daddy-config`
