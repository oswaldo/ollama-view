# Implementation Plan: Comprehensive E2E Test Suite Expansion

## Phase 1: Foundation & Infrastructure Refactoring
This phase focuses on setting up the structural foundation for the new E2E suite, refactoring the existing mock server, and establishing global setup/teardown hooks.

- [x] Task: Create directory structure for E2E helpers and fixtures (`src/test/e2e/helpers`, `src/test/e2e/fixtures`). [242a14a]
- [x] Task: Refactor `MockOllamaServer` to support dynamic state and per-test configuration (e.g., error simulation). [8b5e27c]
- [x] Task: Implement `FixtureFactory` for generating dynamic model and chat response data. [bcb4f29]
- [x] Task: Create a base `e2eTestSetup` utility to handle VS Code settings (API URL) and view initialization. [59e3bd9]
- [ ] Task: Conductor - User Manual Verification 'Foundation & Infrastructure Refactoring' (Protocol in workflow.md)

## Phase 2: Action-Based Helpers
Implementing the core UI interaction helpers to decouple test scripts from `vscode-extension-tester` primitives.

- [ ] Task: Implement `SidebarHelpers` (listing, context menus, tree interactions).
- [ ] Task: Implement `ChatHelpers` (opening panel, sending messages, editing, branching).
- [ ] Task: Implement `SetupHelpers` (parameter modification, system prompt editing).
- [ ] Task: Implement `FramingHelpers` (navigating framing library, CRUD operations).
- [ ] Task: Conductor - User Manual Verification 'Action-Based Helpers' (Protocol in workflow.md)

## Phase 3: Sidebar & Model Management Tests
Complete coverage for all sidebar-related features.

- [ ] Task: Test model pulling, starting, stopping, and deleting flows.
- [ ] Task: Test tree view refresh and status indicator updates.
- [ ] Task: Test model-specific context menu actions.
- [ ] Task: Conductor - User Manual Verification 'Sidebar & Model Management Tests' (Protocol in workflow.md)

## Phase 4: Interactive Chat Panel Tests
In-depth testing of the chat experience, including streaming and history management.

- [ ] Task: Test basic message exchange (user message -> streaming response).
- [ ] Task: Test message editing and regeneration logic.
- [ ] Task: Test conversation branching (creating a new branch from a previous message).
- [ ] Task: Test clearing history and visibility toggles for system messages.
- [ ] Task: Conductor - User Manual Verification 'Interactive Chat Panel Tests' (Protocol in workflow.md)

## Phase 5: Setup & Framing Tests
Validating configuration management and the framing library.

- [ ] Task: Test updating hardware and inference parameters for a model.
- [ ] Task: Test saving and applying configurations.
- [ ] Task: Test framing library CRUD operations and applying framings to models.
- [ ] Task: Conductor - User Manual Verification 'Setup & Framing Tests' (Protocol in workflow.md)

## Phase 6: Expert QA Scenarios & Final Polish
Implementing resilience tests and edge cases.

- [ ] Task: Implement API Resilience tests (timeouts, 500 errors, malformed streams).
- [ ] Task: Implement Complex Chat Flow tests (deep nesting, rapid messaging).
- [ ] Task: Implement Parameter Validation tests (ensuring UI respects range limits).
- [ ] Task: Final review of all tests and documentation update.
- [ ] Task: Conductor - User Manual Verification 'Expert QA Scenarios & Final Polish' (Protocol in workflow.md)
