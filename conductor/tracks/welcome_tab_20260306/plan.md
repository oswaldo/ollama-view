# Implementation Plan: Welcome / What's New Tab (Track: welcome_tab_20260306)

This plan outlines the steps to implement a unified "Welcome / What's New" Webview tab that triggers on first install or major/minor version upgrades, with enhanced onboarding actions.

## Phase 1: Foundation & Version Management
- [x] Task: Implement Version Checking Logic [checkpoint: 078ffc4]
    - [x] Add `VERSION_KEY` constant for `globalState`.
    - [x] Create a utility function to determine if a version change (Major or Minor) has occurred.
    - [x] Implement logic to detect if it's a first-time install (no `lastSeenVersion` stored).
- [x] Task: Create `WelcomePanel` Class [checkpoint: 078ffc4]
    - [x] Implement `WelcomePanel` in `src/panels/welcomePanel.ts` following the pattern of `SetupPanel`.
    - [x] Define the `WelcomeWebviewToExtensionCommand` and `ExtensionToWelcomeWebviewCommand` for type-safe communication.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Foundation & Version Management' (Protocol in workflow.md)

## Phase 2: Command Enhancements for Onboarding
- [x] Task: Update `ollamaView.setup` for Global/First-Time Use
    - [x] Modify `extension.ts` to handle `undefined` nodes in `ollamaView.setup`.
    - [x] If no node, show a QuickPick of available models or open the API URL setting if none exist.
- [x] Task: Enhance `ollamaView.startChat` for Unified Flow
    - [x] Update `ChatCommands.startChat` to offer a model download if no models are available.
    - [x] Chain the `pull` operation into an immediate `createChat` upon completion.
- [~] Task: Conductor - User Manual Verification 'Phase 2: Command Enhancements for Onboarding' (Protocol in workflow.md)

## Phase 3: UI Implementation & Content
- [x] Task: Create Welcome Webview Entry Point
    - [x] Create `src/webview/welcome.ts` for frontend logic.
    - [x] Create `media/welcome.css` for styling, ensuring consistency with existing panels.
- [x] Task: Implement HTML Structure
    - [x] Build the "Welcome to Ollama View [Version]" header.
    - [x] Implement the "What's New" section with hardcoded MVP content.
    - [x] Implement the "Getting Started" section with collapsible logic.
    - [x] Ensure "Getting Started" is expanded on first install and collapsed on upgrade.
- [x] Task: Add Interactive Components
    - [x] Implement Action Buttons ("Start Chat", "Add a Model", "Configure Connection") and their handlers.
    - [x] Add support for embedding GIFs/Videos and external documentation links.
- [~] Task: Conductor - User Manual Verification 'Phase 3: UI Implementation & Content' (Protocol in workflow.md)

## Phase 4: Integration & Verification
- [x] Task: Hook into Extension Activation
    - [x] Update `extension.ts` to call the version check on activation.
    - [x] Automatically open the `WelcomePanel` if a trigger condition is met.
    - [x] Update `globalState.lastSeenVersion` AFTER the tab is shown.
- [x] Task: Add Discoverability & Manual Trigger
    - [x] Add `ollamaView.showWelcome` command to `package.json` and `extension.ts`.
    - [x] Add "Welcome Screen" button to Setup Panel footer for easy rediscovery.
- [x] Task: Add Automated Tests
    - [x] Write unit tests for the version comparison utility (completed in Phase 1).
    - [x] Verify integration and message handling.
- [~] Task: Conductor - User Manual Verification 'Phase 4: Integration & Verification' (Protocol in workflow.md)
