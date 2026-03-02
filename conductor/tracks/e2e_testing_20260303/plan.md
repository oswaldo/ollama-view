# Plan: E2E Testing Infrastructure

Establish a robust E2E testing framework with `vscode-extension-tester` and a mock Ollama server.

## Phase 1: Infrastructure & Basic Interaction

1. [x] **Setup Mock Ollama Server**: Implement a lightweight Express server to mock Ollama API endpoints (`/api/pull`, `/api/tags`, `/api/show`).
2. [x] **Add VS Code Extension Tester**: Configure dependencies and basic test structure in `src/test/e2e/`.
3. [x] **Dynamic Setting Update**: Update the E2E test to dynamically change `ollama-view.apiUrl` to point to the mock server's port.
4. [x] **Automated Pull & Verify Test**: 
    - [x] Execute `ollamaView.pull` via command palette.
    - [x] Input model name into `InputBox`.
    - [x] Verify success notification.
    - [x] Verify model appears in the Tree View.
5. [x] **CI/Headless Loading Fix**: Ensure extension loads correctly in test instance using the `-C` flag.
6. [x] **Test Discovery Fixes**: Update unit and integration test runners to exclude E2E tests and prevent interface conflicts.
7. [x] **Linting & Style Compliance**: Ensure all new test code follows project standards.

## Manual Verification Plan

1. **Run E2E Tests**: Execute `npm run test:e2e`.
2. **Observe VS Code Instance**: A separate VS Code instance should open, navigate to the Ollama View, and pull a model.
3. **Check Console Output**: Verify the tests pass and coverage is reported.
