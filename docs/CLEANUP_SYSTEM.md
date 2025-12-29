# Automated Cleanup System

This directory contains the automated cleanup system for temporary files and scripts.

## Overview

The cleanup system automatically removes temporary files (reports, test scripts, documentation) that are no longer needed after tasks are completed.

## Files

- **`.cleanup-tracker.json`** - Tracks temporary files and cleanup rules
- **`scripts/cleanup-temp-files.mjs`** - Cleanup script (run manually or via CI)
- **`.github/workflows/weekly-cleanup.yml`** - GitHub Action for automated weekly cleanup

## Usage

### For AI Agents

**When creating temporary files, ALWAYS register them:**

```json
{
  "temporaryFiles": {
    "docs/TASK_REPORT.md": {
      "created": "2024-12-30",
      "purpose": "Document task completion",
      "task": "Feature X implementation",
      "status": "completed",
      "keepUntil": "2025-01-06"
    }
  }
}
```

**Status values:**
- `temporary` - Work in progress, not yet ready to delete
- `completed` - Task done, can be cleaned up after expiry

### Manual Cleanup

```bash
# Preview what will be deleted
node scripts/cleanup-temp-files.mjs --dry-run

# Actually delete files
node scripts/cleanup-temp-files.mjs

# Verbose output
node scripts/cleanup-temp-files.mjs --verbose
```

### Automated Cleanup

- **Schedule**: Every Monday at 2 AM UTC
- **GitHub Action**: `.github/workflows/weekly-cleanup.yml`
- **Manual trigger**: Go to Actions tab → Weekly Cleanup → Run workflow

## What Gets Cleaned Up

### Automatically Deleted

Files matching these patterns (older than 7 days):
- `docs/*_REPORT_*.md`
- `docs/*_FIX_*.md`
- `docs/*_CHANGES_*.md`
- `scripts/test-*.{mjs,js}`
- `scripts/*-test.{mjs,js}`
- `*.temp.md`
- `*.tmp.md`
- `.verification-*.md`

### Always Kept (Permanent)

Core project files:
- `README.md`, `CHANGELOG.md`, `TESTING.md`
- `CLAUDE.md`, `AGENTS.md`
- `docs/CONTRIBUTING.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/ICON_*.md`
- `docs/PRE_COMMIT_TESTING.md`
- `docs/security/**`
- Essential scripts: `validate-coverage.js`, `pre-commit-ci.sh`, etc.

## Configuration

Edit `.cleanup-tracker.json` to:

1. **Add temporary files**:
```json
"temporaryFiles": {
  "path/to/file.md": {
    "created": "YYYY-MM-DD",
    "purpose": "Why this file exists",
    "task": "Related task name",
    "status": "temporary|completed",
    "keepUntil": "YYYY-MM-DD"
  }
}
```

2. **Update cleanup patterns**:
```json
"autoCleanupRules": {
  "patterns": [
    "docs/temp-*.md",
    "scripts/debug-*.js"
  ],
  "maxAgeInDays": 7
}
```

3. **Add permanent files**:
```json
"permanentFiles": [
  "docs/IMPORTANT_DOC.md"
]
```

## Best Practices

### For AI Agents

1. ✅ **Register immediately** - Add temp files to tracker when created
2. ✅ **Set expiry dates** - Default to +7 days from creation
3. ✅ **Mark status** - Use `temporary` during work, `completed` when done
4. ✅ **Clean as you go** - Delete temp files manually when task is complete
5. ✅ **Check before commit** - Run `--dry-run` to verify cleanup state

### For Developers

1. Run cleanup script before major commits
2. Review cleanup summary in CI logs
3. Update patterns if new temporary file types emerge
4. Keep permanent file list minimal

## Examples

### Temporary Test Script

```json
{
  "temporaryFiles": {
    "scripts/test-poll-results.mjs": {
      "created": "2024-12-29",
      "purpose": "Manual poll results testing",
      "task": "Poll UX improvements",
      "status": "completed",
      "keepUntil": "2025-01-05"
    }
  }
}
```

### Task Documentation

```json
{
  "temporaryFiles": {
    "docs/POLL_IMPROVEMENTS_2024-12-29.md": {
      "created": "2024-12-29",
      "purpose": "Document poll feature changes",
      "task": "Poll vote limits",
      "status": "completed",
      "keepUntil": "2025-01-05"
    }
  }
}
```

### Verification Script

```json
{
  "temporaryFiles": {
    ".verification-mcp-setup.md": {
      "created": "2024-12-15",
      "purpose": "MCP setup verification",
      "task": "MCP integration",
      "status": "completed",
      "keepUntil": "2025-01-01"
    }
  }
}
```

## Troubleshooting

### File Not Being Deleted

1. Check if file is in `permanentFiles` list
2. Verify file matches cleanup patterns
3. Check `keepUntil` date hasn't passed
4. Run with `--verbose` to see detailed logic

### Accidental Deletion

1. Check git history: `git log -- path/to/file`
2. Restore from commit: `git checkout <commit> -- path/to/file`
3. Update `permanentFiles` to prevent future deletion

### Pattern Not Matching

Test pattern matching:
```bash
node scripts/cleanup-temp-files.mjs --dry-run --verbose
```

Review output to see which files match which patterns.

## Integration with CI/CD

The cleanup system integrates with GitHub Actions:

1. **Weekly cleanup** runs automatically
2. **Manual trigger** available in Actions tab
3. **Summary posted** to workflow run
4. **Commits changes** if files were deleted

## Support

For issues or questions about the cleanup system:
1. Check `.cleanup-tracker.json` configuration
2. Review `scripts/cleanup-temp-files.mjs` logic
3. Check GitHub Actions logs
4. Update patterns or permanent files list as needed
