# Project Structure

This document outlines the file structure of the `ollama-view` project.

-   `src/`: Contains all TypeScript source code.
    -   `extension.ts`: The main entry point of the VS Code extension.
    -   `*Provider.ts`: Files ending in `Provider.ts` are typically `TreeDataProvider` implementations for VS Code views.
-   `media/`: Holds static assets such as icons, and CSS/JS files used in Webviews.
-   `package.json`: The extension manifest, which defines commands, view containers, and other metadata.
-   `scope.md`: Tracks high-level project goals, requirements, and completed features. **This should be checked before starting new tasks to understand the project's roadmap.**
