#!/bin/bash
set -e

# Fast path: reuse pre-compiled /app/dist if source is unchanged.
# The Docker build stores a hash of /app/src at /app/dist/.source-hash.
# If the mounted /app/src matches that hash, skip recompilation (~15-30s on RPi).
CURRENT_HASH=$(find /app/src -name "*.ts" 2>/dev/null | sort | xargs md5sum 2>/dev/null | md5sum | awk '{print $1}')
CACHED_HASH=$(cat /app/dist/.source-hash 2>/dev/null || echo "nocache")

if [ "$CURRENT_HASH" = "$CACHED_HASH" ] && [ -f /app/dist/index.js ]; then
  DIST_DIR=/app/dist
else
  # Source changed — recompile into /tmp/dist (writable by node user)
  cd /app && npx tsc --outDir /tmp/dist 2>&1 >&2
  ln -s /app/node_modules /tmp/dist/node_modules
  chmod -R a-w /tmp/dist
  DIST_DIR=/tmp/dist
fi

cat > /tmp/input.json
node "$DIST_DIR/index.js" < /tmp/input.json
