/**
 * PR Test Validation Logic
 * Extracted from agent-pr-validation.yml for maintainability
 */

export function getLinkedIssueNumber(pr) {
  const body = pr.body || '';
  const title = pr.title || '';
  const branch = pr.head.ref || '';

  const patterns = [
    /(?:closes?|fixes?|resolves?)\s*#(\d+)/gi,
    /(?:closes?|fixes?|resolves?)\s+(?:issue\s+)?#?(\d+)/gi,
    /issue[- ](\d+)/gi,
    /#(\d+)/g
  ];

  let issueNumber = null;

  // Check branch name first (most reliable for agent PRs)
  const branchMatch = branch.match(/issue[- ]?(\d+)/i);
  if (branchMatch) {
    issueNumber = branchMatch[1];
  }

  // Check body and title
  if (!issueNumber) {
    for (const pattern of patterns) {
      const match = pattern.exec(body + ' ' + title);
      if (match) {
        issueNumber = match[1];
        break;
      }
    }
  }

  console.log(`Linked issue: ${issueNumber || 'none found'}`);
  return issueNumber;
}

export function analyzeChangedFiles(files) {
  const srcFiles = files.filter(f => 
    f.filename.startsWith('src/') && 
    !f.filename.includes('.test.') &&
    !f.filename.includes('.spec.') &&
    (f.filename.endsWith('.ts') || f.filename.endsWith('.svelte'))
  );

  const testFiles = files.filter(f => 
    f.filename.includes('.test.') || 
    f.filename.includes('.spec.')
  );

  const e2eTestFiles = testFiles.filter(f => 
    f.filename.startsWith('tests/') ||
    f.filename.includes('e2e') ||
    f.filename.includes('a11y')
  );

  const unitTestFiles = testFiles.filter(f => 
    f.filename.startsWith('src/') ||
    f.filename.includes('.unit.')
  );

  return {
    srcFiles: srcFiles.map(f => f.filename),
    srcCount: srcFiles.length,
    unitTests: unitTestFiles.map(f => f.filename),
    e2eTests: e2eTestFiles.map(f => f.filename),
    unitCount: unitTestFiles.length,
    e2eCount: e2eTestFiles.length
  };
}

export function validateTestRequirements(changedFiles, pr) {
  const { srcCount, srcFiles, unitCount, e2eCount } = changedFiles;
  const labels = pr.labels?.map(l => l.name) || [];

  // Check if this is an agent implementation PR
  const isAgentPR = labels.includes('agent-implementation') || 
                   labels.includes('implementation') ||
                   pr.head.ref.startsWith('issue-');

  // Check if this modifies critical paths (require both unit + e2e)
  const criticalPaths = ['src/lib/websocket/', 'src/lib/storage/', 'src/lib/auth/', 'src/routes/api/'];
  const touchesCritical = srcFiles.some(f => criticalPaths.some(p => f.startsWith(p)));

  // Determine test requirements
  const hasUnitTests = unitCount > 0;
  const hasE2ETests = e2eCount > 0;
  let requiresUnitTests = srcCount > 0;
  let requiresE2ETests = srcCount > 2 || touchesCritical;

  // For small documentation-only PRs, tests are optional
  const isDocsOnly = srcCount === 0;
  if (isDocsOnly) {
    requiresUnitTests = false;
    requiresE2ETests = false;
  }

  console.log(`Agent PR: ${isAgentPR}`);
  console.log(`Touches critical: ${touchesCritical}`);
  console.log(`Requires unit tests: ${requiresUnitTests}`);
  console.log(`Requires E2E tests: ${requiresE2ETests}`);
  console.log(`Has unit tests: ${hasUnitTests}`);
  console.log(`Has E2E tests: ${hasE2ETests}`);

  const unitOk = !requiresUnitTests || hasUnitTests;
  const e2eOk = !requiresE2ETests || hasE2ETests;
  const valid = unitOk && e2eOk;

  return {
    hasUnitTests,
    hasE2ETests,
    requiresUnit: requiresUnitTests,
    requiresE2E: requiresE2ETests,
    isAgentPR,
    touchesCritical,
    valid,
    unitOk,
    e2eOk
  };
}

