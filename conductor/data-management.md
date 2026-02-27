# Data Management

This document outlines the data compatibility and migration policies for the `ollama-view` project.

## Chat Data Versioning
-   The initial internal JSON representation of chats is implicitly **Version 1**.
-   If no `chatFormat` element is present in the persisted chat data, it is assumed to be **Version 1**.
-   Future versions of the chat data structure **MUST** include a `chatFormat` element indicating the specific version (e.g., `"chatFormat": 2`).

## Migration Policy
-   If the chat data structure needs to be changed (e.g., from Version 1 to 2), you **MUST** create unit tests that prove Version 1 data is automatically and correctly migrated or transparently supported by the new code.
-   **Forward Compatibility**: New data structures should, where possible, remain compatible with previous versions of the extension. For example, prefer additive changes. An older version of the plugin should not crash when encountering data saved by a newer version.

## Data Preservation & Integrity
-   **Non-Destructive Operations**: The extension MUST NOT delete or overwrite data it does not recognize. When loading and saving JSON structures (chats, settings, models), unknown fields must be preserved and written back to disk.
-   **Respect Manual Edits**: If a user manually edits a configuration file (e.g., a chat JSON or an Ollama Modelfile), the extension must attempt to preserve those manual changes. It should not forcefully overwrite user-defined parameters unless they are fundamentally incompatible or requested by the user.
-   **Atomic Writes**: To prevent data corruption, operations that write to disk should prioritize atomicity (e.g., writing to a temporary file and then renaming) to ensure that a crash during saving does not result in a truncated or corrupted file.
