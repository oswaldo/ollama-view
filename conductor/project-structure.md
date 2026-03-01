# Project Structure

This document outlines the file structure of the `ollama-view` project.

-   `src/`: Contains all TypeScript source code.
    -   `contracts/`: Stable interfaces for infrastructure and cross-layer communication.
    -   `repositories/`: Concrete implementations of persistence contracts (e.g., using VS Code `globalState`).
    -   `services/`: Pure domain logic, state management, and workflow orchestration.
    -   `panels/`: Webview panel controllers and message handlers.
    -   `providers/`: VS Code `TreeDataProvider` implementations for sidebar views.
    -   `models/`: Shared data models and interfaces.
    -   `webview/`: TypeScript source for webview-side logic.
    -   `extension.ts`: The main entry point of the VS Code extension.
-   `media/`: Holds static assets such as icons, and CSS/HTML files used in Webviews.
-   `package.json`: The extension manifest, which defines commands, view containers, and other metadata.
-   `scope.md`: Tracks high-level project goals, requirements, and completed features. **This should be checked before starting new tasks to understand the project's roadmap.**
