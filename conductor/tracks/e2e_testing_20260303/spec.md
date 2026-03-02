# Specification: E2E Testing Infrastructure

## Goal
Establish a robust End-to-End (E2E) testing framework for the Ollama View extension to ensure UI stability and correct integration with the Ollama API without requiring a real Ollama instance.

## Requirements
1. **Automated UI Testing**: Use `vscode-extension-tester` to simulate user interactions within a real VS Code instance.
2. **Ollama API Mocking**: Implement a mock server that replicates the Ollama API (specifically `/api/pull`, `/api/tags`, and `/api/show`) to provide predictable responses for testing.
3. **Dynamic Configuration**: The extension must be able to switch its API URL to the mock server during tests.
4. **CI Compatibility**: Tests must be runnable in a headless environment (using `-C` flag for coverage and extension loading).
5. **Test Scenarios**:
    - Pulling a model via the command palette/input box.
    - Verifying the pulled model appears correctly in the sidebar tree view.

## Success Criteria
- `npm run test:e2e` executes successfully in a clean environment.
- The extension is correctly loaded in the test VS Code instance.
- Pulling a model is verified from initiation to UI update in the tree.
