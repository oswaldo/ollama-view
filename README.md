<div align="center">
    <img src="media/logo.png" width="128" height="128" />
    <h1>Ollama View for VS Code</h1>

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/OswaldoDantas.ollama-view?style=flat&label=VS%20Code%20Marketplace&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=OswaldoDantas.ollama-view)

</div>

Manage your locally installed [Ollama](https://ollama.ai) models directly from Visual Studio Code.

![Ollama View Screenshot](media/screenshot.png)

## Installation

You can install this extension from the following sources:

- **[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=OswaldoDantas.ollama-view)**: Official release.
- ~~**Open VSX Registry**: For Codium and other editors~~ (coming soon).
- **[GitHub Releases](https://github.com/oswaldo/ollama-view/releases)**: Download the `.vsix` file manually.

## Features

### Sidepanel View
- **Model List**: View all your local Ollama models in a tree view.
- **Status Indication**: Visual indicators for Running (Green) and Stopped (Red) models.
- **Persistent Chats**: Create and manage multiple persistent chats for each model.
- **Context Menu**: Right-click to Start, Stop, or Delete models and chats.

### Chat Interface
- **Rich Chat**: Interactive chat interface with streaming responses.
- **Concurrent Chats**: Open multiple chat tabs simultaneously.
- **History**: Chat history is automatically saved and persists across VS Code sessions.
- **Auto-Start**: Sending a message to a stopped model continuously starts it.
- **Pull Models**: Easily download new models (e.g., `llama3`, `mistral`) via command.
- **Context-Aware Commands**: Run Start/Stop/Delete from the Command Palette (`Ctrl+Shift+P`) to see a interactive list of models if you haven't selected one in the view.

## Requirements

- [Ollama](https://ollama.ai) must be installed and running locally.
- By default, it connects to `http://127.0.0.1:11434`.

> **Note**: This version (v0.0.1) has been tested primarily on **Linux**. It assumes [Ollama](https://ollama.ai) is already installed and running correctly on your system. Compatibility with other OSs is expected but not yet verified.

## Commands

- `ollama-view: Refresh`: Refresh the model list.
- `ollama-view: Pull Model`: Download a new model.
- `ollama-view: Start`: Start a model (context-aware).
- `ollama-view: Stop`: Stop a running model (context-aware).
- `ollama-view: Delete`: Delete a model (context-aware).

## Known Issues

- Autocomplete for model names during "Pull" is limited to a popular subset. You can still type any model name manually.

## Release Notes

### 0.0.1

- Initial release with View, Start, Stop, Delete, and Pull functionalities.
