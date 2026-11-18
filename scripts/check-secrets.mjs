/**
 * Post-build secret leak detector.
 *
 * Scans dist/ for:
 * - Known API key variable names (MISTRAL_API_KEY, OPENAI_API_KEY, etc.)
 * - Known API key prefixes (mstrl_, sk-, etc.)
 * - The literal key value (if present in env — without logging it)
 *
 * Exits with code 1 if any match is found.
 * Run as part of `npm run verify`.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const DIST_DIR = 'dist';

// Variable names that should never appear in client bundles
const FORBIDDEN_VARIABLE_NAMES = [
  'MISTRAL_API_KEY',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GOOGLE_API_KEY',
  'COHERE_API_KEY',
  'ROOT_PASSWORD',
  'SERVER_IP',
  'process.env.MISTRAL_API_KEY',
  'process.env.OPENAI_API_KEY',
  'process.env.ANTHROPIC_API_KEY',
];

// Known API key prefixes
const FORBIDDEN_PREFIXES = [
  'mstrl_',       // Mistral
  'sk-',          // OpenAI
  'sk-ant-',      // Anthropic
  'AIza',         // Google
];

// File extensions to scan
const SCAN_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.html', '.css', '.json', '.map']);

async function getAllFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isFile() && SCAN_EXTENSIONS.has(extname(entry.name))) {
      const fullPath = entry.parentPath
        ? join(entry.parentPath, entry.name)
        : join(dir, entry.name);
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  let violations = 0;

  // Collect actual secret values from env (without logging them)
  const secretValues = [];
  for (const varName of ['MISTRAL_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'ROOT_PASSWORD']) {
    const value = process.env[varName];
    if (value && value.length > 5) {
      secretValues.push(value);
    }
  }

  let files;
  try {
    files = await getAllFiles(DIST_DIR);
  } catch {
    console.log(`⚠ ${DIST_DIR}/ not found — skipping secret check.`);
    process.exit(0);
  }

  if (files.length === 0) {
    console.log(`⚠ No files found in ${DIST_DIR}/ — skipping secret check.`);
    process.exit(0);
  }

  console.log(`Scanning ${files.length} files in ${DIST_DIR}/ for secrets...`);

  for (const filePath of files) {
    const content = await readFile(filePath, 'utf-8');

    // Check forbidden variable names
    for (const varName of FORBIDDEN_VARIABLE_NAMES) {
      if (content.includes(varName)) {
        console.error(`✗ FORBIDDEN variable name "${varName}" found in ${filePath}`);
        violations++;
      }
    }

    // Check key prefixes (skip .map and .css — maps can contain anything,
    // and CSS font-face references often produce false positives like "sk-latin-...")
    if (!filePath.endsWith('.map') && !filePath.endsWith('.css')) {
      for (const prefix of FORBIDDEN_PREFIXES) {
        // Look for the prefix followed by at least 10 alphanumeric chars (like a real key)
        const pattern = new RegExp(`${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[A-Za-z0-9_-]{10,}`, 'g');
        const matches = content.match(pattern);
        if (matches) {
          console.error(`✗ Potential API key with prefix "${prefix}" found in ${filePath} (${matches.length} match(es))`);
          violations++;
        }
      }
    }

    // Check actual secret values
    for (const secret of secretValues) {
      if (content.includes(secret)) {
        console.error(`✗ ACTUAL SECRET VALUE detected in ${filePath}`);
        violations++;
      }
    }
  }

  if (violations > 0) {
    console.error(`\n✗ ${violations} secret violation(s) found in ${DIST_DIR}/. Build REJECTED.`);
    process.exit(1);
  }

  console.log(`✓ No secrets found in ${DIST_DIR}/ (${files.length} files scanned).`);
}

main().catch((err) => {
  console.error('Secret check failed:', err.message);
  process.exit(1);
});
