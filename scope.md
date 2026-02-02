# Scope: VS Code Ollama Controller

## Goal

Create a Visual Studio Code extension to manage a locally installed Ollama instance, allowing users to view, start, stop, and delete models directly from the editor.

## Functional Requirements

### 1. User Interface

- **Sidebar Panel**: A dedicated view in the VS Code sidebar.
- **Tree View**:
    - **Models**: Top-level nodes.
    - **Chats**: Child nodes under each model (Persisted).
- **Status Indicators**:
    - **Running**: Green icon.
    - **Stopped**: Red icon.

### 2. Interactions


- **Context Menu**:
    - **Start/Stop/Delete Model**.
    - **Delete Chat**.
- **Chat Management**:
    - **New Chat**: Button (+) on model item.
    - **Open Chat**: Click on chat item.

### 3. Backend Integration

- **API**: Interaction with `ollama` HTTP API.
- **Streaming**: Real-time token streaming for chat responses.
- **Persistence**: Chat history stored in VS Code `globalState`.

## Completed Features (Antigravity)

1.  [x] **Model List**: Tree view with running status.
2.  [x] **Persistent Chats**: History saved per chat.
3.  [x] **Chat Interface**: Webview with streaming.
4.  [x] **Multiple Tabs**: Support for simultaneous chats.
5.  [x] **Auto-Start**: Chatting starts model automatically.
6.  [x] **UI Polish**: Timestamps, Sender labels.
7.  [x] **Message Editing**: Edit user messages to Truncate (overwrite future history) or Fork (create new chat branch).

## Suggestions (Antigravity)

1.  **Model Details**: Show metadata (Size, Quantization, Family) on hover/click.
2.  **Output Channel**: Dedicated VS Code output channel for Ollama logs/interaction.
3.  **Quick Test**: A simple "Chat" input box in the sidebar to test the running model without opening a full terminal.
