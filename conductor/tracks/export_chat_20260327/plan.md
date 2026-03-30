# Implementation Plan: Export Chat Action

## Phase 1: Export Service (Backend)

- [ ] Task: Create `ExportService` to handle formatting chat history.
    - [ ] Define `IExportService` in `src/contracts/IExportService.ts`.
    - [ ] Implement `ExportService` in `src/services/exportService.ts`.
        - [ ] `toMarkdown(chat: Chat): string`: Formats chat with metadata and messages.
        - [ ] `toJSON(chat: Chat): string`: Returns `JSON.stringify(chat, null, 2)`. **(MUST match internal storage format for future import compatibility)**.
    - [ ] Add unit tests for `ExportService` in `src/test/exportService.test.ts`.
- [ ] Task: Conductor - User Manual Verification 'Export Service (Backend)' (Protocol in workflow.md)

## Phase 2: Commands & UI Integration

- [ ] Task: Implement `exportChat` command in `src/commands/chatCommands.ts`.
    - [ ] Add `exportChat(node: OllamaChatItem)` method to `ChatCommands` class.
    - [ ] Use `vscode.window.showSaveDialog` to get destination.
    - [ ] Use `ExportService` to format the data based on the selected file extension.
    - [ ] Use `vscode.workspace.fs.writeFile` to save the file.
    - [ ] Show success notification with "Open File" action.
- [ ] Task: Register the command and contribute to the context menu in `package.json`.
    - [ ] Add `ollamaView.exportChat` to `commands`.
    - [ ] Add to `menus/view/item/context` for `ollama-chat` context.
- [ ] Task: Update `src/extension.ts` to instantiate and register the new command.
- [ ] Task: Conductor - User Manual Verification 'Commands & UI Integration' (Protocol in workflow.md)

## Phase 3: Verification & E2E Testing

- [ ] Task: Add E2E tests for the export flow in `src/test/e2e/export.test.ts`.
    - [ ] Verify "Export Chat..." appears in the menu.
    - [ ] Verify file creation and content (mocking the save dialog).
- [ ] Task: Conductor - User Manual Verification 'Final Polishing & E2E Testing' (Protocol in workflow.md)
