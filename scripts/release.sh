#!/bin/bash

# Release script for node-x12
# This script builds the npm package, commits the built files, and creates a git tag

set -e  # Exit on error

echo "🚀 Starting release process..."

# Check if we're on the right branch (optional check)
current_branch=$(git branch --show-current)
echo "📍 Current branch: $current_branch"

# Read version from .version file
VERSION=$(cat .version)
echo "📦 Version: $VERSION"

# Confirm before proceeding
read -p "Continue with release v${VERSION}? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Release cancelled"
    exit 1
fi

# Step 1: Build the npm package
echo "🔨 Building npm package..."
deno task build

# Check if build was successful
if [ ! -d "npm" ]; then
    echo "❌ Build failed - npm directory not found"
    exit 1
fi

# Step 2: Force add the npm directory (it's gitignored)
echo "📝 Staging built files..."
git add -f npm/

# Step 3: Commit the built files
echo "💾 Committing built files..."
git commit -m "chore: add built npm files for v${VERSION}" || {
    echo "⚠️  No changes to commit (files may already be committed)"
}

# Step 4: Create/update the tag
echo "🏷️  Creating tag v${VERSION}..."
git tag -f "v${VERSION}" -m "Release v${VERSION}"

# Step 5: Show what will be pushed
echo ""
echo "📋 Summary:"
echo "   Version: v${VERSION}"
echo "   Tag: v${VERSION}"
echo ""
echo "To push the tag, run:"
echo "   git push origin v${VERSION}"
echo ""
echo "To push the commit and tag together:"
echo "   git push origin ${current_branch} && git push origin v${VERSION}"
echo ""

read -p "Push tag now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📤 Pushing tag..."
    git push origin "v${VERSION}" || {
        echo "⚠️  Tag push failed. You may need to force push:"
        echo "   git push -f origin v${VERSION}"
    }
    echo "✅ Tag pushed successfully!"
else
    echo "⏭️  Skipping push. Push manually when ready."
fi

echo ""
echo "✅ Release process complete!"
echo "   Package can now be installed via:"
echo "   npm install github:muthuka/node-x12#v${VERSION}"

