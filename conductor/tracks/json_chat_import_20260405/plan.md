# Implementation Plan: JSON Chat Import

## Phase 1: Core Import Logic & Validation [checkpoint: cf03cb8]
- [x] Task: Write tests for `ChatService.importChat` collision handling and logic (Overwrite, New, Abort). 03c848b
- [x] Task: Implement `ChatService.importChat` to support the three collision behaviors and reuse rename logic. 03c848b
- [x] Task: Write tests for JSON validation and best-effort parsing. f8a3f91
- [x] Task: Implement JSON validation utility and best-effort parsing logic. f8a3f91
- [x] Task: Conductor - User Manual Verification 'Phase 1: Core Import Logic & Validation' (Protocol in workflow.md) cf03cb8

## Phase 2: Orchestration & Model Resolution [checkpoint: 2f8c815]
- [x] Task: Write tests for `ChatOrchestrator.handleChatImport` including model resolution logic. e0008ac
- [x] Task: Implement `ChatOrchestrator.handleChatImport` to orchestrate file reading, validation, user prompts for collision, and model resolution (download missing or confirm without). e0008ac
- [x] Task: Write tests for binding an imported chat to a specific model. e0008ac
- [x] Task: Implement logic in Orchestrator to force a specific model during import if requested. e0008ac
- [x] Task: Conductor - User Manual Verification 'Phase 2: Orchestration & Model Resolution' (Protocol in workflow.md) 2f8c815

## Phase 3: VS Code Integration & UI
- [ ] Task: Write tests for Command Palette and File Explorer context menu commands for importing a chat.
- [ ] Task: Implement `package.json` contributions and command handlers in `chatCommands.ts` for Command Palette and File Explorer.
- [ ] Task: Write tests for UI model-specific and general panel import actions.
- [ ] Task: Implement context menus in `package.json` for Ollama View panel (general and model-specific) and the corresponding handlers.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: VS Code Integration & UI' (Protocol in workflow.md)

## Phase 4: End-to-End Testing
- [ ] Task: Write E2E tests for importing a chat via Command Palette and verifying it appears in the panel.
- [ ] Task: Write E2E tests for collision handling prompts and best-effort import warnings during the import process.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: End-to-End Testing' (Protocol in workflow.md)