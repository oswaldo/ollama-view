import * as vscode from 'vscode';
import { ChatService, Chat } from './chatService';
import { OllamaApi } from './ollamaApi';
import { Logger } from './logger';

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
            const existing = ChatPanel.panels.get(chat.id)!;
            // Update the chat object and title in case they changed
            existing._chat = chat;
            existing._panel.title = `${chat.name} - ${chat.modelName}`;
            existing._panel.reveal(column);
            return existing;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            ChatPanel.viewType,
            `${chat.name} - ${chat.modelName}`,
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        const chatPanel = new ChatPanel(panel, extensionUri, chat, chatService, api, onStateChange);
        ChatPanel.panels.set(chat.id, chatPanel);
        return chatPanel;
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
                        await this.handleUserMessage(message.text, message.editOptions);
                        return;
                    case 'requestTruncate':
                        await this._handleRequestTruncate(message.index, message.content);
                        return;
                    case 'requestRegenerate':
                        await this._handleRequestRegenerate(message.index);
                        return;
                    case 'requestForkAssistant':
                        await this._handleRequestForkAssistant(message.index);
                        return;
                    case 'requestLoadMore':
                        await this._handleRequestLoadMore(message.offset);
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

    private async _handleRequestLoadMore(offset: number) {
        const PAGE_SIZE = 50;
        const paginated = this._chatService.getPaginatedMessages(this._chat.id, PAGE_SIZE, offset);
        this._panel.webview.postMessage({
            command: 'moreMessagesLoaded',
            messages: paginated.messages,
            total: paginated.total
        });
    }

    public postMessage(message: any) {
        this._panel.webview.postMessage(message);
    }

    public dispose() {
        ChatPanel.panels.delete(this._chat.id);

        // If the chat has no messages, it's a "transient" empty chat. 
        // Delete it so it doesn't clutter the tree.
        if (this._chat.messages.length === 0) {
            this._chatService.deleteChat(this._chat.id).then(() => {
                if (this._onStateChange) {
                    this._onStateChange();
                }
            });
        }

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    public async handleUserMessage(text: string, editOptions?: { mode: 'truncate' | 'fork', index: number }) {
        const trimmedText = text.trim();
        // 1. Save user message (handling edits)
        let messageProcessed = false;

        if (editOptions) {
            if (editOptions.mode === 'truncate') {
                const answer = await vscode.window.showWarningMessage(
                    'Are you sure? Editing this message will remove all subsequent messages in this chat.',
                    { modal: true },
                    'Edit & Truncate'
                );

                if (answer !== 'Edit & Truncate') {
                    // User cancelled, do not proceed with truncation
                    return;
                }

                const updatedChat = await this._chatService.truncateChat(this._chat.id, editOptions.index, trimmedText);
                if (updatedChat) {
                    this._chat = updatedChat;
                    this._updateTitle();
                    // PERFORMANCE OPTIMIZATION: Update messages without full re-render
                    this._panel.webview.postMessage({ command: 'setMessages', messages: this._chat.messages });
                    messageProcessed = true;
                }
            } else if (editOptions.mode === 'fork') {
                const newChat = await this._chatService.forkChat(this._chat.id, editOptions.index, trimmedText);
                if (newChat) {
                    // Switch to new chat
                    const newPanel = ChatPanel.createOrShow(this._extensionUri, newChat, this._chatService, this._api, this._onStateChange);

                    // Signal tree view to refresh so the new chat appears
                    if (this._onStateChange) {
                        this._onStateChange();
                    }

                    // Trigger inference in the new panel
                    if (newPanel) {
                        await newPanel._generateResponse();
                    }

                    return; // Stop processing in this panel
                }
            }
        }

        if (!messageProcessed) {
            await this._chatService.addMessage(this._chat.id, 'user', trimmedText);
            this._chat = this._chatService.getChat(this._chat.id) || this._chat; // Refresh chat state
            this._updateTitle();
            // 2. Update UI with user message
            this._panel.webview.postMessage({ command: 'addMessage', role: 'user', content: trimmedText });
        }

        // 3. Call Ollama API
        await this._generateResponse();
    }

    private async _generateResponse() {
        const messages = this._chat.messages.map(m => ({ role: m.role, content: m.content }));
        let fullResponse = '';

        try {
            this._panel.webview.postMessage({ command: 'setLoading', loading: true });
            
            // Send empty assistant message to start streaming into
            this._panel.webview.postMessage({ command: 'startAssistantMessage' });

            let hasStarted = false;
            await this._api.chat(this._chat.modelName, messages, (token) => {
                if (!hasStarted) {
                    hasStarted = true;
                    this._panel.webview.postMessage({ command: 'setLoading', loading: false });
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
            this._panel.webview.postMessage({ command: 'setLoading', loading: false });
            this._panel.webview.postMessage({ command: 'endAssistantMessage' });
            Logger.error('Chat generation error', err);
            
            let errorMessage = err.message;
            const options = ['Retry'];
            
            if (err.message.includes('ECONNREFUSED')) {
                errorMessage = 'Could not connect to Ollama. Is it running?';
            } else if (err.message.toLowerCase().includes('not found')) {
                errorMessage = `Model '${this._chat.modelName}' not found.`;
                options.push('Pull Model');
            }

            this._panel.webview.postMessage({ command: 'addErrorMessage', content: errorMessage });
            
            const selection = await vscode.window.showErrorMessage(`Chat Error: ${errorMessage}`, ...options);
            
            if (selection === 'Retry') {
                // Remove the error message from the UI before retrying? 
                // Currently it just appends a new attempt. 
                // To keep it clean, we could truncate the chat to remove the last user message and re-send it,
                // but _generateResponse doesn't add the user message, _handleMessage does.
                // So retrying here just calls the API again with same messages.
                await this._generateResponse();
            } else if (selection === 'Pull Model') {
                vscode.commands.executeCommand('ollamaView.pull', this._chat.modelName);
            }
        }
    }

    private async _handleRequestTruncate(index: number, content: string) {
        this._panel.webview.postMessage({
            command: 'enterEditMode',
            mode: 'truncate',
            index,
            content
        });
    }

    private async _handleRequestRegenerate(index: number) {
        // If it's not the last message, confirm truncation
        if (index < this._chat.messages.length - 1) {
            const answer = await vscode.window.showWarningMessage(
                'Regenerating this message will remove all subsequent messages in this chat. Are you sure?',
                { modal: true },
                'Regenerate'
            );
            if (answer !== 'Regenerate') {
                return;
            }
        }

        // Truncate at the assistant message index (exclusive? no, we want to remove the assistant message too and regenerate it)
        // Wait, if we want to regenerate, we need to keep context UP TO the user message BEFORE this assistant message.
        // So we delete messages from 'index'. 
        // Example: 0:User, 1:Assistant. Regenerate 1. Delete 1. New chat ends at 0. Generate response for 0.

        const updatedChat = await this._chatService.deleteMessagesFrom(this._chat.id, index);
        if (updatedChat) {
            this._chat = updatedChat;
            this._updateTitle();
            // PERFORMANCE OPTIMIZATION: Update messages without full re-render
            this._panel.webview.postMessage({ command: 'setMessages', messages: this._chat.messages });
            await this._generateResponse();
        }
    }

    private async _handleRequestForkAssistant(index: number) {
        // Fork from index. We want to keep info UP TO index.
        // Example: 0:User, 1:Assistant. Fork 1.
        // Ideally "Fork" on assistant message means: Create new chat with [0:User], and generate new response.
        // So we want context up to 0. 
        // index is 1. forkChatFrom(id, 1) keeps 0. Correct.

        const newChat = await this._chatService.forkChatFrom(this._chat.id, index);
        if (newChat) {
            // Switch to new chat
            const newPanel = ChatPanel.createOrShow(this._extensionUri, newChat, this._chatService, this._api, this._onStateChange);

            // Signal tree view to refresh so the new chat appears
            if (this._onStateChange) {
                this._onStateChange();
            }

            // Trigger inference in the new panel
            if (newPanel) {
                await newPanel._generateResponse();
            }
        }
    }

    private _updateTitle() {
        this._panel.title = `${this._chat.name} - ${this._chat.modelName}`;
    }

    private _update() {
        this._panel.webview.html = this._getHtmlForWebview();
    }

    private _getHtmlForWebview() {
        // Simple HTML for now. In a real app we might use React/Vue or just cleaner vanilla JS.
        // We will inject the existing messages.

        const PAGE_SIZE = 50;
        const paginated = this._chatService.getPaginatedMessages(this._chat.id, PAGE_SIZE, 0);
        const initialMessages = JSON.stringify(paginated.messages);
        const totalMessages = paginated.total;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat</title>
    <style>
        body { font-family: var(--vscode-font-family); padding: 10px; color: var(--vscode-editor-foreground); background-color: var(--vscode-editor-background); margin: 0; }
        .message-wrapper { margin-bottom: 15px; display: flex; flex-direction: column; position: relative; }
        .message-header { font-size: 0.8em; margin-bottom: 2px; color: var(--vscode-descriptionForeground); font-weight: bold; }
        .message { padding: 10px; border-radius: 5px; position: relative; max-width: 90%; word-wrap: break-word; }
        .user { align-self: flex-end; align-items: flex-end; }
        .user .message { background-color: var(--vscode-textBlockQuote-background); border-left: 2px solid var(--vscode-textBlockQuote-border); }
        .assistant .message { background-color: var(--vscode-editor-inactiveSelectionBackground); }
        .error .message { background-color: var(--vscode-inputValidation-errorBackground); border: 1px solid var(--vscode-inputValidation-errorBorder); color: var(--vscode-inputValidation-errorForeground); }
        .timestamp { font-size: 0.7em; color: var(--vscode-descriptionForeground); text-align: right; margin-top: 5px; opacity: 0.8; }
        
        /* Typing Indicator */
        .typing-indicator {
            display: flex;
            padding: 10px;
            gap: 4px;
        }
        .dot {
            width: 6px;
            height: 6px;
            background: var(--vscode-descriptionForeground);
            border-radius: 50%;
            animation: pulse 1.5s infinite;
        }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes pulse {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.2); }
        }

        .input-area { position: fixed; bottom: 0; left: 0; right: 0; padding: 10px; background-color: var(--vscode-editor-background); border-top: 1px solid var(--vscode-widget-border); display: flex; z-index: 1000; }
        #messageInput { flex-grow: 1; padding: 5px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); }
        #sendBtn, #cancelBtn { margin-left: 5px; padding: 5px 10px; cursor: pointer; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; }
        #sendBtn:hover { background: var(--vscode-button-hoverBackground); }
        #sendBtn:disabled { opacity: 0.5; cursor: not-allowed; }
        
        #cancelBtn { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
        #cancelBtn:hover { background: var(--vscode-button-secondaryHoverBackground); }

        .input-area.editing #sendBtn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .messages-container { margin-bottom: 60px; overflow-y: auto; height: calc(100vh - 80px); display: flex; flex-direction: column; padding-bottom: 20px; }
        pre { background: var(--vscode-textCodeBlock-background); padding: 5px; overflow-x: auto; }
        code { font-family: var(--vscode-editor-font-family); }

        /* Hover Buttons */
        .buttons-container {
            position: sticky;
            top: -10px;
            right: 0;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s;
            gap: 5px;
            background: var(--vscode-editor-background);
            padding: 2px;
            border-radius: 4px;
            border: 1px solid var(--vscode-widget-border);
            align-self: flex-end;
            margin-bottom: -28px; /* Overlay to avoid taking space */
            z-index: 10;
            display: flex;
        }
        .message-wrapper:hover .buttons-container {
            opacity: 1;
            pointer-events: auto;
        }
        .icon-btn {
            background: transparent;
            border: none;
            color: var(--vscode-descriptionForeground);
            cursor: pointer;
            padding: 2px 4px;
            border-radius: 3px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .icon-btn:hover {
            background: var(--vscode-toolbar-hoverBackground);
            color: var(--vscode-editor-foreground);
        }
        
        /* Dropdown Menu */
        .dropdown-menu {
            position: absolute;
            top: 100%;
            right: 0;
            background: var(--vscode-menu-background);
            color: var(--vscode-menu-foreground);
            border: 1px solid var(--vscode-menu-border);
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            display: none;
            z-index: 100;
            min-width: 140px;
            margin-top: 2px;
        }
        .dropdown-item {
            padding: 6px 10px;
            cursor: pointer;
            font-size: 0.9em;
            display: block;
        }
        .dropdown-item:hover {
            background: var(--vscode-menu-selectionBackground);
            color: var(--vscode-menu-selectionForeground);
        }

        /* Tooltip */
        .tooltip {
            position: fixed;
            background: var(--vscode-editorHoverWidget-background);
            color: var(--vscode-editorHoverWidget-foreground);
            border: 1px solid var(--vscode-editorHoverWidget-border);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s ease;
            z-index: 1000;
        }
        .tooltip.visible {
            opacity: 1;
        }
    </style>
</head>
<body>
    <div class="messages-container" id="messages">
        <div id="loadMoreContainer" style="text-align: center; padding: 10px; display: none;">
            <button id="loadMoreBtn" style="background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; padding: 5px 10px; cursor: pointer;">Load older messages</button>
        </div>
    </div>
    
    <div class="input-area" id="inputArea">
        <input type="text" id="messageInput" placeholder="Type a message..." autocomplete="off" />
        <button id="sendBtn">Send</button>
        <button id="cancelBtn" style="display: none;">Cancel</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const messagesDiv = document.getElementById('messages');
        const input = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const inputArea = document.getElementById('inputArea');
        const modelName = "${this._chat.modelName}";
        let totalMessages = ${totalMessages};
        
        // Initial state
        let messages = ${initialMessages};
        let editState = null; // { mode: 'truncate'|'fork', index: number } || null
        let activeDropdown = null; // Element reference
        let truncatedMessagesBackup = null; // To restore on cancel
        
        const loadMoreContainer = document.getElementById('loadMoreContainer');
        const loadMoreBtn = document.getElementById('loadMoreBtn');

        function updateLoadMoreVisibility() {
            if (messages.length < totalMessages) {
                loadMoreContainer.style.display = 'block';
            } else {
                loadMoreContainer.style.display = 'none';
            }
        }

        function renderMessages(preserveScroll = false) {
            const oldScrollHeight = messagesDiv.scrollHeight;
            const oldScrollTop = messagesDiv.scrollTop;

            // Clear messages but keep loadMoreContainer
            const container = document.getElementById('loadMoreContainer');
            messagesDiv.innerHTML = '';
            messagesDiv.appendChild(container);

            messages.forEach((m, i) => {
                const absoluteIndex = (totalMessages - messages.length) + i;
                addMessageToDom(m.role, m.content, m.timestamp, absoluteIndex, false);
            });
            
            updateLoadMoreVisibility();

            if (preserveScroll) {
                messagesDiv.scrollTop = oldScrollTop + (messagesDiv.scrollHeight - oldScrollHeight);
            } else {
                // If it's the first render or we are adding new messages at bottom
                if (oldScrollHeight === 0) {
                     messagesDiv.scrollTop = messagesDiv.scrollHeight;
                }
            }
        }

        loadMoreBtn.onclick = () => {
            vscode.postMessage({
                command: 'requestLoadMore',
                offset: messages.length
            });
        };

        let typingIndicator = null;
        function showTypingIndicator() {
            if (typingIndicator) return;
            typingIndicator = document.createElement('div');
            typingIndicator.className = 'message-wrapper assistant';
            typingIndicator.innerHTML = \`
                <div class="message-header">\${modelName}</div>
                <div class="message">
                    <div class="typing-indicator">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                    </div>
                </div>
            \`;
            messagesDiv.appendChild(typingIndicator);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function hideTypingIndicator() {
            if (typingIndicator) {
                typingIndicator.remove();
                typingIndicator = null;
            }
        }

        const CopyIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
        const MoreIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1.5"></circle><circle cx="19" cy="12" r="1.5"></circle><circle cx="5" cy="12" r="1.5"></circle></svg>';

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

        // Tooltip Helper
        function showTooltip(target, text) {
            let tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = text;
            document.body.appendChild(tooltip);

            const rect = target.getBoundingClientRect();
            tooltip.style.left = rect.left + 'px';
            tooltip.style.top = (rect.top - 30) + 'px';
            tooltip.classList.add('visible');

            setTimeout(() => {
                tooltip.classList.remove('visible');
                setTimeout(() => tooltip.remove(), 300);
            }, 1500);
        }

        function addMessageToDom(role, content, timestamp, index, shouldScroll = true) {
            const wrapper = document.createElement('div');
            wrapper.className = 'message-wrapper ' + role;

            const header = document.createElement('div');
            header.className = 'message-header';
            header.textContent = role === 'user' ? 'You' : modelName;
            wrapper.appendChild(header);

            const div = document.createElement('div');
            div.className = 'message';
            
            // Buttons Container for ALL messages (user and assistant)
            if (typeof index === 'number') {
                const btns = document.createElement('div');
                btns.className = 'buttons-container';
                
                // Copy Button
                const copyBtn = document.createElement('button');
                copyBtn.className = 'icon-btn';
                copyBtn.title = 'Copy';
                copyBtn.innerHTML = CopyIcon;
                copyBtn.onclick = (e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(content);
                    showTooltip(e.currentTarget, 'Copied!');
                };
                btns.appendChild(copyBtn);

                // Options Button
                const optsBtn = document.createElement('button');
                optsBtn.className = 'icon-btn';
                optsBtn.title = 'Options';
                optsBtn.innerHTML = MoreIcon;
                optsBtn.onclick = (e) => {
                    e.stopPropagation();
                    toggleDropdown(e, index, content, role);
                };
                btns.appendChild(optsBtn);

                wrapper.appendChild(btns);
            }

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
            if (shouldScroll) {
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
            return div;
        }

        function toggleDropdown(e, index, content, role) {
            // Remove existing dropdown if any
            closeDropdown();
            
            const btn = e.currentTarget;
            const parent = btn.parentElement; 
            
            const menu = document.createElement('div');
            menu.className = 'dropdown-menu';
            
            if (role === 'user') {
                const itemTruncate = document.createElement('div');
                itemTruncate.className = 'dropdown-item';
                itemTruncate.textContent = 'Edit / Truncate';
                itemTruncate.onclick = () => {
                    enterEditMode('truncate', index, content);
                    closeDropdown();
                };
                menu.appendChild(itemTruncate);
                
                const itemFork = document.createElement('div');
                itemFork.className = 'dropdown-item';
                itemFork.textContent = 'Edit / Fork';
                itemFork.onclick = () => {
                     enterEditMode('fork', index, content);
                     closeDropdown();
                };
                menu.appendChild(itemFork);
            } else if (role === 'assistant') {
                // Regenerate
                const itemRegen = document.createElement('div');
                itemRegen.className = 'dropdown-item';
                
                // Check if it's the last message
                const isLast = index === messages.length - 1;
                itemRegen.textContent = isLast ? 'Regenerate' : 'Regenerate (Truncate)';
                
                itemRegen.onclick = () => {
                     vscode.postMessage({
                         command: 'requestRegenerate',
                         index
                     });
                     closeDropdown();
                };
                menu.appendChild(itemRegen);

                // Fork
                const itemFork = document.createElement('div');
                itemFork.className = 'dropdown-item';
                itemFork.textContent = 'Fork';
                itemFork.onclick = () => {
                     vscode.postMessage({
                         command: 'requestForkAssistant',
                         index
                     });
                     closeDropdown();
                };
                menu.appendChild(itemFork);
            }
            
            parent.appendChild(menu);
            menu.style.display = 'block';
            activeDropdown = menu;
            
            // Click outside to close
            setTimeout(() => {
                document.addEventListener('click', closeDropdownOutside);
            }, 0);
        }
        
        function closeDropdown() {
            if (activeDropdown) {
                activeDropdown.remove();
                activeDropdown = null;
                document.removeEventListener('click', closeDropdownOutside);
            }
        }
        
        function closeDropdownOutside(e) {
            if (activeDropdown && !activeDropdown.contains(e.target)) {
                closeDropdown();
            }
        }
        
        function enterEditMode(mode, index, content) {
            editState = { mode, index };
            input.value = content;
            
            // Ensure focus happens after DOM updates
            setTimeout(() => input.focus(), 0); 
            
            inputArea.classList.add('editing');
            cancelBtn.style.display = 'inline-block';
            sendBtn.textContent = mode === 'truncate' ? 'Edit & Send' : 'Fork & Send';

            if (mode === 'truncate' || mode === 'fork') {
                truncatedMessagesBackup = messages.slice(index);
                messages = messages.slice(0, index);
                renderMessages();
            }
            validateInput();
        }
        
        function resetEditMode() {
            if (editState && (editState.mode === 'truncate' || editState.mode === 'fork') && truncatedMessagesBackup) {
                 // Restore messages on cancel
                 messages = messages.concat(truncatedMessagesBackup);
                 truncatedMessagesBackup = null;
                 renderMessages();
            }
            editState = null;
            inputArea.classList.remove('editing');
            cancelBtn.style.display = 'none';
            sendBtn.textContent = 'Send';
            validateInput();
        }

        function validateInput() {
            const trimmedText = input.value.trim();
            sendBtn.disabled = !trimmedText;
        }

        function sendMessage() {
            const text = input.value;
            const trimmedText = text.trim();

            if (!trimmedText) {
                return;
            }

            if (editState) {
                vscode.postMessage({ 
                    command: 'sendMessage', 
                    text: trimmedText, 
                    editOptions: editState 
                });
                resetEditMode();
            } else {
                vscode.postMessage({ command: 'sendMessage', text: trimmedText });
            }
            input.value = '';
            validateInput();
        }

        renderMessages();
        validateInput();

        sendBtn.addEventListener('click', sendMessage);
        cancelBtn.addEventListener('click', () => {
            input.value = '';
            resetEditMode();
        });

        input.addEventListener('input', validateInput);

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
        
        // Cancel edit on Escape
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && editState) {
                input.value = '';
                resetEditMode();
            }
        });

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch(message.command) {
                case 'setMessages':
                    messages = message.messages;
                    totalMessages = messages.length;
                    renderMessages();
                    break;
                case 'addMessage':
                    // Update local state
                    messages.push({ role: message.role, content: message.content, timestamp: Date.now() });
                    totalMessages++;
                    addMessageToDom(message.role, message.content, Date.now(), messages.length - 1);
                    break;
                case 'startAssistantMessage':
                    hideTypingIndicator();
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
                        const wrapper = done.parentElement.parentElement;
                        const fullContent = done.textContent;
                        const timestamp = Date.now();
                        
                        if (!fullContent) {
                            wrapper.remove();
                        } else {
                            // Update local state
                            messages.push({ role: 'assistant', content: fullContent, timestamp: timestamp });
                            totalMessages++;

                            // Re-render properly with buttons
                            addMessageToDom('assistant', fullContent, timestamp, totalMessages - 1, true);
                            
                            // Remove placeholder
                            wrapper.remove();
                        }
                    }
                    break;
                case 'enterEditMode':
                    enterEditMode(message.mode, message.index, message.content);
                    break;
                case 'addErrorMessage':
                    hideTypingIndicator();
                    addMessageToDom('error', message.content, Date.now());
                    break;
                case 'setLoading':
                    if (message.loading) {
                        showTypingIndicator();
                    } else {
                        hideTypingIndicator();
                    }
                    break;
                case 'moreMessagesLoaded':
                    messages = message.messages.concat(messages);
                    totalMessages = message.total;
                    renderMessages(true);
                    break;
            }
        });
    </script>
</body>
</html>`;
    }
}
