# Track Specification: Suggest Next Message

## Overview
Introduce a helper feature that analyzes the current chat history and suggests a plausible next user message. This suggestion is automatically filled into the chat input box, allowing the user to review, edit, and send it. This feature is intended to facilitate experimentation and reduce friction in continuing conversations.

## Functional Requirements

### 1. Suggestion Trigger
- Add a "Suggest Next Message" option to the chat's triple-dot menu (located after the send button).
- When triggered, the system sends the full conversation history to the model currently active in the chat.

### 2. Suggestion Generation (Configurable Framing)
- Implement a dedicated "Suggestion Framing" configuration.
- Users can define the system prompt/instruction used to generate the suggestion.
- **Default Suggestion Framing**: "Based on the conversation history provided, predict what the user is most likely to ask or say next. Provide exactly one suggestion. Answer with ONLY the text of the suggested message, no preamble or quotes."
- This framing is managed by the `FramingService` but is distinct from the active framing applied to the chat turns.

### 3. Execution & UI Feedback
- While the model is generating the suggestion:
    - Show the standard assistant **typing indicator**.
    - Change the input box placeholder to **"Thinking..."**.
    - Disable the suggestion menu item to prevent concurrent requests.
- The generation must be non-streaming (or take the final result) to populate the input box at once.

### 4. Result Handling
- Once the suggestion is received:
    - Automatically fill the chat input box with the model's response.
    - Remove the typing indicator and restore the original placeholder.
    - If the model returns multiple suggestions (e.g., lines), the first coherent block is used.

## Technical Considerations
- **Non-blocking**: The generation should not lock the main UI thread.
- **Service Reuse**: Leverage `OllamaProvider.chat` or `OllamaApi` directly for the suggestion call.

## Acceptance Criteria
- [ ] "Suggest Next Message" appears in the chat menu.
- [ ] Clicking it triggers a request to the local model using the configured Suggestion Framing.
- [ ] UI provides feedback (typing indicator, placeholder) during generation.
- [ ] Input box is correctly populated with the generated text.
- [ ] Users can edit the "Suggestion Framing" in the extension settings (or a dedicated framing editor).

## Out of Scope
- Submenu for multiple suggestions.
- Context-aware suggestions that use files or other workspace data.
