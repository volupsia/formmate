#!/bin/bash

# Source README
SRC="readme.md"

# Destinations
# Note: Case sensitivity matches the directory names found in parent dir
DEST_FORMCMS="../formcms/readme.md"
DEST_ADMIN="../FormCmsAdminApp/README.md"
DEST_PORTAL="../FormCmsPortal/README.md"

echo "Syncing README.md from formmate to other repositories..."

# Copy to formcms
if [ -d "../formcms" ]; then
    cp "$SRC" "$DEST_FORMCMS"
    echo "✅ Updated $DEST_FORMCMS"
else
    echo "⚠️  Skipped $DEST_FORMCMS (Directory not found)"
fi

# Copy to FormCmsAdminApp
if [ -d "../FormCmsAdminApp" ]; then
    cp "$SRC" "$DEST_ADMIN"
    echo "✅ Updated $DEST_ADMIN"
else
    echo "⚠️  Skipped $DEST_ADMIN (Directory not found)"
fi

# Copy to FormCmsPortal
if [ -d "../FormCmsPortal" ]; then
    cp "$SRC" "$DEST_PORTAL"
    echo "✅ Updated $DEST_PORTAL"
else
    echo "⚠️  Skipped $DEST_PORTAL (Directory not found)"
fi

echo "Sync complete."
