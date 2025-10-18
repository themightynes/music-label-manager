#!/usr/bin/env node
/**
 * Node.js script to reset (recreate) the PostgreSQL test database
 * Use this for a completely fresh database
 * Works cross-platform (Windows, macOS, Linux)
 */

import { execSync } from 'child_process';

const CONTAINER_NAME = 'music-label-test-db';
const POSTGRES_PASSWORD = 'postgres';
const POSTGRES_USER = 'postgres';
const POSTGRES_DB = 'music_label_test';
const HOST_PORT = '5433';
const CONTAINER_PORT = '5432';
const POSTGRES_IMAGE = 'postgres:16-alpine';

console.log('\n🔄 Resetting PostgreSQL test database...\n');

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

// Get list of all containers (running and stopped)
const allContainers = run('docker ps -a --format "{{.Names}}"', { silent: true }) || '';
const containerExists = allContainers.split('\n').includes(CONTAINER_NAME);

if (containerExists) {
  console.log('📦 Removing existing container...\n');
  run(`docker rm -f ${CONTAINER_NAME}`);
  console.log('✅ Existing container removed!\n');
}

console.log('📦 Creating fresh test database container...\n');

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
  console.log('✅ Test database reset complete!\n');
  console.log('🔗 Connection string:');
  console.log(`   postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${HOST_PORT}/${POSTGRES_DB}\n`);
  console.log('🧪 You can now run: npm run test:integration\n');
}, 3000);
