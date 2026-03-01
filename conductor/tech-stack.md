# Tech Stack

## Overview
This project, "Ollama View for VS Code," utilizes a modern web technology stack tailored for Visual Studio Code extension development.

## Core Technologies
*   **Programming Language**: TypeScript (Strict Mode)
    *   **Rationale**: Provides type safety, enhanced developer tooling, and scalability for robust application development.
*   **Frameworks**: Visual Studio Code Extension API
    *   **Rationale**: The official API for building extensions that integrate deeply with the VS Code environment, providing access to its UI components and functionalities.
*   **Runtime Environment**: Node.js (v18.x)
    *   **Rationale**: Powers the execution of the TypeScript code within the VS Code extension host, enabling rich functionality and access to Node.js APIs.

## Architecture and Core Components
The project follows a layered architecture to ensure separation of concerns, testability, and maintainability.

### 1. Contract Layer (`src/contracts`)
Defines stable interfaces for infrastructure and cross-layer communication.
*   **Goal**: Decouple business logic from implementation details (e.g., storage, external APIs).
*   **Key Interfaces**: `IChatRepository`, `IModelSettingsRepository`, `IOllamaClient`.

### 2. Data Access Layer (`src/repositories`)
Concrete implementations of repository contracts using VS Code's persistence APIs.
*   **Goal**: Isolate storage-specific logic (e.g., `vscode.globalState`).
*   **Key Classes**: `VscodeChatRepository`, `VscodeModelSettingsRepository`.

### 3. Service Layer (`src/services`)
Contains pure domain logic and state management.
*   **Goal**: Implement business rules in a testable, platform-independent way.
*   **Key Classes**: `ChatService`, `ModelService`, `FramingService`.

### 4. Orchestration Layer (`src/services/chatOrchestrator.ts`)
Coordinates multiple services and infrastructure to execute complex workflows.
*   **Goal**: Centralize end-to-end flows (e.g., preparing messages, calling APIs, persisting results) to prevent logic duplication and regressions.

### 5. UI Layer (`src/panels`, `src/providers`, `src/webview`)
Webview controllers, Tree Data Providers, and frontend logic.
*   **Goal**: Handle user interaction and VS Code UI events, delegating all domain logic to the Orchestrator or Services.
*   **Key Classes**: `ChatPanel`, `SetupPanel`, `OllamaProvider`.
*   **Pattern: Discriminated Unions for UI Communication**: All webview-to-extension communication uses rigorous type-safe contracts (`SetupWebviewToExtensionCommand`, etc.) with exhaustiveness checking (`assertNever`) to ensure no message is left unhandled.

## Ollama API Communication
A client for HTTP communication with the local Ollama instance (default: `http://127.0.0.1:11434`).
*   **Guideline**: Always verify API endpoints and JSON structures against the [latest Ollama API documentation](https://raw.githubusercontent.com/ollama/ollama/refs/heads/main/docs/api.md) before implementation. Prefer structured `parameters` objects over raw `Modelfile` strings when possible.
*   **Managed Instance Persistence**: Custom model instances utilize Ollama's `api/create` endpoint to persist custom hardware and parameter configurations as unique model files on the host system.

## Development Tools
*   **Build Tools**:
    *   **TypeScript Compiler (tsc)**: Transpiles TypeScript code into JavaScript.
    *   **Webpack**: Primary bundler for the extension host code, providing minification and tree-shaking for production builds.
    *   **esbuild**: High-performance bundler used for Webview JavaScript assets.
    *   **Mocha**: A feature-rich JavaScript test framework running on Node.js and in the browser, making asynchronous testing simple and fun.
    *   **Sinon**: Standalone test spies, stubs and mocks for JavaScript.
*   **Linting**:
    *   **ESLint**: A pluggable linting utility for JavaScript and TypeScript, ensuring code quality and adherence to defined coding standards.
