# Implementation Plan: Suggest Next Message

This plan outlines the steps to implement the "Suggest Next Message" feature, allowing the active model to predict and pre-fill the next user message based on chat history.

## Phase 1: Service Layer & Configuration
Extend the `FramingService` and `ChatService` to support suggestion metadata and logic.

- [ ] Task: Extend `FramingService` for Suggestion Framing
    - [ ] Add a `getSuggestionFraming` method to `FramingService` that returns the default or user-modified suggestion prompt.
    - [ ] Ensure this framing is persisted in `globalState`.
- [ ] Task: Implement `SuggestService` logic
    - [ ] Create a new `src/services/suggestService.ts` to coordinate the request.
    - [ ] Implement `suggestNextMessage(chat: Chat): Promise<string>` that fetches the framing and calls the API.
- [ ] Task: Write Tests for Suggestion Logic
    - [ ] Mock `OllamaProvider` and verify `SuggestService` sends the correct payload.
    - [ ] Test handling of empty history and large histories.
- [ ] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Webview UI & Messaging
Enhance the chat interface to trigger and display suggestions.

- [ ] Task: Update Chat HTML & CSS
    - [ ] Add "Suggest Next Message" to the triple-dot menu in `media/chat.html`.
    - [ ] Ensure CSS supports the placeholder change and button disabling.
- [ ] Task: Implement Frontend Messaging in `src/webview/chat.ts`
    - [ ] Add event listener for the menu item to post `requestSuggestion` message.
    - [ ] Handle `setSuggestion` and `setSuggestionLoading` messages from the extension.
    - [ ] Implement logic to toggle placeholder and typing indicator based on loading state.
- [ ] Task: Write Tests for Frontend State
    - [ ] Verify message handlers correctly update the DOM elements (mocked in tests).
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Integration & Safety
Connect the webview to the backend service and implement safety checks.

- [ ] Task: Update `src/panels/chatPanel.ts`
    - [ ] Handle `requestSuggestion` message in the panel.
    - [ ] Invoke `SuggestService` and post the result back to the webview.
    - [ ] Ensure suggestion generation doesn't interfere with active chat turns.
- [ ] Task: Implement Error & State Handling
    - [ ] If the model is not running, ensure it starts (or prompts) before generating a suggestion.
    - [ ] Handle API errors gracefully with a notification.
- [ ] Task: Write Integration Tests
    - [ ] Verify the end-to-end flow from menu click to input box filling using the test mock environment.
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)
