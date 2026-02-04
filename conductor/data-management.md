# Data Management

This document outlines the data compatibility and migration policies for the `ollama-view` project.

## Chat Data Versioning
-   The initial internal JSON representation of chats is implicitly **Version 1**.
-   If no `chatFormat` element is present in the persisted chat data, it is assumed to be **Version 1**.
-   Future versions of the chat data structure **MUST** include a `chatFormat` element indicating the specific version (e.g., `"chatFormat": 2`).

## Migration Policy
-   If the chat data structure needs to be changed (e.g., from Version 1 to 2), you **MUST** create unit tests that prove Version 1 data is automatically and correctly migrated or transparently supported by the new code.
-   **Forward Compatibility**: New data structures should, where possible, remain compatible with previous versions of the extension. For example, prefer additive changes. An older version of the plugin should not crash when encountering data saved by a newer version.
