# Implementation Plan: Add Template Support

This plan outlines the steps to implement a system prompt template management system in the VS Code Ollama Controller, following modular software engineering principles.

## Phase 1: Foundation & Modular Data Management
Establish the core data structures and service layer, ensuring separation of concerns.

- [x] Task: Define Template Models & Types d99b004
    - [x] Create `src/models/template.ts` to hold the `Template` and `Tag` interfaces.
    - [x] Define the `TemplateSource` (Built-in vs. User) and metadata structures.
- [x] Task: Implement TemplateService 5ef9ad1
    - [x] Create `src/services/templateService.ts` to handle CRUD operations via `globalState`.
    - [x] Implement logic to merge built-in templates (from a static JSON) with user-created ones.
    - [x] Add `duplicateTemplate` and logic to retrieve templates by tag.
- [x] Task: Write Tests for TemplateService b7e6d52
    - [x] Write unit tests in `src/test/templateService.test.ts` to verify CRUD, tag organization, and built-in protection.
- [x] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md) b7e6d52

## Phase 2: Templates Sidebar & Tree View
Implement the UI components to display templates using the Provider pattern.

- [ ] Task: Register Sidebar View
    - [ ] Update `package.json` to register the `ollama-templates` view.
    - [ ] Ensure it appears as a collapsible block alongside the Models view.
- [ ] Task: Implement TemplatesProvider
    - [ ] Create `src/providers/templatesProvider.ts` implementing `vscode.TreeDataProvider`.
    - [ ] Implement hierarchical display: `Tag` > `Template Name`, including the "Untagged" logic.
- [ ] Task: Write Tests for TemplatesProvider
    - [ ] Write unit tests to verify the tree structure and "Untagged" folder categorization.
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Template Editor & Webview Architecture
Create a decoupled webview system for viewing and editing templates.

- [ ] Task: Create Template Editor Webview Panel
    - [ ] Create `src/panels/templateEditorPanel.ts` to manage webview lifecycle and messaging.
    - [ ] Create `media/template.html`, `media/template.css`, and `src/webview/template.ts`.
- [ ] Task: Implement Commands & Messaging
    - [ ] Create `src/commands/templateCommands.ts` for handling user actions (Open, Save, Duplicate).
    - [ ] Implement strict read-only UI states for built-in templates.
- [ ] Task: Write Tests for Editor Messaging
    - [ ] Verify that the panel correctly handles state updates and persists data through the service.
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)

## Phase 4: Model Integration
Integrate templates into the model configuration workflow.

- [ ] Task: Update Model Setup Interface
    - [ ] Modify `src/panels/setupPanel.ts` to integrate the "Apply Template" action.
    - [ ] Implement a command to show a template selection QuickPick.
- [ ] Task: Implement Template Application Logic
    - [ ] Overwrite the model's system prompt and trigger a refresh of the setup screen.
- [ ] Task: Write Tests for Integration
    - [ ] Verify that applying a template correctly updates model settings without side effects.
- [ ] Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md)

## Phase 5: Tag Management & Safety Protocols
Implement advanced management features and robust safety checks.

- [ ] Task: Implement Rename & Delete Operations
    - [ ] Add commands for renaming/deleting custom templates and tags.
    - [ ] Create a `src/services/dialogService.ts` for standardized, testable UI confirmations.
- [ ] Task: Implement Safety Confirmation Logic
    - [ ] Implement the template count calculation for tag deletion warnings.
- [ ] Task: Write Tests for Safety Logic
    - [ ] Verify confirmation flow and accurate template count reporting.
- [ ] Task: Conductor - User Manual Verification 'Phase 5' (Protocol in workflow.md)