export function generateValidationComment(validation, coverage) {
  const { requiresUnit, requiresE2E, hasUnitTests, hasE2ETests, touchesCritical } = validation;
  const coverageOk = coverage?.ok === 'true';

  const missingTests = [];
  if (requiresUnit && !hasUnitTests) missingTests.push('Unit tests');
  if (requiresE2E && !hasE2ETests) missingTests.push('E2E tests');

  const criticalNote = touchesCritical 
    ? '\n\n⚠️ **This PR modifies critical paths** (WebSocket, Storage, Auth, or API). Both unit tests AND E2E tests are required.'
    : '';

  return `## 🧪 Test Validation Failed

**Missing:** ${missingTests.join(', ')}
${criticalNote}

### Requirements for Agent Implementations

All implementations must include proper tests to ensure correctness:

| Requirement | Status |
|-------------|--------|
| Unit tests for new/modified code | ${hasUnitTests ? '✅' : '❌'} |
| E2E tests for user-facing features | ${hasE2ETests ? '✅' : '❌'} |
| Coverage threshold (80%+) | ${coverageOk ? '✅' : '⚠️'} |

### How to Fix

1. **Add unit tests** in \`src/\` alongside your code (e.g., \`Component.test.ts\`)
2. **Add E2E tests** in \`tests/e2e/\` for user flows
3. Run \`npm run test:unit\` to verify unit tests pass
4. Run \`npm run test\` to verify E2E tests pass
5. Run \`npm run test:coverage\` to check coverage

### Test Examples

See \`TESTING.md\` for detailed examples and guidelines.

---
*Automated validation - tests are required for all implementations*`;
}

export function generateIssueNotification(pr, issue, validation, coverage) {
  const issueCreator = issue.user.login;
  const hasTests = validation.hasUnitTests || validation.hasE2ETests;
  const coverageOk = coverage?.ok === 'true';

  return `## 🚀 Implementation Started!

Hey @${issueCreator}! Great news - your request is being worked on!

**Pull Request:** #${pr.number}
**Status:** ${pr.draft ? '📝 Draft' : '👀 Ready for Review'}

### Implementation Checklist

| Check | Status |
|-------|--------|
| Tests included | ${hasTests ? '✅' : '⏳ Pending'} |
| Coverage passing | ${coverageOk ? '✅' : '⏳ Pending'} |
| CI checks | ⏳ Running |

### What happens next?

1. The implementation will be reviewed
2. Tests will verify everything works correctly
3. Once approved, it will be merged and deployed
4. You'll be notified when it's live! 🎉

Feel free to:
- 👀 Review the [PR changes](${pr.html_url})
- 💬 Leave feedback or suggestions
- ✅ Confirm the implementation matches your request

---
*Automated notification - we'll keep you posted!*`;
}

export function generateCompletionNotification(pr, issue) {
  const issueCreator = issue.user.login;
  const branch = pr.head.ref;

  return `## 🎉 Your Feature is Live!

Hey @${issueCreator}! Your request has been implemented and deployed!

**Merged PR:** #${pr.number}
**Branch:** \`${branch}\`

### What was delivered

The implementation included:
- ✅ Feature code
- ✅ Unit tests
- ✅ E2E tests (if applicable)
- ✅ All CI checks passed

### Try it out!

The changes are now live on the platform. Give it a spin and let us know if it works as expected!

**Found an issue?** Open a new [bug report](../../issues/new?template=bug-report.yml).
**Want improvements?** Open an [improvement request](../../issues/new?template=improvement.yml).

Thanks for contributing to unconf tools Lab! 🙏

---
*Automated notification - enjoy your new feature!*`;
}
