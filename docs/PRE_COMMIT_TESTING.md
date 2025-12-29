# Pre-Commit CI Testing

Run CI checks locally before committing to catch issues early.

## Quick Start

### Manual Testing (Recommended)

Run CI checks before committing:

```bash
npm run pre-commit:quick   # Fast - skips E2E tests
npm run pre-commit         # Full - includes E2E tests
```

### Automatic Git Hook

The Git pre-commit hook is already installed at `.git/hooks/pre-commit` and will automatically run before every commit.

**To bypass the hook** (not recommended):
```bash
git commit --no-verify -m "your message"
```

## What Gets Tested

The pre-commit script runs the same checks as CI:

1. ✅ **Type Check** - `npm run check`
2. ✅ **Lint** - `npm run lint`
3. ✅ **Unit Tests** - `npm run test:unit`
4. ✅ **Build** - `npm run build`
5. ⏭️ **E2E Tests** - `npm run test` (optional with `--skip-e2e`)

## Usage Options

### Before Every Commit (Automatic)
```bash
git add .
git commit -m "your message"
# ✅ Pre-commit hook runs automatically
```

### Manual Testing
```bash
# Quick validation (skips E2E tests - ~30 seconds)
npm run pre-commit:quick

# Full validation (includes E2E tests - ~2-3 minutes)
npm run pre-commit

# Direct script execution with options
./scripts/pre-commit-ci.sh              # Full tests
./scripts/pre-commit-ci.sh --skip-e2e   # Skip E2E
```

### Disable Hook Temporarily
```bash
# Option 1: Use --no-verify flag
git commit --no-verify -m "message"

# Option 2: Remove the hook
rm .git/hooks/pre-commit

# Option 3: Rename the hook
mv .git/hooks/pre-commit .git/hooks/pre-commit.disabled
```

## Reinstalling the Hook

If you delete the hook or clone the repo fresh:

```bash
# Copy the hook template
cp .github/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

Or create it manually:
```bash
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
./scripts/pre-commit-ci.sh --skip-e2e
exit $?
EOF
chmod +x .git/hooks/pre-commit
```

## Testing Specific Changes

### Type Checking Only
```bash
npm run check
```

### Lint Only
```bash
npm run lint
npm run lint:fix  # Auto-fix issues
```

### Unit Tests Only
```bash
npm run test:unit
npm run test:unit -- --watch  # Watch mode
```

### Build Only
```bash
npm run build
```

### E2E Tests Only
```bash
npm run test
npm run test -- --ui  # Interactive UI mode
```

## CI vs Local

### What CI Runs (GitHub Actions)
- ✅ Type check
- ✅ Lint
- ✅ Unit tests
- ✅ Build verification
- ✅ E2E tests (full suite)

### What Pre-Commit Hook Runs
- ✅ Type check
- ✅ Lint
- ✅ Unit tests
- ✅ Build verification
- ⏭️ E2E tests (skipped by default for speed)

**Recommendation:** Run `npm run pre-commit:quick` before committing, then let CI run the full E2E suite on push.

## Advanced: Using `act` for Full Local CI

To run the exact GitHub Actions workflows locally:

### Install act
```bash
# macOS
brew install act

# Other platforms: https://github.com/nektos/act
```

### Run CI Workflow Locally
```bash
# Run the full CI workflow
act -j test-unit    # Run unit tests job only
act -j build        # Run build job only
act -j test-e2e     # Run E2E tests job only

# Run all CI jobs
act push
```

**Note:** `act` requires Docker and can be slower than the pre-commit script.

## Troubleshooting

### Hook Not Running
```bash
# Check if hook exists and is executable
ls -la .git/hooks/pre-commit

# Make it executable if needed
chmod +x .git/hooks/pre-commit
```

### Tests Failing
```bash
# Run checks individually to isolate the issue
npm run check        # Types
npm run lint         # Linting
npm run test:unit    # Unit tests
npm run build        # Build
```

### Hook Too Slow
```bash
# Skip E2E tests (default behavior)
# Edit .git/hooks/pre-commit and ensure it uses --skip-e2e flag
```

### Reset Hook to Default
```bash
rm .git/hooks/pre-commit
./scripts/pre-commit-ci.sh  # Test manually first
cp .github/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## Best Practices

1. **Run `npm run pre-commit:quick` before committing** - Catches most issues fast
2. **Let CI run full E2E suite** - Don't block local development with slow tests
3. **Fix issues immediately** - Don't bypass the hook unless necessary
4. **Use `--no-verify` sparingly** - Only for WIP commits or hotfixes

## Example Workflow

```bash
# Make changes
vim src/lib/some-file.ts

# Run quick validation
npm run pre-commit:quick

# If tests pass, commit
git add .
git commit -m "feat: add new feature"
# ✅ Hook runs automatically and passes

# Push to GitHub
git push origin main
# ✅ CI runs full suite including E2E tests
```
