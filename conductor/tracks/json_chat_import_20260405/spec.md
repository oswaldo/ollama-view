# Specification: JSON Chat Import

## Overview
Implement functionality to import previously exported JSON chat histories back into the Ollama View extension. This enables users to share chats, move them between environments, or restore backups.

## Functional Requirements
1. **Import Mechanisms:**
   - **Command Palette:** Expose a command to trigger the import file picker.
   - **File Explorer Context Menu:** Allow right-clicking a `.json` file in VS Code's file explorer to import it directly.
   - **Model-Specific Import:** Add an import option to the triple-dot context menu when hovering a model in the panel. The imported chat will automatically be bound to this specific model.
   - **General Panel Import:** Add an import option to the general triple-dot menu in the Ollama View panel.

2. **Model Resolution & Downloading:**
   - When importing via the General Panel: The system must check if the model associated with the imported chat exists locally. If it does not, prompt the user: ask if they want to download the missing model or confirm continuing without it (which might require selecting a different model later or just loading the history).
   - When importing via a specific Model's Context Menu: The chat is automatically bound to that model, overriding the original model stored in the JSON, and future messages are handled by the selected model.

3. **Collision Handling:**
   - When importing a chat with an ID that already exists in the local history, prompt the user with three options:
     - Overwrite the existing chat.
     - Import as a new chat.
     - Abort the import.
   - If "Import as a new chat" is selected, the system must reuse the existing naming logic to append an incremental number (e.g., "Chat Name (1)") to distinguish it from the original.

4. **Error Handling & Validation:**
   - Validate the structure of the JSON file against the internal chat representation.
   - If issues are found, perform a best-effort parsing and present a warning dialog listing the specific issues found.
   - Indicate if a best-effort import is possible and ask the user if they want to proceed with the partial import or abort the operation.

## Acceptance Criteria
- User can successfully import a valid JSON chat file via all four defined entry points.
- Model resolution prompts appear correctly when importing a chat with a missing model via the general panel.
- Importing via a specific model successfully binds the chat to that model.
- ID collisions trigger a prompt, and the "Import as new" option correctly renames the chat.
- Malformed JSON files trigger a detailed warning dialog, and the user can choose to proceed with a best-effort import or abort.
- Unit tests and E2E tests provide comprehensive coverage of the import functionality.

## Out of Scope
- Importing chat formats from other extensions or platforms (only the internal JSON format is supported).