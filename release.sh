#!/bin/bash

# ===========================================
#   Scoreboard Release Script
# ===========================================

set -e

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

confirm() {
    local prompt="$1"
    local default="${2:-Y}"
    local prompt_suffix

    if [ "$default" == "Y" ]; then
        prompt_suffix="[Y/n]"
    else
        prompt_suffix="[y/N]"
    fi

    while true; do
        read -p "$prompt $prompt_suffix: " choice
        if [ -z "$choice" ]; then
            choice="$default"
        fi
        case "$choice" in
            y|Y ) echo "yes"; return;;
            n|N ) echo "no"; return;;
            * ) echo "Please answer y or n.";;
        esac
    done
}

echo ""
echo -e "${CYAN}${BOLD}==========================================="
echo -e "   Scoreboard Release Script"
echo -e "===========================================${NC}"
echo ""

# --- Sicherstellen dass wir auf main sind ---
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${RED}ERROR: You are on branch '$CURRENT_BRANCH'. Please switch to 'main' first.${NC}"
    exit 1
fi

# --- Git Status prüfen ---
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}WARNING: You have uncommitted changes:${NC}"
    git status --short
    echo ""
    if [ "$(confirm "Commit all changes before release?")" == "yes" ]; then
        read -p "Commit message: " COMMIT_MSG
        git add -A
        git commit -m "$COMMIT_MSG"
    else
        echo -e "${RED}Aborted. Please commit or stash your changes first.${NC}"
        exit 1
    fi
fi

# --- Aktuelle Version lesen ---
CURRENT_VERSION=$(grep '"version"' package.json | head -n 1 | cut -d'"' -f4)
echo -e "Current version: ${BOLD}$CURRENT_VERSION${NC}"
echo ""

# --- Neue Version wählen ---
MAJOR=$(echo $CURRENT_VERSION | cut -d. -f1)
MINOR=$(echo $CURRENT_VERSION | cut -d. -f2)
PATCH=$(echo $CURRENT_VERSION | cut -d. -f3)

NEXT_PATCH="$MAJOR.$MINOR.$((PATCH + 1))"
NEXT_MINOR="$MAJOR.$((MINOR + 1)).0"
NEXT_MAJOR="$((MAJOR + 1)).0.0"

echo "Choose version bump:"
echo "  1) patch  → $NEXT_PATCH"
echo "  2) minor  → $NEXT_MINOR"
echo "  3) major  → $NEXT_MAJOR"
echo "  4) custom"
echo ""

read -p "Selection [1]: " VERSION_CHOICE
VERSION_CHOICE=${VERSION_CHOICE:-1}

case "$VERSION_CHOICE" in
    1) NEW_VERSION="$NEXT_PATCH";;
    2) NEW_VERSION="$NEXT_MINOR";;
    3) NEW_VERSION="$NEXT_MAJOR";;
    4)
        read -p "Enter custom version: " NEW_VERSION
        if [ -z "$NEW_VERSION" ]; then
            echo -e "${RED}No version entered. Aborted.${NC}"
            exit 1
        fi
        ;;
    *)
        echo -e "${RED}Invalid choice. Aborted.${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "Releasing version: ${GREEN}${BOLD}$NEW_VERSION${NC}"
if [ "$(confirm "Continue?")" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

# --- Version in package.json und package-lock.json setzen ---
echo ""
echo -e "${BOLD}--- Step 1: Update version in package.json ---${NC}"
sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" package.json
echo "Updating package-lock.json..."
npm install --package-lock-only --silent
echo -e "${GREEN}✔ Version updated to $NEW_VERSION${NC}"

# --- Commit ---
echo ""
echo -e "${BOLD}--- Step 2: Commit release ---${NC}"
git add package.json package-lock.json
git commit -m "chore: release v$NEW_VERSION"
echo -e "${GREEN}✔ Committed: chore: release v$NEW_VERSION${NC}"

# --- Tag erstellen ---
echo ""
echo -e "${BOLD}--- Step 3: Create & push tag ---${NC}"
git tag "v$NEW_VERSION"
echo -e "${GREEN}✔ Tag v$NEW_VERSION created${NC}"

# --- Push ---
if [ "$(confirm "Push commit and tag to origin/main?")" == "yes" ]; then
    git push origin main
    git push origin "v$NEW_VERSION"
    echo ""
    echo -e "${GREEN}${BOLD}✅ Release v$NEW_VERSION pushed! GitHub Actions will build the installer now.${NC}"
    echo -e "   → https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]//' | sed 's/.git$//')/releases"
else
    echo ""
    echo -e "${YELLOW}Tag created locally but not pushed. Run manually:${NC}"
    echo "  git push origin main && git push origin v$NEW_VERSION"
fi

echo ""
