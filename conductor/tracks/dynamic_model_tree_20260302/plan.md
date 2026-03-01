# Implementation Plan - Dynamic Model Tree Hierarchy

This plan implements a dynamic tree structure in the Ollama sidebar. The tree will flatten the hierarchy (Base Model -> Chat) when only a single instance exists for a model, and use the grouped hierarchy (Base Model -> Instance -> Chat) when multiple instances exist.

## Phase 1: Research & Test Preparation
- [ ] Task: Create integration tests in `src/test/ollamaProvider.test.ts` to verify tree structure with varying instance counts.
    - [ ] Test case: Single model with one instance returns `OllamaInstanceItem` at root.
    - [ ] Test case: Single model with two instances returns `OllamaModelItem` at root.
    - [ ] Test case: Expanding `OllamaInstanceItem` at root returns chats.
    - [ ] Test case: Expanding `OllamaModelItem` at root returns `OllamaInstanceItem`s.

## Phase 2: Implementation
- [ ] Task: Refactor `OllamaProvider.getChildren` root logic.
    - [ ] Fetch instances for each model during root listing.
    - [ ] Map to `OllamaInstanceItem` if count == 1.
    - [ ] Map to `OllamaModelItem` if count > 1.
    - [ ] Ensure `runningModels` status is correctly passed to `OllamaInstanceItem` even at root.
- [ ] Task: Update `OllamaProvider` to handle potential context menu differences between root-level instances and nested instances if necessary. (Likely `contextValue` handles this).
- [ ] Task: Conductor - User Manual Verification 'Dynamic Tree Behavior' (Protocol in workflow.md)

## Phase 3: Verification & Quality
- [ ] Task: Run all tests and ensure coverage for the new logic.
- [ ] Task: Manual verification in the VS Code extension host.
- [ ] Task: Conductor - User Manual Verification 'Dynamic Tree Hierarchy' (Protocol in workflow.md)
