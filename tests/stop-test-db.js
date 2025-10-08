#!/usr/bin/env node
/**
 * Node.js script to stop the PostgreSQL test database
 * Works cross-platform (Windows, macOS, Linux)
 */

import { execSync } from 'child_process';

const CONTAINER_NAME = 'music-label-test-db';

console.log('\n🛑 Stopping PostgreSQL test database...\n');

// Helper to run command and return output
function run(command, options = {}) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
  } catch (error) {
    if (options.ignoreError) {
      return null;
    }
    throw error;
  }
}

// Check if Docker is running
try {
  run('docker ps', { silent: true });
} catch (error) {
  console.error('❌ Error: Docker is not running or not installed!');
  console.error('Please start Docker Desktop and try again.\n');
  process.exit(1);
}

// Get list of running containers
const runningContainers = run('docker ps --format "{{.Names}}"', { silent: true }) || '';
const containerRunning = runningContainers.split('\n').includes(CONTAINER_NAME);

if (containerRunning) {
  console.log('🛑 Stopping container...\n');
  run(`docker stop ${CONTAINER_NAME}`);
  console.log('✅ Test database stopped!\n');
} else {
  console.log('ℹ️  Test database is not running\n');
}
