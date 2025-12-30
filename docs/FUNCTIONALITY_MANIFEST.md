# Functionality Manifest Guide

> How to maintain the machine-readable functionality manifest for AI-assisted issue triage.

## Overview

The **Functionality Manifest** (`.github/FUNCTIONALITY_MANIFEST.json`) is a structured document that helps AI coding agents understand what already exists in the project. This enables intelligent triage decisions like:

- ❌ Rejecting requests that duplicate existing functionality
- 💡 Identifying enhancement requests for existing tools  
- ✅ Accepting genuinely new and valuable features
- ⚠️ Flagging out-of-scope requests

## Why This Matters

AI agents (GitHub Copilot, Claude, etc.) processing issues need context to make good decisions. Without structured context, they might:

1. Accept duplicate feature requests
2. Miss enhancement opportunities
3. Fail to identify out-of-scope requests
4. Not understand tool relationships

The manifest provides this context in a format optimized for AI consumption.

## Manifest Structure

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-12-30",
  "project": { /* Project metadata */ },
  "tools": { /* All tools and capabilities */ },
  "infrastructure": { /* Technical capabilities */ },
  "outOfScope": { /* What we don't build */ },
  "evaluationCriteria": { /* How to evaluate requests */ }
}
```

## Updating the Manifest

### When to Update

Update the manifest when you:

- ✅ Add a new tool
- ✅ Add capabilities to existing tools
- ✅ Change tool status (preview → standard)
- ✅ Add new limitations
- ✅ Update out-of-scope categories
- ✅ Change evaluation criteria

### Tool Entry Structure

```json
{
  "tools": {
    "toolId": {
      "name": "Human-Readable Name",
      "status": "preview|standard|deprecated",
      "route": "/events/[eventId]/tools/toolId",
      "description": "One-sentence description",
      "capabilities": [
        "Capability 1 (specific and searchable)",
        "Capability 2",
        "..."
      ],
      "limitations": [
        "What it CAN'T do (helps reject out-of-scope enhancements)"
      ],
      "valueFor": {
        "organizers": ["How it helps organizers"],
        "participants": ["How it helps participants"]
      },
      "relatedTypes": ["TypeScriptType1", "TypeScriptType2"]
    }
  }
}
```

### Writing Good Capabilities

**Good capabilities are:**
- Specific and searchable (keywords that might appear in issues)
- Action-oriented (what users can DO)
- Distinct from other capabilities

**Examples:**

```json
// ✅ Good - specific, searchable
"capabilities": [
  "Excel/CSV paste input",
  "Configurable group size",
  "Diversity criteria (up to 2 columns)",
  "Export results to clipboard"
]

// ❌ Bad - vague, not searchable
"capabilities": [
  "Data import",
  "Configuration",
  "Criteria support",
  "Export"
]
```

### Writing Good Limitations

Limitations help reject requests that ask for features we intentionally don't support:

```json
// ✅ Good - clear boundaries
"limitations": [
  "Max 2 diversity criteria",
  "No persistent group history",
  "No integration with external calendars"
]

// ❌ Bad - vague
"limitations": [
  "Limited criteria",
  "No history",
  "No integrations"
]
```

## Integration with Issue Triage

The `issue-triage.yml` workflow:

1. **Loads the manifest** at triage time
2. **Extracts capabilities** for duplicate detection
3. **Passes context to AI** for intelligent evaluation
4. **Uses out-of-scope lists** for filtering

### AI Prompt Context

The workflow builds this context from the manifest:

```
EXISTING TOOLS AND CAPABILITIES:
- Team Shuffler (standard): Randomly assign participants to diverse groups. 
  Capabilities: Excel/CSV paste input, Configurable group size, ...
- Session Timer (standard): Full-screen countdown timer for sessions.
  Capabilities: Full-screen display, Shareable URL, ...
```

## Validation

### Manual Validation

```bash
# Validate JSON syntax
cat .github/FUNCTIONALITY_MANIFEST.json | jq .

# Check required fields
cat .github/FUNCTIONALITY_MANIFEST.json | jq '.tools | keys'
```

### CI Validation (Recommended)

Add to `.github/workflows/ci.yml`:

```yaml
- name: Validate Functionality Manifest
  run: |
    node -e "
      const fs = require('fs');
      const manifest = JSON.parse(fs.readFileSync('.github/FUNCTIONALITY_MANIFEST.json'));
      
      // Check required fields
      if (!manifest.tools) throw new Error('Missing tools');
      if (!manifest.outOfScope) throw new Error('Missing outOfScope');
      
      // Check each tool
      for (const [id, tool] of Object.entries(manifest.tools)) {
        if (!tool.name) throw new Error(\`Tool \${id} missing name\`);
        if (!tool.capabilities?.length) throw new Error(\`Tool \${id} missing capabilities\`);
        if (!tool.valueFor) throw new Error(\`Tool \${id} missing valueFor\`);
      }
      
      console.log('✅ Manifest is valid');
    "
```

## Best Practices

### 1. Keep It Updated

Update the manifest in the **same PR** that changes functionality:

```markdown
## PR Checklist
- [ ] Code changes
- [ ] Tests
- [ ] **Functionality manifest updated** (if capabilities changed)
```

### 2. Use Consistent Terminology

Use the same words in the manifest that users might use in issues:

| Issue might say | Manifest should include |
|-----------------|------------------------|
| "random teams" | "Randomly assign participants" |
| "countdown" | "countdown", "timer" |
| "live voting" | "Real-time vote updates" |

### 3. Document Limitations Proactively

When you intentionally DON'T build something, add it to limitations. This prevents repeated requests for features you've already decided against.

### 4. Cross-Reference Types

Include `relatedTypes` to help AI agents understand the data model:

```json
"relatedTypes": ["ShufflerActivityData", "DistributionGroup"]
```

This helps when issues reference specific data structures.

## Troubleshooting

### Issue Marked as Duplicate Incorrectly

1. Check if the capability description is too broad
2. Make capabilities more specific
3. Add the new capability as distinct

### Out-of-Scope Issue Accepted

1. Add the category/keyword to `outOfScope`
2. Be specific about examples

### Enhancement Not Recognized

1. Check if the base tool is in the manifest
2. Ensure `valueFor` section is complete
3. Add related keywords to capabilities

## Schema Reference

See `.github/schemas/functionality-manifest.schema.json` for the full JSON Schema (if created).

## Related Files

- `.github/FUNCTIONALITY_MANIFEST.json` - The manifest itself
- `.github/workflows/issue-triage.yml` - Workflow that uses the manifest
- `.github/copilot-instructions.md` - AI agent instructions
- `src/lib/types/tools.ts` - TypeScript type definitions
