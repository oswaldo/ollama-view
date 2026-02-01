# Ollama View for VS Code

Manage your locally installed [Ollama](https://ollama.ai) models directly from Visual Studio Code.

![Ollama View Screenshot](https://raw.githubusercontent.com/placeholder/screenshot.png)

## Features

- **Dashboard View**: See all your pulled models in the sidebar.
- **Status Indicators**: Instantly see which models are loaded (Green) or stopped (Grey).
- **Controls**:
    - **Start**: Load a model into memory.
    - **Stop**: Unload a model to free up RAM.
    - **Delete**: Remove a model from your disk (with confirmation).
- **Pull Models**: Easily download new models (e.g., `llama3`, `mistral`) via command.

## Requirements

- [Ollama](https://ollama.ai) must be installed and running locally.
- By default, it connects to `http://127.0.0.1:11434`.

## Commands

- `Ollama: Refresh`: Refresh the model list.
- `Ollama: Pull Model`: Download a new model.

## Known Issues

- Autocomplete for model names during "Pull" is limited to a popular subset. You can still type any model name manually.

## Release Notes

### 0.0.1

- Initial release with View, Start, Stop, Delete, and Pull functionalities.
