# Track Specification: Model Setup and Safety Improvements

## Overview
This track focuses on improving the user experience and safety of model management. We will move the "Delete" action to a context menu to prevent accidental deletions and introduce a "Setup" feature to allow users to define a custom system prompt for each model.

## Functional Requirements
*   **Model Tree UI Refactoring:**
    - Replace the direct "Delete" button in the model tree with a "triple-dot" icon button.
    - This button will trigger a context menu containing "Setup" and "Delete" options.
*   **Model Setup Webview:**
    - Create a new Webview for model configuration.
    - Design follows SRP: Separate logic (`.ts`), structure (`.html`), and styling (`.css`).
    - Display model metadata (name, tag, size, etc.) for context.
    - Provide a multi-line text area to edit the model's system prompt.
    - Provide a "Reset" button to restore the default prompt: "You are a helpful AI assistant."
    - Provide "Save" and "Cancel" buttons to manage changes.
*   **System Prompt Persistence:**
    - Store custom system prompts in a dedicated JSON file within the extension's local storage directory.
    - Ensure the system prompt is sent to the Ollama API during chat initialization for that specific model.
*   **Automatic Cleanup:**
    - When a model is deleted via the extension, immediately remove its associated system prompt.
    - During the model list refresh, identify and remove any stored prompts for models that no longer exist in the Ollama instance (handling external deletions).

## Non-Functional Requirements
*   **Safety:** Moving the "Delete" button reduces the risk of destructive actions.
*   **Privacy:** System prompts are stored locally and only shared with the user's local Ollama instance.
*   **Resource Efficiency:** Regular cleanup prevents the accumulation of "orphaned" prompt data.
*   **Architectural Quality:** Adhere to Single Responsibility Principle and promote reuse via clean abstractions.

## Acceptance Criteria
- [ ] The "Delete" button is no longer directly visible on model tree items.
- [ ] Clicking the "triple-dot" button opens a menu with "Setup" and "Delete".
- [ ] Clicking "Setup" opens a Webview showing the correct model info.
- [ ] Saving a custom prompt in the Webview persists it to local storage.
- [ ] Starting a chat with a configured model uses the custom system prompt.
- [ ] Refreshing the model list removes prompts for non-existent models.
- [ ] Deleting a model via the extension removes its prompt data.

## Out of Scope
*   A "Template Gallery" for system prompts (moved to project backlog in `scope.md`).
*   Global system prompts (only model-specific prompts for now).
