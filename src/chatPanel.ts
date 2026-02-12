import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ChatService, Chat } from './chatService';
import { OllamaProvider } from './ollamaProvider';
import { ModelSettingsService } from './modelSettingsService';
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
    private _provider: OllamaProvider;
    private _modelSettingsService: ModelSettingsService;
    private _onStateChange?: () => void;

    public static createOrShow(extensionUri: vscode.Uri, chat: Chat, chatService: ChatService, provider: OllamaProvider, modelSettingsService: ModelSettingsService, onStateChange?: () => void) {
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
                localResourceRoots: [
                    vscode.Uri.file(path.join(extensionUri.fsPath, 'media')),
                    vscode.Uri.file(path.join(extensionUri.fsPath, 'dist'))
                ]
            }
        );

        const chatPanel = new ChatPanel(panel, extensionUri, chat, chatService, provider, modelSettingsService, onStateChange);
        ChatPanel.panels.set(chat.id, chatPanel);
        return chatPanel;
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, chat: Chat, chatService: ChatService, provider: OllamaProvider, modelSettingsService: ModelSettingsService, onStateChange?: () => void) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._chat = chat;
        this._chatService = chatService;
        this._provider = provider;
        this._modelSettingsService = modelSettingsService;
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
        const settings = this._modelSettingsService.getSettings(this._chat.modelName);

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
                    const newPanel = ChatPanel.createOrShow(this._extensionUri, newChat, this._chatService, this._provider, this._modelSettingsService, this._onStateChange);

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
            // If it's a completely new chat, and there's an initial system message, store it.
            if (this._chat.messages.length === 0 && settings.systemMessage) {
                await this._chatService.addMessage(this._chat.id, 'system', settings.systemMessage);
            }

            const metadata = {
                systemTurnPrefix: settings.systemTurnPrefix,
                userPrefix: settings.userMessagePrefix,
                userSuffix: settings.userMessageSuffix,
                systemTurnSuffix: settings.systemTurnSuffix
            };

            await this._chatService.addMessage(this._chat.id, 'user', trimmedText, metadata);
            this._chat = this._chatService.getChat(this._chat.id) || this._chat; // Refresh chat state
            this._updateTitle();
            // 2. Update UI with user message (including metadata)
            this._panel.webview.postMessage({ 
                command: 'addMessage', 
                role: 'user', 
                content: trimmedText,
                ...metadata
            });

            // If we added a system message, we might need to refresh the webview messages 
            // or send an 'addMessage' for it too if we want it to show up immediately.
            // Let's just refresh the messages to be safe since it's only at the start.
            if (this._chat.messages.length > 1 && this._chat.messages[0].role === 'system') {
                this._panel.webview.postMessage({ command: 'setMessages', messages: this._chat.messages });
            }
        }

        // 3. Call Ollama API
        await this._generateResponse();
    }

    private async _generateResponse() {
        const apiMessages: { role: string; content: string }[] = [];

        // Map chat history with stored injection logic for historical consistency
        for (const m of this._chat.messages) {
            if (m.role === 'system') {
                apiMessages.push({ role: 'system', content: m.content });
            } else if (m.role === 'user') {
                // System turn prefix from metadata
                if (m.systemTurnPrefix) {
                    apiMessages.push({ role: 'system', content: m.systemTurnPrefix });
                }

                // User message framing from metadata
                let userContent = m.content;
                if (m.userPrefix) {
                    userContent = `${m.userPrefix}${userContent}`;
                }
                if (m.userSuffix) {
                    userContent = `${userContent}${m.userSuffix}`;
                }
                apiMessages.push({ role: 'user', content: userContent });

                // System turn suffix from metadata
                if (m.systemTurnSuffix) {
                    apiMessages.push({ role: 'system', content: m.systemTurnSuffix });
                }
            } else {
                apiMessages.push({ role: m.role, content: m.content });
            }
        }

        let fullResponse = '';

        try {
            this._panel.webview.postMessage({ command: 'setLoading', loading: true });
            
            let hasStarted = false;
            await this._provider.chat(this._chat.modelName, apiMessages, (token) => {
                if (!hasStarted) {
                    hasStarted = true;
                    this._panel.webview.postMessage({ command: 'setLoading', loading: false });
                    // Send empty assistant message to start streaming into
                    this._panel.webview.postMessage({ command: 'startAssistantMessage' });
                    // Signal state change (model is running)
                    if (this._onStateChange) {
                        this._onStateChange();
                    }
                }
                fullResponse += token;
                this._panel.webview.postMessage({ command: 'appendToken', content: token });
            });

            this._panel.webview.postMessage({ command: 'setLoading', loading: false });
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
            const newPanel = ChatPanel.createOrShow(this._extensionUri, newChat, this._chatService, this._provider, this._modelSettingsService, this._onStateChange);

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
        
        // Send initial state after a small delay to ensure webview is ready
        setTimeout(() => {
            const PAGE_SIZE = 50;
            const paginated = this._chatService.getPaginatedMessages(this._chat.id, PAGE_SIZE, 0);
            this._panel.webview.postMessage({
                command: 'initState',
                modelName: this._chat.modelName,
                messages: paginated.messages,
                total: paginated.total
            });
        }, 100);
    }

    private _getHtmlForWebview() {
        const htmlPath = path.join(this._extensionUri.fsPath, 'media', 'chat.html');
        let html = fs.readFileSync(htmlPath, 'utf8');

        const scriptUri = this._panel.webview.asWebviewUri(
            vscode.Uri.file(path.join(this._extensionUri.fsPath, 'dist', 'webview', 'chat.js'))
        );
        const styleUri = this._panel.webview.asWebviewUri(
            vscode.Uri.file(path.join(this._extensionUri.fsPath, 'media', 'chat.css'))
        );

        html = html.replace('{{scriptUri}}', scriptUri.toString());
        html = html.replace('{{styleUri}}', styleUri.toString());

        return html;
    }
}
