#!/bin/bash
# BDJA Post-CI-Fix Setup Script
# Run this locally after applying the fixes to complete the setup

set -e

echo "========================================"
echo "BDJA CI Fix — Local Setup"
echo "========================================"

# 1. Generate lockfile if missing
if [ ! -f "package-lock.json" ] && [ ! -f "yarn.lock" ] && [ ! -f "pnpm-lock.yaml" ]; then
    echo "Generating package-lock.json..."
    npm install --package-lock-only
    echo "Lockfile generated. Commit it to your repo."
else
    echo "Lockfile already exists."
fi

# 2. Install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm ci 2>/dev/null || npm install
else
    echo "node_modules already exists."
fi

# 3. Run prettier to fix all formatting
echo "Running Prettier..."
npx prettier --write "**/*.{ts,tsx,js,jsx,json,md,css,html}" 2>/dev/null || echo "Prettier not available, skipping format."

# 4. Verify build
echo "Running TypeScript check..."
npx tsc --noEmit 2>/dev/null || echo "TypeScript errors found — review the output above."

echo "========================================"
echo "Setup complete. Review changes and commit."
echo "========================================"
