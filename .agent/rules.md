# Project Instructions for AI Assistant

## Documentation Guidelines
- **No Emojis**: Do not use emojis in `README.md`, `TODO.md`, or any other documentation files. Keep the tone professional and clean.
- **Language**: 
  - Code comments and variable names: English.
  - Documentation and commit messages: English.
  - Changelog: German.

## Critical Feedback & Decision Making
- **Critical Questioning**: The AI should **not always agree** with suggestions and plans. It is required to **critically question all decisions, architectural drafts, or implementation plans**.
- **Risk Assessment**: Ask the AI to actively identify and clearly name potential **weaknesses, scaling issues, performance bottlenecks, or unclean dependencies** in the proposed solutions.
- **Summary Before Implementation**: For complex changes (e.g., data model adjustments, API redesign), a **summary of the planned procedure must be displayed before implementation** to avoid unnecessary iterations.

## Architecture & Tech Stack

### Frontend
- **Framework**: Electron
- **CSS**: Bootstrap 5 (via React Bootstrap)

## Coding Standards

### TypeScript/React (Frontend)
- **Components**: Use Bootstrap components (React Bootstrap) whenever possible for the UI.
- **Style**: Components should be functional and typed.

### General
- **Compatibility**: Keep code as simple as possible. Give feedback if we need to clean database, etc.

## Process Management
- **No Automatic Kills**: AI tools (like Antigravity) should **never automatically kill or restart processes** (e.g., `pkill`, `killall`, service restarts).
- **User Control**: If a process needs to be restarted, provide **clear instructions** for the user to execute manually.
- **Rationale**: Prevents zombie processes and gives the user full control over running services.
- **Example**: Instead of running `pkill vite`, instruct: "Please restart the vite server manually with Ctrl+C and then run `vite`"

## File Management
- **No Backup Files**: Do not create backup files (e.g., `.bak`, `.old`) when modifying files. We rely on git for version control.
