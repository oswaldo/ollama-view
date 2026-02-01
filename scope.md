# Scope: VS Code Ollama Controller

## Goal

Create a Visual Studio Code extension to manage a locally installed Ollama instance, allowing users to view, start, stop, and delete models directly from the editor.

## Functional Requirements

### 1. User Interface

- **Sidebar Panel**: A dedicated view in the VS Code sidebar (e.g., in the Explorer or a custom Activity Bar icon).
- **Model List**: A list displaying all locally pulled Ollama models.
- **Status Indicators**:
    - **Running**: Indicated by a **Green** icon. (Model is loaded in memory).
    - **Stopped**: Indicated by a **Red** icon. (Model is present but unloaded).

### 2. Interactions

- **Context Menu (Right-Click on a Model)**:
    - **Start**: Available when the model is Stopped. Triggers the model to load or run.
    - **Stop**: Available when the model is Running. Unloads the model.
    - **Delete**: available always. Removes the model from the local system.
        - **Confirmation**: A confirmation dialog must appear before deletion: "Are you sure you want to delete [Model Name]?"
    - **Pull Model**: A button or command to pull a new model.
        - **Input**: User types model name.
        - **Autocomplete**: As user types, show top ~10 matching models (requires a source for model names).

### 3. Backend Integration

- **Command Line / API**: Interaction with the locally installed `ollama` CLI or HTTP API (default port 11434).
- **Operations**:
    - List: `ollama list`
    - Check Status: `ollama ps`
    - Run/Load: `ollama run` (or API generate/chat request to preload)
    - Stop: Unload via API (e.g., set keep_alive to 0) or `ollama stop` if available.
    - Delete: `ollama rm`

## Open Questions

1. **Start Behavior**: Should "Start" open a terminal with `ollama run` for user interaction, or just load the model into memory (via API) so it shows as green?
2. **Stop Behavior**: Strict unloading of the model from memory?
3. **Delete Behavior**: allow deleting running models? (Force delete or stop first?)
4. **Model Source for Autocomplete**: Where to get the list of available models for autocomplete? (Web scraping ollama.com or a static list?)

## Suggestions (Antigravity)

1.  **Model Details**: Show metadata (Size, Quantization, Family) on hover/click.
2.  **Output Channel**: Dedicated VS Code output channel for Ollama logs/interaction.
3.  **Quick Test**: A simple "Chat" input box in the sidebar to test the running model without opening a full terminal.
