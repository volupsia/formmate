#!/bin/bash
set -e

# Get the absolute path to the directory containing this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# The context root is two levels up from the script (formmate/deploy -> formmate -> root)
# The Dockerfile assumes the context contains 'formmate' and 'formcms' folders.
CONTEXT_ROOT="$SCRIPT_DIR/../.."

echo "Building Docker image..."
echo "Context: $CONTEXT_ROOT"
echo "Dockerfile: $SCRIPT_DIR/Dockerfile"

# Build the image
# We tag it as 'formcms-app:latest' by default
docker build -t formcms-app:latest -f "$SCRIPT_DIR/Dockerfile" "$CONTEXT_ROOT"

echo "Build complete! Image tagged as 'formcms-app:latest'"
