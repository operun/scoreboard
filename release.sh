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

# --- Changelog aktualisieren ---
echo ""
echo -e "${BOLD}--- Step 1: Update changelog ---${NC}"
CHANGELOG_FILE="docs/CHANGELOG.md"
RELEASE_DATE=$(date +%Y-%m-%d)

if [ ! -f "$CHANGELOG_FILE" ]; then
    echo -e "${YELLOW}⚠ $CHANGELOG_FILE not found — skipping changelog update.${NC}"
elif ! grep -q '^## \[Unreleased\]' "$CHANGELOG_FILE"; then
    echo -e "${YELLOW}⚠ No '## [Unreleased]' section found — skipping changelog update.${NC}"
else
    # Preview the entries that will be released
    UNRELEASED_CONTENT=$(awk '/^## \[Unreleased\]/{f=1; next} /^## \[/{if(f) exit} f' "$CHANGELOG_FILE")
    if [ -z "$(echo "$UNRELEASED_CONTENT" | tr -d '[:space:]')" ]; then
        echo -e "${YELLOW}⚠ The [Unreleased] section is empty.${NC}"
        if [ "$(confirm "Continue without changelog entries?" "N")" != "yes" ]; then
            echo -e "${RED}Aborted. Add your changelog entries under [Unreleased] first.${NC}"
            exit 1
        fi
    else
        echo -e "These [Unreleased] entries will be released as ${BOLD}$NEW_VERSION${NC}:"
        echo "$UNRELEASED_CONTENT"
        echo ""
    fi

    # Stamp [Unreleased] with version + date, leave a fresh empty [Unreleased] on top
    awk -v ver="$NEW_VERSION" -v date="$RELEASE_DATE" '
        !done && $0 == "## [Unreleased]" {
            print "## [Unreleased]"
            print ""
            print "## [" ver "] - " date
            done=1
            next
        }
        { print }
    ' "$CHANGELOG_FILE" > "$CHANGELOG_FILE.tmp" && mv "$CHANGELOG_FILE.tmp" "$CHANGELOG_FILE"

    echo -e "${GREEN}✔ Changelog updated: [Unreleased] → [$NEW_VERSION] - $RELEASE_DATE${NC}"
fi

# --- Version in package.json und package-lock.json setzen ---
echo ""
echo -e "${BOLD}--- Step 2: Update version in package.json ---${NC}"
sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" package.json
echo "Updating package-lock.json..."
npm install --package-lock-only --silent
echo -e "${GREEN}✔ Version updated to $NEW_VERSION${NC}"

# --- Commit ---
echo ""
echo -e "${BOLD}--- Step 3: Commit release ---${NC}"
git add package.json package-lock.json
if [ -f "$CHANGELOG_FILE" ]; then
    git add "$CHANGELOG_FILE"
fi
git commit -m "chore: release v$NEW_VERSION"
echo -e "${GREEN}✔ Committed: chore: release v$NEW_VERSION${NC}"

# --- Tag erstellen ---
echo ""
echo -e "${BOLD}--- Step 4: Create & push tag ---${NC}"
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
