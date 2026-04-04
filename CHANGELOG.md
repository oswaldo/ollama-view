# Changelog

All notable changes to the `ollama-view` extension will be documented in this file.

## [Unreleased]

- **Chat Export**: Users can now easily export full chat histories to a portable JSON file containing all Markdown metadata.
- **Security Updates**: Audited and updated critical node dependencies to address known vulnerabilities and ensure a safer local workspace.
- **Improved E2E Stability**: Fully restored and refactored the end-to-end browser test suite against a stable, mock local server pattern, guaranteeing tests run reliably without timing flakiness.

## [0.1.0] - Architecture Refactor, Advanced Config & Model Instances

- **Advanced Model Configuration**: Create and manage multiple named instances of the same model.
- **Performance Controls**: Adjust temperature, top-k, top-p, and random seed parameters per instance.
- **Dynamic Tree Hierarchy**: The sidebar now visually groups chats and instances under their parent models.
- **Welcome Screen**: Added an onboarding and "What's New" tab for a smoother user installation experience.
- **E2E Testing & Refactor**: Complete architectural overhaul with robust type-safety and comprehensive UI/E2E test suite coverage.
- **UI Polish**: Dozens of quality-of-life improvements including raw message inspection, better spacing, and individual chat resets.

## [0.0.6] - Model Framing & Chat Overrides

- **Model Framing View**: A new dedicated sidebar view to create, edit, duplicate, and manage reusable model framings (prefixes, suffixes, and system prompts).
- **Chat-Level Overrides**: Customize and override model framing on a per-chat or per-message basis for tailored interactions.
- **Message Info Modal**: Inspect turn-specific metadata and framing context for any message.
- **Robust History Manipulation**: Enhanced state preservation during chat branching (forking/truncating) with atomic metadata management.

## [0.0.5] - Marketplace Compatibility

- **Publishing Fix**: Corrected extension categories to comply with VS Code Marketplace requirements.

## [0.0.4] - Model Setup & Advanced Prompting

- **Model Setup**: New configuration screen to define system messages and message framing (prefixes/suffixes).
- **Prompt Injections**: Support for per-message system turns and user message wrapping.
- **Visibility Toggle**: View hidden system instructions directly in the chat panel.
- **UI Safety**: Moved destructive "Delete" action to a context menu.

## [0.0.3] - Unique Chat Naming

- **Unique Chat Names**: New chats now have unique names (e.g. "New Chat (2)") to prevent confusion.
- **Improved Naming Logic**: Renaming and forking chats also ensures unique names.
- **Tests**: Added tests for chat naming logic.

## [0.0.2] - Initial Chat Functionality

- **Persistent Chats**: Conversations are now possible and persistent across sessions.
- **Message Editing**: Edit user messages to branch conversation paths (Truncate or Fork).
- **Model Actions**: Copy, regenerate, and fork directly from model responses.
- **Enhanced UI**: Improved tree view, chat deletion flow, and timestamp formatting.

## [0.0.1] - Foundations

- Initial release with View, Start, Stop, Delete, and Pull functionalities.
