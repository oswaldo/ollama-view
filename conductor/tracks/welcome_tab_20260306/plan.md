# Implementation Plan: Welcome / What's New Tab (Track: welcome_tab_20260306)

This plan outlines the steps to implement a unified "Welcome / What's New" Webview tab that triggers on first install or major/minor version upgrades.

## Phase 1: Foundation & Version Management
- [ ] Task: Implement Version Checking Logic
    - [ ] Add `VERSION_KEY` constant for `globalState`.
    - [ ] Create a utility function to determine if a version change (Major or Minor) has occurred.
    - [ ] Implement logic to detect if it's a first-time install (no `lastSeenVersion` stored).
- [ ] Task: Create `WelcomePanel` Class
    - [ ] Implement `WelcomePanel` in `src/panels/welcomePanel.ts` following the pattern of `SetupPanel`.
    - [ ] Define the `WelcomeWebviewToExtensionCommand` and `ExtensionToWelcomeWebviewCommand` for type-safe communication.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Foundation & Version Management' (Protocol in workflow.md)

## Phase 2: UI Implementation & Content
- [ ] Task: Create Welcome Webview Entry Point
    - [ ] Create `src/webview/welcome.ts` for frontend logic.
    - [ ] Create `media/welcome.css` for styling, ensuring consistency with existing panels.
- [ ] Task: Implement HTML Structure
    - [ ] Build the "Welcome to Ollama View [Version]" header.
    - [ ] Implement the "What's New" section with hardcoded MVP content.
    - [ ] Implement the "Getting Started" section with collapsible logic.
    - [ ] Ensure "Getting Started" is expanded on first install and collapsed on upgrade.
- [ ] Task: Add Interactive Components
    - [ ] Implement Action Buttons ("Configure Ollama", "Start Chat") and their message handlers.
    - [ ] Add support for embedding GIFs/Videos and external documentation links.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: UI Implementation & Content' (Protocol in workflow.md)

## Phase 3: Integration & Verification
- [ ] Task: Hook into Extension Activation
    - [ ] Update `extension.ts` to call the version check on activation.
    - [ ] Automatically open the `WelcomePanel` if a trigger condition is met.
    - [ ] Update `globalState.lastSeenVersion` AFTER the tab is shown.
- [ ] Task: Add Automated Tests
    - [ ] Write unit tests for the version comparison utility.
    - [ ] Write integration tests for `WelcomePanel` message handling.
    - [ ] Verify that the panel correctly tracks the "first install" vs. "upgrade" state.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Integration & Verification' (Protocol in workflow.md)
