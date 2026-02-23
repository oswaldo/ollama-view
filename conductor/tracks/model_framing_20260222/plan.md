# Implementation Plan: Rename to Model Framing & Chat Overrides

This plan covers the global rename of "Templates" to "Model Framings" and the implementation of chat-level framing overrides.

## Phase 1: Global Refactor & Renaming
Rename all "Template" related terminology, files, and identifiers to "Model Framing".

- [~] Task: Rename Core Models & Services
    - [ ] Rename `src/models/template.ts` to `src/models/modelFraming.ts`.
    - [ ] Rename `Template` -> `ModelFraming` and `Tag` -> `FramingTag`.
    - [ ] Rename `src/services/templateService.ts` -> `src/services/framingService.ts`.
    - [ ] Update all class/method names (e.g., `TemplateService` -> `FramingService`).
- [ ] Task: Rename UI Components & Commands
    - [ ] Rename `src/providers/templatesProvider.ts` -> `src/providers/framingProvider.ts`.
    - [ ] Rename `src/panels/templateEditorPanel.ts` -> `src/panels/framingEditorPanel.ts`.
    - [ ] Rename all command IDs in `package.json` and code (e.g., `ollamaView.editTemplate` -> `ollamaView.editFraming`).
    - [ ] Update UI labels in HTML and CSS files.
- [ ] Task: Update Tests & Storage Keys
    - [ ] Rename test files and update imports.
    - [ ] Change storage key from `ollama-view.templates` to `ollama-view.framings`.
- [ ] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Chat Data Model & Service Extension
Update the chat message schema to support framing metadata.

- [ ] Task: Update Chat Message Schema
    - [ ] Modify `ChatMessage` in `src/chatService.ts` to include `framingId?: string` and `framingName?: string`.
    - [ ] Modify `Chat` interface to include `activeFramingId?: string`.
- [ ] Task: Update ChatService Persistence
    - [ ] Ensure the new fields are correctly saved and loaded from `globalState`.
    - [ ] Implement logic to handle inherited framing during "Branch" and "Fork" operations.
- [ ] Task: Write Tests for Metadata Persistence
    - [ ] Verify that message framing info survives session restarts.
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Chat Webview UI Enhancements
Implement the framing selector in the chat header and the action menu.

- [ ] Task: Implement Header Selector UI
    - [ ] Add the Framing indicator/button to `media/chat.html` and `media/chat.css`.
    - [ ] Add the clickable logic to `src/webview/chat.ts` to request framing selection.
- [ ] Task: Implement Triple-Dot Menu
    - [ ] Add the menu button after the send button in the chat interface.
    - [ ] Implement the "Apply Framing" option in the menu.
- [ ] Task: Implement Messaging for Framing Selection
    - [ ] Handle selection messages in `src/panels/chatPanel.ts`.
    - [ ] Use `vscode.window.showQuickPick` to let the user select a framing.
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)

## Phase 4: Overriding Logic & API Integration
Implement the core logic that applies the framing to the Ollama API calls.

- [ ] Task: Implement Framing Resolution Logic
    - [ ] In `ChatPanel`, resolve the framing to use (Override vs. Default Model Setup).
- [ ] Task: Handle System Prompt Injections
    - [ ] Logic to detect if the system prompt has changed since the last message in the chat.
    - [ ] Ensure the updated prompt is sent to the API for the next turn.
- [ ] Task: Write Tests for Overriding Logic
    - [ ] Verify that the API receives the custom framing parameters instead of the model defaults.
- [ ] Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md)

## Phase 5: Safety Handling & Final Polish
Implement edge case handling for deleted/renamed framings and finalize UI.

- [ ] Task: Implement Deletion Safety Check
    - [ ] Before sending a message, verify the `activeFramingId` still exists.
    - [ ] Implement the blocking prompt if the framing is missing.
- [ ] Task: Final UI Polish
    - [ ] Ensure consistent spacing and icons across the new header elements.
    - [ ] Verify "Revert to Default" functionality works correctly.
- [ ] Task: Conductor - User Manual Verification 'Phase 5' (Protocol in workflow.md)
