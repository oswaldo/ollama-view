# Track Specification: Rename to Model Framing & Chat Overrides

## Overview
Rename the "Template" system to "Model Framing" to improve clarity and specificity. This track also introduces chat-level framing overrides, allowing users to apply specific system prompts and configurations to individual chat sessions without modifying the global model setup.

## Functional Requirements

### 1. Global Refactor (Total Rename)
- Rename all "Template" related entities to "Model Framing":
    - **Code**: `Template` interface -> `ModelFraming`, `TemplateService` -> `FramingService`, etc.
    - **Files**: `src/services/templateService.ts` -> `src/services/framingService.ts`, etc.
    - **UI**: Sidebar title, menu items, button labels, and placeholders.
    - **Storage**: Update `globalState` keys (no backward compatibility required for "Template" version).

### 2. Chat-Level Framing UI
- **Header Integration**:
    - Add a "Framing" status indicator to the top of the chat webview (near the "Show System & Injections" toggle).
    - Display "Default Framing" (linking to model setup) or the name of the custom selected framing.
    - Clicking the name opens a selection interface to switch framings.
    - Add a "Revert" button (icon) next to the name to clear the override and return to model defaults.
- **Menu Option**:
    - Add a triple-dot menu button after the chat send button.
    - Include an "Apply Framing" option in this menu as an alternative entry point.

### 3. Execution Logic
- **Framing Inheritance**:
    - When a custom framing is applied, all subsequent messages in that chat session use that framing's configuration (system prompt, prefixes, suffixes).
    - If the applied framing changes the system prompt in an ongoing chat, the next message sent to the API will include the updated system prompt.
- **Format Change**:
    - Update `ChatMessage` schema to include `framingId` and `framingName`.
    - `framingName` stores the name at the time of the message to handle renames/deletions gracefully.

### 4. Safety & Edge Cases
- **Deleted Framings**: 
    - If a chat references a deleted framing, the system must block sending and prompt the user to:
        1. Select a new framing.
        2. Revert to the global model framing.
- **Persistence**: 
    - Framing overrides must persist with the chat session in `globalState`.
- **Compatibility**: 
    - Ensure "Truncate" and "Branch" actions correctly inherit or handle the active framing at the point of action.

## Acceptance Criteria
- [ ] No "Template" terminology remains in the UI or core codebase.
- [ ] Chat header correctly displays and allows changing the active framing.
- [ ] Applying a framing overrides the global model setup for that specific chat.
- [ ] Deleting a framing used in an active chat triggers a mandatory selection prompt.
- [ ] Chat history records the specific framing used for each turn (ID + Last Known Name).

## Out of Scope
- Dynamic variables/placeholders within framings.
- Batch applying framings to multiple chats at once.
