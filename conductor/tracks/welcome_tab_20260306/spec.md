# Specification: Welcome / What's New Tab (Track: welcome_tab_20260306)

## Overview
This feature introduces a "Welcome / What's New" Webview tab that automatically opens when the extension is first installed or when a major/minor version upgrade occurs. It aims to improve user onboarding and provide visibility into new features, especially for the upcoming v0.1.0 "Minimum Lovable Product" (MLP) release.

## Functional Requirements
- **Automatic Trigger:** The tab MUST open automatically on extension activation if the current version (Major.Minor) is different from the version stored in `globalState.lastSeenVersion`.
- **Content Structure:**
  - **Header:** "Welcome to Ollama View [Version]".
  - **What's New Section:** A list of key features and improvements in the current release.
  - **Getting Started Section:** A collapsible section providing a quick guide for new users.
- **Smart Behavior:**
  - On **First Install**, the "Getting Started" section MUST be expanded by default.
  - On **Upgrade**, the "Getting Started" section MUST be collapsed by default.
- **Interactive Elements:**
  - Support for **Media (GIF/Video)** to showcase features.
  - **Action Buttons:**
    - **"Start Chat"**: Triggers a unified flow (select/pull model if none exist, then open chat).
    - **"Add a Model"**: Directly opens the pull/download prompt.
    - **"Configure Connection"**: Shortcut to extension settings (API URL) or model-specific setup.
  - **External Links:** Links to GitHub repository and documentation.
- **Persistence:** The last seen version MUST be stored in VS Code's `globalState` to prevent redundant displays on every startup.

## Non-Functional Requirements
- **Visual Consistency:** The UI MUST match the "Standard Panel Layout" used in the existing Setup and Chat panels.
- **Cross-Variant Compatibility:** The implementation MUST use standard VS Code APIs (`WebviewPanel`, `ExtensionContext.globalState`) to ensure it works in all VS Code variants (Cursor, Windsurf, etc.).
- **MVP Simplicity:** Content for the "What's New" section will be hardcoded in the Webview provider for the v0.1.0 release.

## Acceptance Criteria
- [ ] The Welcome tab opens automatically upon first launch after installation.
- [ ] The Welcome tab opens automatically after a version upgrade (e.g., 0.0.9 -> 0.1.0).
- [ ] The "Getting Started" section is correctly expanded/collapsed based on install type.
- [ ] Clicking "Configure Ollama" opens the existing Setup Panel.
- [ ] Clicking "Start Chat" opens the existing Chat Panel.
- [ ] The tab does NOT open automatically on subsequent activations of the same version.

## Out of Scope
- Dynamic fetching of "What's New" content from a remote server.
- Support for "Patch" version automatic triggers (e.g., 0.1.0 -> 0.1.1).
- Multi-language localization (i18n) for this MVP.
