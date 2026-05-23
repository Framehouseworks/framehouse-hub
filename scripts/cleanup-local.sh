#!/bin/bash
# Deprecated: use './scripts/verify-local.sh down' instead.
echo "⚠  cleanup-local.sh is deprecated. Use: ./scripts/verify-local.sh down"
exec "$(dirname "$0")/verify-local.sh" down
