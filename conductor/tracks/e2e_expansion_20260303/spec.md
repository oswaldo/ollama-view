# Track Specification: Comprehensive E2E Test Suite Expansion

## Overview
This track aims to expand the existing E2E testing infrastructure of "Ollama View for VS Code" to provide full coverage of all current features and visual components. Following expert QA practices, the suite will be restructured for high maintainability, reusability, and reliability, utilizing a mocked Ollama API for speed and determinism.

## Functional Requirements

### 1. Test Coverage Expansion
The E2E suite must cover the following functional areas:
- **Sidebar & Model Management**:
  - Model listing and status indicators (Running, Starting, Stopping).
  - Pulling, Starting, Stopping, and Deleting models.
  - Refreshing the model list.
  - Model-specific context menus and actions.
- **Interactive Chat Panel**:
  - Opening chat for specific models.
  - Sending and receiving messages (including streaming).
  - Message editing and regeneration.
  - Branching conversations.
  - Clearing chat history.
  - Visibility toggles for system messages/injections.
- **Model Setup & Advanced Config**:
  - Configuring system prompts and templates.
  - Modifying hardware and inference parameters.
  - Saving and applying configurations.
  - Validation of parameter limits.
- **Framing Editor & Library**:
  - Viewing the framing library.
  - Creating, editing, and deleting custom framings.
  - Applying framings to model instances.

### 2. Expert QA Scenarios
- **API Resilience**:
  - Graceful handling of Ollama API timeouts, 404s, and 500 errors.
  - Handling of malformed JSON or unexpected streaming interruptions.
- **Complex Chat Flows**:
  - Deep branching scenarios.
  - High-frequency message sending.
  - Long context handling in the UI.
- **Advanced Parameter Validation**:
  - Ensuring UI constraints match technical limits (e.g., thread counts, memory limits).

## Non-Functional Requirements

### 1. Architecture: Action-Based Helpers
- UI interactions must be encapsulated into reusable helper functions (e.g., `src/test/e2e/helpers/uiHelpers.ts`).
- Avoid direct use of `vscode-extension-tester` primitives in the test scripts themselves.
- Ensure helpers are well-documented and type-safe.

### 2. Data Management: Dynamic Fixture Factory
- Implement a `FixtureFactory` (e.g., `src/test/e2e/fixtures/fixtureFactory.ts`) to generate mock data dynamically.
- The `MockOllamaServer` should be configurable per-test to return specific fixtures or simulate error states.
- Separation between "data definition" (fixtures) and "mock behavior" (server logic).

### 3. Test Organization
- Group tests by feature area (e.g., `chat.test.ts`, `management.test.ts`, `config.test.ts`).
- Use `before` and `after` hooks for consistent setup/teardown of the mock server and VS Code state.
- Implement a centralized `e2eTestRunner` or similar to handle global setup (like configuring the `apiUrl` setting).

## Acceptance Criteria
- [ ] E2E tests exist for all features listed in `product.md`.
- [ ] Tests pass consistently in a CI-like environment (non-interactive).
- [ ] Architecture follows the "Action-Based Helpers" and "Dynamic Fixture Factory" patterns.
- [ ] At least 3 complex QA scenarios (API failure, complex branching, param validation) are implemented.
- [ ] Code coverage for the extension logic (measured during E2E if possible, or ensured by the breadth of the tests) is significantly increased.

## Out of Scope
- Testing against a real Ollama instance (mocked only).
- Performance benchmarking (focus is on functional correctness and UI behavior).
- Testing external VS Code integrations outside the extension's direct scope.
