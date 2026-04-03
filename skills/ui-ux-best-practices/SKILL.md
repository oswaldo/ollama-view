---
name: ui-ux-best-practices
description: Core principles and best practices for implementing UI and UX features, such as system dialogs, file saving workflows, and context menus, ensuring native-feeling and robust user experiences across different operating systems.
---

# UI/UX Best Practices

This skill provides guidelines for implementing common UI/UX workflows to ensure they feel native, robust, and intuitive to users. 

## Save File Dialogs

When implementing file save dialogs (e.g., `vscode.window.showSaveDialog` or standard OS save dialogs), be aware of the following cross-platform behaviors and best practices:

### 1. Default Extensions and Filters
- **Problem**: On some operating systems (like Linux GTK), if a user selects a filter (e.g., JSON) but the default filename provided does not have an extension, the OS may **not** automatically append the selected filter's extension.
- **Solution**: Always check the returned URI/filepath. If the filepath lacks an extension, manually append the default extension associated with the chosen filter to ensure the file is saved correctly.

### 2. State Persistence (Memory)
- **Problem**: Users find it annoying to navigate to the same directory or re-select the same file extension every time they perform a repetitive action (like exporting a chat).
- **Solution**: Remember the user's last choices.
    - Save the last used directory path and the last used file extension to global state or user settings.
    - Use the last saved directory as the default location for the next dialog.
    - Dynamically reorder the `filters` object so the last used extension is the first option, making it the default selected filter in the dialog.

### 3. Filter Cleanliness
- **Problem**: Including an "All Files" (`*`) filter when the application only supports specific export formats (like `.md` or `.json`) allows the user to save files without an extension or with an unsupported extension, leading to ambiguous states.
- **Solution**: Strictly limit the available filters to the formats your application actually supports. Do not include an "All Files" option unless the system truly handles arbitrary file extensions.

## Context Menus and Inline Actions

- **Inline vs. Context**: In tree views (like VS Code's tree providers), prioritize putting common actions (like Edit, Delete, Export) in the `inline` group so they appear on hover. 
- **Grouping**: If there are many inline actions, group them into a single "More Actions..." (`...`) Quick Pick menu to keep the UI clean.

## Error Handling and Feedback
- Always wrap file I/O operations in `try/catch` blocks.
- Provide clear, actionable success notifications (e.g., "File saved successfully [Open File]") and error notifications using native UI prompts rather than silent console logs.
