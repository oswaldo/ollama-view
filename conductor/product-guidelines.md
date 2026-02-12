# Product Guidelines

## Prose Style
The desired prose style for all documentation and user-facing text within this project is **Clear and Concise**. This means:
*   **Direct Language**: Use straightforward and unambiguous language.
*   **Avoid Jargon**: Minimize the use of technical jargon where possible. If technical terms are necessary, ensure they are adequately explained.
*   **Focus on Understanding**: Prioritize ease of understanding for a broad technical audience, including developers, researchers, and advanced users.
*   **Brevity**: Convey information efficiently without unnecessary words or complex sentence structures.

## Coding Standards
*   **Style**: Follow existing TypeScript patterns. Use Prettier for consistent formatting (`npx prettier --write .`).
*   **Async/Await**: Prefer `async/await` over raw Promises for cleaner asynchronous code.
*   **Types**: Use explicit types. Avoid `any` where possible to leverage TypeScript's type safety.
*   **Engineering Standards**:
    - **Single Responsibility Principle (SRP)**: Maintain small, focused files. Logic, structure (HTML), and styling (CSS) for Webviews should be separated.
    - **Clean Abstractions**: Prefer reusable components and utilities over duplicated code to ensure maintainability and high architectural quality.
    - **Intentional Design**: Code should be expressive and self-documenting, meeting the high standards of experienced backend and frontend engineers.
    - **Optimized Artifacts**: Production releases must be bundled and minified using Webpack to ensure minimal footprint and optimal startup performance.
*   **VS Code API**: Utilize `vscode` namespace features (e.g., `vscode.window.showInformationMessage`) for a native look and feel.
*   **Webview UI**: The chat interface should have a "Premium" look and feel (Modern CSS, responsiveness) while respecting VS Code's theming capabilities (e.g., using `var(--vscode-*)` CSS variables).
*   **Backward Compatibility**: This is essential. New features must maintain compatibility with existing workflows and data structures. All structural changes must be verified with unit tests.
