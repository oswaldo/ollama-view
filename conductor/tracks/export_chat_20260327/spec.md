# Specification: Export Chat Action

## Overview
This feature introduces an "Export Chat" action in the triple-dot (context) menu of chat nodes within the Ollama model tree. This allows users to export their persistent conversation history to a file for external use, sharing, or archival.

## Functional Requirements
- **Context Menu Entry**: Add an "Export Chat..." option to the context menu of chat nodes in the Ollama Provider tree view.
- **Export Formats**: Support exporting to Markdown (`.md`) and JSON (`.json`).
- **Export Content**:
    - **Markdown**: Include a header with metadata (Model name, instance name, timestamp), and a formatted history of all turns (System, User, Assistant), including hidden turns.
    - **JSON**: A structured representation of the `ChatHistory` (Chat) object, including all metadata and turns. **Note: This export format must be identical to the internal storage format to ensure compatibility with future Import functionality.**
- **Save Workflow**:
    - When triggered, VS Code's `showSaveDialog` should be used to allow the user to choose the destination and file name.
    - The default file name should follow the pattern: `{model}-{timestamp}-chat.{extension}`.
- **UI/UX**:
    - Show a success notification with a link to open the file upon completion.

## Non-Functional Requirements
- **Performance**: Exporting large chat histories should not block the extension's main thread or the UI.
- **Reliability**: Ensure special characters in chat messages are handled correctly for both Markdown and JSON formats.

## Acceptance Criteria
- [ ] "Export Chat..." action appears in the context menu for all chat nodes in the model tree.
- [ ] Selecting the action opens a file save dialog.
- [ ] Exporting to Markdown results in a well-formatted, readable file.
- [ ] Exporting to JSON results in a valid JSON file containing all chat data.
- [ ] The default file name matches the specified template.
- [ ] Success/Error notifications are displayed appropriately.

## Out of Scope
- Bulk export of multiple chats.
- Exporting to other formats (PDF, HTML) in this initial iteration.
- Automatic cloud sync/upload.
