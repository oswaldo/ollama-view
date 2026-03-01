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
*   **Modular Architecture**: Organized into specialized directories:
    - `src/services`: Core logic and data management (e.g., FramingService, ChatService).
    - `src/providers`: Tree data providers for sidebar views.
    - `src/panels`: Webview panel controllers.
    - `src/models`: Shared interfaces and data structures (e.g., ModelFraming).
*   **Webview Subsystem**: Highly decoupled webviews for Chat, Model Setup, and Framing Editor, sharing a unified `common-webview.css`.
*   **Ollama API Communication**: A client for HTTP communication with the local Ollama instance (default: `http://127.0.0.1:11434`).
    *   **Guideline**: Always verify API endpoints and JSON structures against the [latest Ollama API documentation](https://raw.githubusercontent.com/ollama/ollama/refs/heads/main/docs/api.md) before implementation. Prefer structured `parameters` objects over raw `Modelfile` strings when possible.
*   **State Management**: Persists chat history and other extension state using the VS Code `globalState` API.

## Development Tools
*   **Build Tools**:
    *   **TypeScript Compiler (tsc)**: Transpiles TypeScript code into JavaScript.
    *   **Webpack**: Primary bundler for the extension host code, providing minification and tree-shaking for production builds.
    *   **esbuild**: High-performance bundler used for Webview JavaScript assets.
    *   **Mocha**: A feature-rich JavaScript test framework running on Node.js and in the browser, making asynchronous testing simple and fun.
    *   **Sinon**: Standalone test spies, stubs and mocks for JavaScript.
*   **Linting**:
    *   **ESLint**: A pluggable linting utility for JavaScript and TypeScript, ensuring code quality and adherence to defined coding standards.
