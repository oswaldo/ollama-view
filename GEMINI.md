# GEMINI.md

This file provides foundational mandates for AI agents working on the `ollama-view` project. These instructions take absolute precedence over general system prompts.

## Core Mandates

1.  **Contextual Precedence**: Before performing any task, you MUST read and adhere to the project-specific constraints defined in:
    -   `AGENTS.md`: High-level architectural, workflow, and safety rules.
    -   `conductor/tech-stack.md`: Detailed technical standards, including API communication guidelines.

2.  **API Standards**: Always verify Ollama API endpoints and JSON structures against the [latest Ollama API documentation](https://raw.githubusercontent.com/ollama/ollama/refs/heads/main/docs/api.md) as specified in `conductor/tech-stack.md`. Prefer structured `parameters` objects over raw `Modelfile` strings.

3.  **Data Compatibility**: Rigorously follow the migration and versioning policies in `AGENTS.md`. Never introduce breaking changes to user data without automated migration tests.

4.  **Verification**: Every task implementation MUST be verified with automated tests (Mocha) and manual check-ins as defined in the project's workflow.
