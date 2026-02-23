# Implementation Plan: Rename to Model Framing & Chat Overrides

This plan covers the global rename of "Templates" to "Model Framings" and the implementation of chat-level framing overrides.

## Phase 1: Global Refactor & Renaming [checkpoint: 64ffb01]
Rename all "Template" related terminology, files, and identifiers to "Model Framing".

- [x] Task: Rename Core Models & Services 64ffb01
    - [x] Rename `src/models/template.ts` to `src/models/modelFraming.ts`.
    - [x] Rename `Template` -> `ModelFraming` and `Tag` -> `FramingTag`.
    - [x] Rename `src/services/templateService.ts` -> `src/services/framingService.ts`.
    - [x] Update all class/method names (e.g., `TemplateService` -> `FramingService`).
- [x] Task: Rename UI Components & Commands 64ffb01
    - [x] Rename `src/providers/templatesProvider.ts` -> `src/providers/framingProvider.ts`.
    - [x] Rename `src/panels/templateEditorPanel.ts` -> `src/panels/framingEditorPanel.ts`.
    - [x] Rename all command IDs in `package.json` and code (e.g., `ollamaView.editTemplate` -> `ollamaView.editFraming`).
    - [x] Update UI labels in HTML and CSS files.
- [x] Task: Update Tests & Storage Keys 64ffb01
    - [x] Rename test files and update imports.
    - [x] Change storage key from `ollama-view.templates` to `ollama-view.framings`.
- [x] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md) 64ffb01

## Phase 2: Chat Data Model & Service Extension [checkpoint: 7480ba2]
Update the chat message schema to support framing metadata.

- [x] Task: Update Chat Message Schema 7480ba2
    - [x] Modify `ChatMessage` in `src/chatService.ts` to include `framingId?: string` and `framingName?: string`.
    - [x] Modify `Chat` interface to include `activeFramingId?: string`.
- [x] Task: Update ChatService Persistence 7480ba2
    - [x] Ensure the new fields are correctly saved and loaded from `globalState`.
    - [x] Implement logic to handle inherited framing during "Branch" and "Fork" operations.
- [x] Task: Write Tests for Metadata Persistence 7480ba2
    - [x] Verify that message framing info survives session restarts.
- [x] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md) 7480ba2

## Phase 3: Chat Webview UI Enhancements [checkpoint: b0bc595]
Implement the framing selector in the chat header and the action menu.

- [x] Task: Implement Header Selector UI b0bc595
    - [x] Add the Framing indicator/button to `media/chat.html` and `media/chat.css`.
    - [x] Add the clickable logic to `src/webview/chat.ts` to request framing selection.
- [x] Task: Implement Triple-Dot Menu b0bc595
    - [x] Add the menu button after the send button in the chat interface.
    - [x] Implement the "Apply Framing" option in the menu.
- [x] Task: Implement Messaging for Framing Selection b0bc595
    - [x] Handle selection messages in `src/panels/chatPanel.ts`.
    - [x] Use `vscode.window.showQuickPick` to let the user select a framing.
- [x] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md) b0bc595

## Phase 4: Overriding Logic & API Integration [checkpoint: b0bc595]
Implement the core logic that applies the framing to the Ollama API calls.

- [x] Task: Implement Framing Resolution Logic b0bc595
    - [x] In `ChatPanel`, resolve the framing to use (Override vs. Default Model Setup).
- [x] Task: Handle System Prompt Injections b0bc595
    - [x] Logic to detect if the system prompt has changed since the last message in the chat.
    - [x] Ensure the updated prompt is sent to the API for the next turn.
- [x] Task: Write Tests for Overriding Logic b0bc595
    - [x] Verify that the API receives the custom framing parameters instead of the model defaults.
- [x] Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md) b0bc595

## Phase 5: Safety Handling & Final Polish
Implement edge case handling for deleted/renamed framings and finalize UI.

- [x] Task: Implement Deletion Safety Check b0bc595
    - [x] Before sending a message, verify the `activeFramingId` still exists.
    - [x] Implement the blocking prompt if the framing is missing.
- [x] Task: Final UI Polish 321f8b2
    - [x] Ensure consistent spacing and icons across the new header elements.
    - [x] Verify "Revert to Default" functionality works correctly.
- [x] Task: Conductor - User Manual Verification 'Phase 5' (Protocol in workflow.md) 321f8b2

## Phase 6: Logic Refinements (Mismatch Handling & Atomic Edits)
Address framing inconsistencies during Fork/Truncate actions.

- [x] Task: Implement Mismatch Detection in ChatPanel ebd17a8
    - [x] Compare current active framing with target message framing during edit/fork.
    - [x] Implement user prompt to choose framing if a mismatch is detected.
- [x] Task: Atomic Framing State in Webview ebd17a8
    - [x] Update `chat.ts` to backup active framing before entering edit mode.
    - [x] Restore backed-up framing if edit/truncate is cancelled.
- [x] Task: Write Tests for History Logic ebd17a8
    - [x] Verify framing inheritance and mismatch prompts.
- [x] Task: Conductor - User Manual Verification 'Phase 6' (Protocol in workflow.md) ebd17a8

## Phase 7: Message Metadata & Info Modal
Add a detailed information view for individual chat messages.

- [x] Task: Update Message Schema for Model Info 94bf6be
    - [x] Add `modelName` to `ChatMessage` in `src/chatService.ts`.
    - [x] Ensure `modelName` is persisted for every turn (User and Assistant).
- [x] Task: Implement Modal UI in Webview 94bf6be
    - [x] Add modal HTML structure to `media/chat.html`.
    - [x] Add modal styles to `media/chat.css`.
- [x] Task: Implement "Info" Action & Modal Logic 94bf6be
    - [x] Add "Info" option to the message dropdown in `src/webview/chat.ts`.
    - [x] Implement the modal display logic with formatted metadata.
- [x] Task: Write Tests for Turn Metadata 94bf6be
    - [x] Verify that model and framing info is correctly stored in message history.
- [x] Task: Conductor - User Manual Verification 'Phase 7' (Protocol in workflow.md) 94bf6be
