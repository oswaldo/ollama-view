# Track Specification: Add Template Support

## Overview
This track introduces a system prompt template management system. Users can browse, create, and manage system prompt templates organized by tags in a new sidebar section. These templates can then be applied to specific models via the existing model setup interface to streamline the configuration of specialized AI personas.

## Functional Requirements

### 1. User Interface
- **Sidebar Organization**: 
    - Add a new collapsible section titled "Templates" to the existing sidebar.
    - Both "Models" and "Templates" sections will be visible simultaneously as collapsible blocks.
- **Templates Tree View**:
    - Display templates in a hierarchical structure: `Tag` > `Template Name`.
    - Support multiple tags per template (the template will appear under each corresponding tag folder).
    - **Untagged Folder**: Templates with no tags appear in a special "Untagged" folder. This folder cannot be renamed or deleted.
- **Template Editor**:
    - A dedicated webview opening in an editor tab.
    - Fields: `Name`, `Description`, `Tags` (comma-separated or chip-based), and `System Prompt Content`.
    - Ensure a modern, ergonomic layout that avoids redundant "Template" prefixes in labels.

### 2. Template & Tag Management
- **Built-in Templates**:
    - Provide a curated set of initial templates (e.g., "Helpful Assistant", "Software Engineer").
    - Built-in templates are **Read-Only**.
- **Template Actions**:
    - **Rename/Delete**: Users can rename or delete custom-created templates.
    - **Duplicate**: Create a user-editable copy of any template (Built-in or User).
- **Tag Actions**:
    - **Rename/Delete**: Users can rename or delete custom tags.
- **Safety Protocol**:
    - Deleting any item (Template or Tag) **MUST** trigger a confirmation dialog.
    - Tag deletion warnings must include the count of affected templates.
- **Persistence**: 
    - Store user-created templates and modifications in VS Code `globalState`.

### 3. Model Integration
- **Apply Template**:
    - Within the **Model Setup** screen, add an "Apply Template" action.
    - This will open a selection interface to pick a template.
    - Applying a template overwrites the model's current system prompt with the template's content.

## Acceptance Criteria
- [ ] Templates section appears in the sidebar as a collapsible block.
- [ ] Tree view correctly organizes templates by tags, including the "Untagged" folder.
- [ ] Template editor opens as a tab and correctly saves/updates user templates.
- [ ] Built-in templates cannot be edited but can be duplicated.
- [ ] Confirmation dialogs appear for deletions, with accurate template counts for tag deletions.
- [ ] Tags and Templates can be renamed/deleted (custom only).
- [ ] Templates can be successfully applied to a model's configuration from the model setup screen.
- [ ] Template data persists across VS Code sessions.

## Out of Scope
- Applying a template to multiple models in a single action.
- Chat-level (session-specific) template overrides that differ from the model's system prompt.
