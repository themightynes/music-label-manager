#!/bin/bash

# Music Label Manager - Server Start Script
# Handles port conflicts and ensures clean startup

PORT=5000
MAX_RETRIES=3
RETRY_COUNT=0

echo "🎵 Starting Music Label Manager Server..."

# Function to check if port is in use
check_port() {
    if command -v nc >/dev/null 2>&1; then
        nc -z localhost $PORT >/dev/null 2>&1
    else
        # Fallback if nc is not available
        ss -tlnp | grep -q ":$PORT " 2>/dev/null
    fi
}

# Function to kill existing processes
cleanup_processes() {
    echo "🧹 Cleaning up existing processes..."
    pkill -f "tsx server/index.ts" 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true
    sleep 2
}

# Main startup loop
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if check_port; then
        echo "⚠️  Port $PORT is in use (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)"
        cleanup_processes
        
        # Wait for port to be released
        echo "⏳ Waiting for port $PORT to be released..."
        sleep 3
        
        RETRY_COUNT=$((RETRY_COUNT + 1))
    else
        echo "✅ Port $PORT is available, starting server..."
        NODE_ENV=development tsx server/index.ts
        exit $?
    fi
done

echo "❌ Failed to start server after $MAX_RETRIES attempts"
echo "💡 Try manually killing all node processes: pkill -9 node"
exit 1