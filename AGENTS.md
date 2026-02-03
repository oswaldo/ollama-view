# AGENTS.md

> **Note**: This file is intended to provide context and instructions for AI agents working on this project (`ollama-view`).

## 1. Project Overview

**Name**: `ollama-view`
**Description**: A Visual Studio Code extension to manage locally installed Ollama models. It allows users to view, start, stop, and delete models, as well as chat with them directly from the editor.
**Current Version**: `0.0.2` (See `package.json`)

## 2. Architecture & Tech Stack

- **Platform**: Visual Studio Code Extension (Node.js).
- **Language**: TypeScript (**Strict Mode**).
- **Runtime**: Node.js v18.x (as per `CONTRIBUTING.md`).
- **Core Components**:
    - **Sidebar Provider**: `TreeDataProvider` for listing models and chats.
    - **Webview**: For the chat interface (HTML/CSS/JS running inside VS Code).
    - **Ollama API**: HTTP communication with the local Ollama instance (default: `http://127.0.0.1:11434`).
    - **State Management**: VS Code `globalState` for persisting chat history.

## 3. Development Workflow

### Setup
1.  **Install Dependencies**: `npm install`
2.  **Build**: `npm run compile`

### Running
- Press `F5` in VS Code to launch the **Extension Development Host**.
- Ensure `ollama serve` is running locally.

### Testing
- **Framework**: Mocha
- **Run Tests**: `npm test`
- **Linting**: `npm run lint` (ESLint) - **MUST PASS** before any commit.
- **Formatting**: `npx prettier --write .`

## 4. Coding Standards

- **Style**: Follow existing TypeScript patterns. Use Prettier for formatting.
- **Async/Await**: Prefer `async/await` over raw Promises.
- **Types**: Use explicit types. Avoid `any` where possible.
- **VS Code API**: Use `vscode` namespace features (e.g., `vscode.window.showInformationMessage`) for native integration.
- **Webview UI**: For the chat interface, ensure a "Premium" look and feel (Modern CSS, responsiveness) as per general agent design guidelines, while respecting VS Code theming (`var(--vscode-*)` CSS variables).
- **Backward Compatibility**: Essential for this project. New features must maintain compatibility with existing workflows and data. All structural changes must be verified with unit tests.

## 5. File Structure and Navigation

- `src/`: Source code.
  - `extension.ts`: Entry point.
  - `*Provider.ts`: Data providers for views.
- `media/`: Static assets (icons, CSS/JS for webviews).
- `package.json`: Manifest, command definitions, and view containers.
- `scope.md`: Tracks project goals, requirements, and completed features. **Check this before starting new tasks.**

## 6. Agent Rules

- **Context Awareness & Scope**: Always read `scope.md` to understand the current feature set and roadmap.
    - **Feature Implementation**: Verify if new features are planned in `scope.md`. If not, add them to `scope.md` for consistency.
    - **Releases**: Review and update `scope.md` during releases to ensure it reflects the current state of the project.
- **Safety**: Do not commit secrets. This is a local-first extension, so avoid external API calls unless the user explicitly configures them.
- **User Feedback**: Creating new files or significant refactors requires user approval via `implementation_plan.md`.
- **Documentation & Release**:
    - **Keep README Current**: Update `README.md` to reflect any relevant changes (new features, config options) when preparing a release.
    - **Release Notes**: Update the "Release Notes" section in `README.md` with a header `### [Version] - [Short Description]` and bullet points describing key changes.

## 7. Data Compatibility & Migration

- **Chat Data Versioning**: The initial internal JSON representation of chats is implicitly **Version 1**.
    - If no `chatFormat` element is present, the data is assumed to be **Version 1**.
    - Future versions MUST include a `chatFormat` element indicating the specific version.
- **Migration Policy**:
    - If the data structure needs to change (Version N → N+1), you **MUST** create unit tests proving that Version N data is automatically migrated or transparently supported by the new code.
    - **Forward Compatibility**: Endeavor to keep the data structure compatible with previous versions of the extension (e.g., additive changes). Ideally, an older plugin version should still work with the new structure.
