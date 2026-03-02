# Plan: E2E Testing Infrastructure

Establish a robust E2E testing framework with `vscode-extension-tester` and a mock Ollama server.

## Phase 1: Infrastructure & Basic Interaction [checkpoint: 596aafc]

1. [x] **Setup Mock Ollama Server**: Implement a lightweight Express server to mock Ollama API endpoints (`/api/pull`, `/api/tags`, `/api/show`). 596aafc
2. [x] **Add VS Code Extension Tester**: Configure dependencies and basic test structure in `src/test/e2e/`. 596aafc
3. [x] **Dynamic Setting Update**: Update the E2E test to dynamically change `ollama-view.apiUrl` to point to the mock server's port. 596aafc
4. [x] **Automated Pull & Verify Test**: 596aafc
    - [x] Execute `ollamaView.pull` via command palette. 596aafc
    - [x] Input model name into `InputBox`. 596aafc
    - [x] Verify success notification. 596aafc
    - [x] Verify model appears in the Tree View. 596aafc
5. [x] **CI/Headless Loading Fix**: Ensure extension loads correctly in test instance using the `-C` flag. 596aafc
6. [x] **Test Discovery Fixes**: Update unit and integration test runners to exclude E2E tests and prevent interface conflicts. 596aafc
7. [x] **Linting & Style Compliance**: Ensure all new test code follows project standards. 596aafc

## Manual Verification Plan

1. **Run E2E Tests**: Execute `npm run test:e2e`.
2. **Observe VS Code Instance**: A separate VS Code instance should open, navigate to the Ollama View, and pull a model.
3. **Check Console Output**: Verify the tests pass and coverage is reported.
