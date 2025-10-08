#!/usr/bin/env node
/**
 * Node.js script to start the PostgreSQL test database in Docker
 * Works cross-platform (Windows, macOS, Linux)
 */

import { execSync } from 'child_process';

const CONTAINER_NAME = 'music-label-test-db';
const POSTGRES_PASSWORD = 'testpassword';
const POSTGRES_USER = 'testuser';
const POSTGRES_DB = 'music_label_test';
const HOST_PORT = '5433';
const CONTAINER_PORT = '5432';
const POSTGRES_IMAGE = 'postgres:16-alpine';

console.log('\n🐘 Starting PostgreSQL test database...\n');

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

// Get list of all containers
const allContainers = run('docker ps -a --format "{{.Names}}"', { silent: true }) || '';
const containerExists = allContainers.split('\n').includes(CONTAINER_NAME);

if (containerExists) {
  console.log('📦 Container exists, checking status...\n');

  // Get list of running containers
  const runningContainers = run('docker ps --format "{{.Names}}"', { silent: true }) || '';
  const containerRunning = runningContainers.split('\n').includes(CONTAINER_NAME);

  if (containerRunning) {
    console.log('✅ Test database is already running!\n');
  } else {
    console.log('🔄 Starting existing container...\n');
    run(`docker start ${CONTAINER_NAME}`);
    console.log('✅ Test database started!\n');
  }
} else {
  console.log('📦 Creating new test database container...\n');

  run(`docker run -d \
    --name ${CONTAINER_NAME} \
    -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD} \
    -e POSTGRES_USER=${POSTGRES_USER} \
    -e POSTGRES_DB=${POSTGRES_DB} \
    -p ${HOST_PORT}:${CONTAINER_PORT} \
    ${POSTGRES_IMAGE}`);

  console.log('⏳ Waiting for database to be ready...');
  // Wait for database to be ready
  setTimeout(() => {
    console.log('✅ Test database created and started!\n');
  }, 3000);
}
