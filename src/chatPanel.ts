import * as vscode from 'vscode';
import { ChatService, Chat } from './chatService';
import { OllamaApi } from './ollamaApi';

export class ChatPanel {
    public static panels: Map<string, ChatPanel> = new Map();
    public static readonly viewType = 'ollamaChat';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _chat: Chat;

    // Services
    private _chatService: ChatService;
    private _api: OllamaApi;
    private _onStateChange?: () => void;

    public static createOrShow(extensionUri: vscode.Uri, chat: Chat, chatService: ChatService, api: OllamaApi, onStateChange?: () => void) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // Check if we already have a panel for this chat
        if (ChatPanel.panels.has(chat.id)) {
            ChatPanel.panels.get(chat.id)?._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            ChatPanel.viewType,
            `Chat: ${chat.modelName}`,
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        const chatPanel = new ChatPanel(panel, extensionUri, chat, chatService, api, onStateChange);
        ChatPanel.panels.set(chat.id, chatPanel);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, chat: Chat, chatService: ChatService, api: OllamaApi, onStateChange?: () => void) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._chat = chat;
        this._chatService = chatService;
        this._api = api;
        this._onStateChange = onStateChange;

        // Set the webview's initial html content
        this._update();

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'sendMessage':
                        await this._handleMessage(message.text);
                        return;
                }
            },
            null,
            this._disposables
        );

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    public dispose() {
        ChatPanel.panels.delete(this._chat.id);

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private async _handleMessage(text: string) {
        // 1. Save user message
        await this._chatService.addMessage(this._chat.id, 'user', text);
        this._chat = this._chatService.getChat(this._chat.id) || this._chat; // Refresh chat state

        // 2. Update UI with user message
        this._panel.webview.postMessage({ command: 'addMessage', role: 'user', content: text });

        // 3. Call Ollama API
        const messages = this._chat.messages.map(m => ({ role: m.role, content: m.content }));
        let fullResponse = '';

        try {
            // Send empty assistant message to start streaming into
            this._panel.webview.postMessage({ command: 'startAssistantMessage' });

            let hasStarted = false;
            await this._api.chat(this._chat.modelName, messages, (token) => {
                if (!hasStarted) {
                    hasStarted = true;
                    // Signal state change (model is running)
                    if (this._onStateChange) {
                        this._onStateChange();
                    }
                }
                fullResponse += token;
                this._panel.webview.postMessage({ command: 'appendToken', content: token });
            });

            // 4. Save assistant response
            await this._chatService.addMessage(this._chat.id, 'assistant', fullResponse);
            this._chat = this._chatService.getChat(this._chat.id) || this._chat;

            this._panel.webview.postMessage({ command: 'endAssistantMessage' });

        } catch (err: any) {
            vscode.window.showErrorMessage(`Chat Error: ${err.message}`);
            this._panel.webview.postMessage({ command: 'endAssistantMessage' }); // finish anyway
        }
    }

    private _update() {
        this._panel.webview.html = this._getHtmlForWebview();
    }

    private _getHtmlForWebview() {
        // Simple HTML for now. In a real app we might use React/Vue or just cleaner vanilla JS.
        // We will inject the existing messages.

        const initialMessages = JSON.stringify(this._chat.messages);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: var(--vscode-font-family); padding: 10px; color: var(--vscode-editor-foreground); background-color: var(--vscode-editor-background); }
        .message-wrapper { margin-bottom: 15px; display: flex; flex-direction: column; }
        .message-header { font-size: 0.8em; margin-bottom: 2px; color: var(--vscode-descriptionForeground); font-weight: bold; }
        .message { padding: 10px; border-radius: 5px; position: relative; }
        .user { align-self: flex-end; }
        .user .message { background-color: var(--vscode-textBlockQuote-background); border-left: 2px solid var(--vscode-textBlockQuote-border); }
        .assistant .message { background-color: var(--vscode-editor-inactiveSelectionBackground); }
        .timestamp { font-size: 0.7em; color: var(--vscode-descriptionForeground); text-align: right; margin-top: 5px; opacity: 0.8; }
        .input-area { position: fixed; bottom: 0; left: 0; right: 0; padding: 10px; background-color: var(--vscode-editor-background); border-top: 1px solid var(--vscode-widget-border); display: flex;}
        #messageInput { flex-grow: 1; padding: 5px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); }
        #sendBtn { margin-left: 5px; padding: 5px 10px; cursor: pointer; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; }
        .messages-container { margin-bottom: 60px; overflow-y: auto; height: calc(100vh - 80px); display: flex; flex-direction: column; }
        pre { background: var(--vscode-textCodeBlock-background); padding: 5px; overflow-x: auto; }
        code { font-family: var(--vscode-editor-font-family); }
    </style>
</head>
<body>
    <div class="messages-container" id="messages"></div>
    
    <div class="input-area">
        <input type="text" id="messageInput" placeholder="Type a message..." />
        <button id="sendBtn">Send</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const messagesDiv = document.getElementById('messages');
        const input = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const modelName = "${this._chat.modelName}";
        
        // Initial state
        let messages = ${initialMessages};
        
        function formatTime(ts) {
            if (!ts) return '';
            return new Date(ts).toLocaleString(undefined, { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }

        function renderMessages() {
            messagesDiv.innerHTML = '';
            messages.forEach(m => addMessageToDom(m.role, m.content, m.timestamp));
        }

        function addMessageToDom(role, content, timestamp) {
            const wrapper = document.createElement('div');
            wrapper.className = 'message-wrapper ' + role;

            const header = document.createElement('div');
            header.className = 'message-header';
            header.textContent = role === 'user' ? 'You' : modelName;
            wrapper.appendChild(header);

            const div = document.createElement('div');
            div.className = 'message';
            
            const contentDiv = document.createElement('div');
            contentDiv.style.whiteSpace = 'pre-wrap';
            contentDiv.textContent = content;
            div.appendChild(contentDiv);

            if (timestamp) {
                const timeDiv = document.createElement('div');
                timeDiv.className = 'timestamp';
                timeDiv.textContent = formatTime(timestamp);
                div.appendChild(timeDiv);
            }

            wrapper.appendChild(div);
            messagesDiv.appendChild(wrapper);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            return div; // Return message bubble for streaming updates
        }

        renderMessages();

        sendBtn.addEventListener('click', () => {
            const text = input.value;
            if (text) {
                vscode.postMessage({ command: 'sendMessage', text });
                input.value = '';
            }
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const text = input.value;
                if (text) {
                    vscode.postMessage({ command: 'sendMessage', text });
                    input.value = '';
                }
            }
        });

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch(message.command) {
                case 'addMessage':
                    addMessageToDom(message.role, message.content, Date.now());
                    break;
                case 'startAssistantMessage':
                    // Create a placeholder div we can append to
                    const wrapper = document.createElement('div');
                    wrapper.className = 'message-wrapper assistant';

                    const header = document.createElement('div');
                    header.className = 'message-header';
                    header.textContent = modelName;
                    wrapper.appendChild(header);

                    const div = document.createElement('div');
                    div.className = 'message assistant';
                    
                    const contentDiv = document.createElement('div');
                    contentDiv.style.whiteSpace = 'pre-wrap';
                    contentDiv.id = 'current-streaming-response';
                    div.appendChild(contentDiv);
                    
                    wrapper.appendChild(div);
                    messagesDiv.appendChild(wrapper);
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                    break;
                case 'appendToken':
                    const current = document.getElementById('current-streaming-response');
                    if (current) {
                        current.textContent += message.content;
                        messagesDiv.scrollTop = messagesDiv.scrollHeight;
                    }
                    break;
                case 'endAssistantMessage':
                    const done = document.getElementById('current-streaming-response');
                    if (done) {
                        done.removeAttribute('id');
                        // Add timestamp needed? API response time is current time roughly
                        const parentMsg = done.parentElement;
                        const timeDiv = document.createElement('div');
                        timeDiv.className = 'timestamp';
                        timeDiv.textContent = formatTime(Date.now());
                        parentMsg.appendChild(timeDiv);
                    }
                    break;
            }
        });
    </script>
</body>
</html>`;
    }
}
