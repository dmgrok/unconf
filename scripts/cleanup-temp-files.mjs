#!/usr/bin/env node

/**
 * Automated Cleanup Script
 * Removes temporary files based on .cleanup-tracker.json configuration
 * Run weekly or manually with: node scripts/cleanup-temp-files.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const TRACKER_FILE = path.join(ROOT_DIR, '.cleanup-tracker.json');
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose') || DRY_RUN;

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function loadTracker() {
  try {
    const content = fs.readFileSync(TRACKER_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    log(`Error loading tracker file: ${error.message}`, 'red');
    process.exit(1);
  }
}

function saveTracker(tracker) {
  if (DRY_RUN) {
    log('DRY RUN: Would save tracker file', 'yellow');
    return;
  }
  
  tracker.lastCleanup = new Date().toISOString();
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  tracker.nextCleanup = nextWeek.toISOString();
  
  fs.writeFileSync(TRACKER_FILE, JSON.stringify(tracker, null, 2), 'utf-8');
}

function isExpired(keepUntilDate) {
  if (!keepUntilDate) return false;
  const expiry = new Date(keepUntilDate);
  const now = new Date();
  return now > expiry;
}

function shouldCleanup(filePath, tracker) {
  // Check if file is in permanent list
  if (tracker.permanentFiles.includes(filePath)) {
    return false;
  }
  
  // Check if file matches exclude patterns
  const excludePatterns = tracker.autoCleanupRules.excludePatterns || [];
  for (const pattern of excludePatterns) {
    if (matchesPattern(filePath, pattern)) {
      return false;
    }
  }
  
  // Check if file is tracked and expired
  const tempFile = tracker.temporaryFiles[filePath];
  if (tempFile && isExpired(tempFile.keepUntil)) {
    return true;
  }
  
  // Check if file matches cleanup patterns
  const patterns = tracker.autoCleanupRules.patterns || [];
  for (const pattern of patterns) {
    if (matchesPattern(filePath, pattern)) {
      // Check age if file exists
      const fullPath = path.join(ROOT_DIR, filePath);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        const ageInDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
        const maxAge = tracker.autoCleanupRules.maxAgeInDays || 7;
        if (ageInDays > maxAge) {
          return true;
        }
      }
    }
  }
  
  return false;
}

function matchesPattern(filePath, pattern) {
  // Simple glob pattern matching
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\{([^}]+)\}/g, '($1)'.replace(/,/g, '|'));
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(filePath);
}

function deleteFile(filePath) {
  const fullPath = path.join(ROOT_DIR, filePath);
  
  if (!fs.existsSync(fullPath)) {
    if (VERBOSE) {
      log(`  File doesn't exist: ${filePath}`, 'gray');
    }
    return false;
  }
  
  if (DRY_RUN) {
    log(`  Would delete: ${filePath}`, 'yellow');
    return true;
  }
  
  try {
    fs.unlinkSync(fullPath);
    log(`  ✓ Deleted: ${filePath}`, 'green');
    return true;
  } catch (error) {
    log(`  ✗ Failed to delete ${filePath}: ${error.message}`, 'red');
    return false;
  }
}

function cleanupFiles() {
  log('\n🧹 Starting automated cleanup...', 'blue');
  
  if (DRY_RUN) {
    log('DRY RUN MODE - No files will be deleted\n', 'yellow');
  }
  
  const tracker = loadTracker();
  let deletedCount = 0;
  let skippedCount = 0;
  
  // Check tracked temporary files
  log('\n📋 Checking tracked temporary files:', 'blue');
  for (const [filePath, info] of Object.entries(tracker.temporaryFiles)) {
    if (shouldCleanup(filePath, tracker)) {
      if (VERBOSE) {
        log(`\n  ${filePath}`, 'gray');
        log(`    Purpose: ${info.purpose}`, 'gray');
        log(`    Status: ${info.status}`, 'gray');
        log(`    Keep until: ${info.keepUntil}`, 'gray');
      }
      
      if (deleteFile(filePath)) {
        deletedCount++;
        // Remove from tracker
        delete tracker.temporaryFiles[filePath];
      }
    } else {
      skippedCount++;
      if (VERBOSE) {
        const daysLeft = info.keepUntil 
          ? Math.ceil((new Date(info.keepUntil) - new Date()) / (1000 * 60 * 60 * 24))
          : 'N/A';
        log(`  Keeping: ${filePath} (${daysLeft} days left)`, 'gray');
      }
    }
  }
  
  // Scan for files matching cleanup patterns
  log('\n📁 Scanning for auto-cleanup patterns:', 'blue');
  const patterns = tracker.autoCleanupRules.patterns || [];
  
  for (const pattern of patterns) {
    const matchedFiles = findMatchingFiles(pattern, tracker);
    for (const filePath of matchedFiles) {
      if (!tracker.temporaryFiles[filePath] && shouldCleanup(filePath, tracker)) {
        if (VERBOSE) {
          log(`\n  Found untracked file: ${filePath}`, 'gray');
        }
        if (deleteFile(filePath)) {
          deletedCount++;
        }
      }
    }
  }
  
  // Save updated tracker
  saveTracker(tracker);
  
  // Summary
  log('\n' + '='.repeat(50), 'blue');
  log(`📊 Cleanup Summary:`, 'blue');
  log(`  Files deleted: ${deletedCount}`, deletedCount > 0 ? 'green' : 'gray');
  log(`  Files kept: ${skippedCount}`, 'gray');
  log(`  Next cleanup: ${tracker.nextCleanup || 'Not scheduled'}`, 'blue');
  log('='.repeat(50) + '\n', 'blue');
  
  if (DRY_RUN) {
    log('💡 Run without --dry-run to actually delete files\n', 'yellow');
  }
}

function findMatchingFiles(pattern, tracker) {
  const files = [];
  
  // Extract directory from pattern
  const parts = pattern.split('/');
  const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '.';
  const filePattern = parts[parts.length - 1];
  
  const dirPath = path.join(ROOT_DIR, dir);
  if (!fs.existsSync(dirPath)) {
    return files;
  }
  
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isFile()) {
      const relPath = path.join(dir, entry.name).replace(/\\/g, '/');
      if (matchesPattern(relPath, pattern)) {
        files.push(relPath);
      }
    }
  }
  
  return files;
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupFiles();
}

export { cleanupFiles, loadTracker, shouldCleanup };
