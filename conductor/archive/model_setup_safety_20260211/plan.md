# Implementation Plan: Model Setup and Safety Improvements

## Phase 1: UI Refactoring (Tree View & Context Menu) [x]
- [x] Task: Replace direct "Delete" button with "triple-dot" menu button in the model tree
    - [x] Define the new command for the "triple-dot" button in `package.json`.
    - [x] Update the `TreeItem` decoration in `ollamaProvider.ts` to use the new icon and context menu.
- [x] Task: Implement the context menu with "Setup" and "Delete" options
    - [x] Add "Setup" and "Delete" commands to the context menu in `package.json`.
    - [x] Ensure the "Delete" action triggers the existing deletion logic with a confirmation.
- [x] Task: Conductor - User Manual Verification 'UI Refactoring' (Protocol in workflow.md)

## Phase 2: Persistence and Storage Logic [x]
- [x] Task: Implement the Model Settings Storage service
    - [x] Create a service to manage the JSON storage file in the extension's storage path.
    - [x] Implement methods to get, set, and delete system prompts by model ID.
- [x] Task: Integrate system prompts into chat initialization
    - [x] Update `chatService.ts` or `ollamaApi.ts` to retrieve and include the system prompt when starting a new session.
- [x] Task: Conductor - User Manual Verification 'Persistence and Storage Logic' (Protocol in workflow.md)

## Phase 3: Setup Webview Implementation [x]
- [x] Task: Create the Setup Webview provider and UI
    - [x] Implement a new `WebviewViewProvider` or a standalone Webview panel for "Model Setup".
    - [x] Design the HTML/CSS with a multi-line text area, "Reset", "Save", and "Cancel" buttons.
    - [x] Ensure separation of concerns: HTML/CSS in `media/`, logic in `src/webview/`.
- [x] Task: Implement Webview message handling
    - [x] Handle "save" messages by updating the storage service.
    - [x] Handle "reset" messages by populating the text area with the default prompt.
    - [x] Handle "cancel" by closing the Webview.
- [ ] Task: Conductor - User Manual Verification 'Setup Webview Implementation' (Protocol in workflow.md)

## Phase 4: Integration and Cleanup Logic [x]
- [x] Task: Implement immediate prompt cleanup on model deletion
    - [x] Hook into the deletion command to remove the associated prompt entry.
- [x] Task: Implement orphan cleanup during model list refresh
    - [x] In `ollamaProvider.ts`, compare the list of models from Ollama with the stored prompts and delete orphans.
- [ ] Task: Conductor - User Manual Verification 'Integration and Cleanup Logic' (Protocol in workflow.md)
