#!/bin/bash
# Build Prisma Lambda Layer
# This script is a wrapper that delegates to scripts/build-prisma-layer.sh
# Kept for backward compatibility
#
# Usage: ./build-prisma-layer.sh

set -e

# Get the absolute path to the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Delegate to the new script location
exec "${SCRIPT_DIR}/scripts/build-prisma-layer.sh" "$@"
