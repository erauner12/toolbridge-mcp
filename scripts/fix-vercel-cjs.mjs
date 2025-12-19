/**
 * Post-build script to fix Vercel function for CommonJS compatibility.
 *
 * The xmcp bundler outputs CommonJS-style code with require() calls,
 * but copies package.json with "type": "module" to the function directory.
 * This script removes the "type" field so Node.js treats the bundle as CJS.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const vercelOutput = '.vercel/output';
const functionsDir = join(vercelOutput, 'functions');

/**
 * Recursively find all package.json files in the functions directory
 */
function findPackageJsonFiles(dir, files = []) {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        findPackageJsonFiles(fullPath, files);
      } else if (entry.name === 'package.json') {
        files.push(fullPath);
      }
    }
  } catch (err) {
    // Directory doesn't exist, that's fine
  }
  return files;
}

const packageJsonFiles = findPackageJsonFiles(functionsDir);

if (packageJsonFiles.length === 0) {
  console.log('No package.json files found in functions, skipping CJS fix');
  process.exit(0);
}

for (const packageJsonPath of packageJsonFiles) {
  try {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    // Remove "type": "module" to allow require() calls
    if (pkg.type === 'module') {
      delete pkg.type;
      writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2));
      console.log(`Fixed ${packageJsonPath}: removed "type": "module"`);
    } else {
      console.log(`${packageJsonPath}: no "type": "module" found`);
    }
  } catch (err) {
    console.error(`Error processing ${packageJsonPath}:`, err.message);
  }
}

console.log('CJS fix complete');
