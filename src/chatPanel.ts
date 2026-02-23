import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ChatService, Chat } from './chatService';
import { OllamaProvider } from './ollamaProvider';
import { ModelSettingsService } from './modelSettingsService';
import { FramingService } from './services/framingService';
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
    private _framingService: FramingService;
    private _onStateChange?: () => void;

    public static createOrShow(extensionUri: vscode.Uri, chat: Chat, chatService: ChatService, provider: OllamaProvider, modelSettingsService: ModelSettingsService, framingService: FramingService, onStateChange?: () => void) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (ChatPanel.panels.has(chat.id)) {
            const existing = ChatPanel.panels.get(chat.id)!;
            existing._chat = chat;
            existing._panel.title = `${chat.name} - ${chat.modelName}`;
            existing._panel.reveal(column);
            return existing;
        }

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

        const chatPanel = new ChatPanel(panel, extensionUri, chat, chatService, provider, modelSettingsService, framingService, onStateChange);
        ChatPanel.panels.set(chat.id, chatPanel);
        return chatPanel;
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, chat: Chat, chatService: ChatService, provider: OllamaProvider, modelSettingsService: ModelSettingsService, framingService: FramingService, onStateChange?: () => void) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._chat = chat;
        this._chatService = chatService;
        this._provider = provider;
        this._modelSettingsService = modelSettingsService;
        this._framingService = framingService;
        this._onStateChange = onStateChange;

        this._update();

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
                    case 'requestFraming':
                        await this._handleRequestFraming();
                        return;
                    case 'revertFraming':
                        await this._handleRevertFraming();
                        return;
                    case 'requestMoreActions':
                        await this._handleRequestMoreActions();
                        return;
                }
            },
            null,
            this._disposables
        );

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    private async _handleRequestFraming() {
        const framings = this._framingService.getAllFramings();
        const items = framings.map(f => ({
            label: f.name,
            description: f.description,
            framing: f
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a model framing for this chat'
        });

        if (selected) {
            await this._chatService.setActiveFraming(this._chat.id, selected.framing.id);
            this._chat.activeFramingId = selected.framing.id;
            this._panel.webview.postMessage({
                command: 'updateFraming',
                framingName: selected.framing.name
            });
            vscode.window.showInformationMessage(`Applied framing override: ${selected.framing.name}`);
        }
    }

    private async _handleRevertFraming() {
        await this._chatService.setActiveFraming(this._chat.id, undefined);
        this._chat.activeFramingId = undefined;
        this._panel.webview.postMessage({
            command: 'updateFraming',
            framingName: undefined
        });
        vscode.window.showInformationMessage('Reverted to model default framing');
    }

    private async _handleRequestMoreActions() {
        const actions = [
            { label: '$(library) Apply Model Framing', id: 'applyFraming' }
        ];

        const selected = await vscode.window.showQuickPick(actions, {
            placeHolder: 'Chat Actions'
        });

        if (selected?.id === 'applyFraming') {
            await this._handleRequestFraming();
        }
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

        if (this._chat.messages.length === 0) {
            this._chatService.deleteChat(this._chat.id).then(() => {
                if (this._onStateChange) {
                    this._onStateChange();
                }
            });
        }

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
        
        // Resolve active framing
        let settings = this._modelSettingsService.getSettings(this._chat.modelName);
        let activeFraming: any = undefined;

        if (this._chat.activeFramingId) {
            activeFraming = this._framingService.getFraming(this._chat.activeFramingId);
            if (activeFraming) {
                settings = {
                    systemMessage: activeFraming.systemMessage,
                    userMessagePrefix: activeFraming.userMessagePrefix,
                    userMessageSuffix: activeFraming.userMessageSuffix,
                    systemTurnPrefix: activeFraming.systemTurnPrefix,
                    systemTurnSuffix: activeFraming.systemTurnSuffix
                };
            } else {
                // Framing was deleted!
                const selection = await vscode.window.showWarningMessage(
                    `The framing previously used in this chat was deleted. What would you like to do?`,
                    { modal: true },
                    'Select New Framing',
                    'Use Model Defaults'
                );

                if (selection === 'Select New Framing') {
                    await this._handleRequestFraming();
                    // Re-read settings after potential selection
                    if (this._chat.activeFramingId) {
                        activeFraming = this._framingService.getFraming(this._chat.activeFramingId);
                        if (activeFraming) {
                            settings = {
                                systemMessage: activeFraming.systemMessage,
                                userMessagePrefix: activeFraming.userMessagePrefix,
                                userMessageSuffix: activeFraming.userMessageSuffix,
                                systemTurnPrefix: activeFraming.systemTurnPrefix,
                                systemTurnSuffix: activeFraming.systemTurnSuffix
                            };
                        }
                    }
                } else if (selection === 'Use Model Defaults') {
                    await this._handleRevertFraming();
                    settings = this._modelSettingsService.getSettings(this._chat.modelName);
                } else {
                    // Cancelled
                    return;
                }
            }
        }

        let messageProcessed = false;

        if (editOptions) {
            if (editOptions.mode === 'truncate') {
                const answer = await vscode.window.showWarningMessage(
                    'Are you sure? Editing this message will remove all subsequent messages in this chat.',
                    { modal: true },
                    'Edit & Truncate'
                );

                if (answer !== 'Edit & Truncate') {
                    return;
                }

                const updatedChat = await this._chatService.truncateChat(this._chat.id, editOptions.index, trimmedText, {
                    framingId: activeFraming?.id,
                    framingName: activeFraming?.name,
                    ...settings
                });
                if (updatedChat) {
                    this._chat = updatedChat;
                    this._updateTitle();
                    this._panel.webview.postMessage({ command: 'setMessages', messages: this._chat.messages });
                    messageProcessed = true;
                }
            } else if (editOptions.mode === 'fork') {
                const newChat = await this._chatService.forkChat(this._chat.id, editOptions.index, trimmedText, {
                    framingId: activeFraming?.id,
                    framingName: activeFraming?.name,
                    ...settings
                });
                if (newChat) {
                    const newPanel = ChatPanel.createOrShow(this._extensionUri, newChat, this._chatService, this._provider, this._modelSettingsService, this._framingService, this._onStateChange);

                    if (this._onStateChange) {
                        this._onStateChange();
                    }

                    if (newPanel) {
                        await newPanel._generateResponse();
                    }

                    return;
                }
            }
        }

        if (!messageProcessed) {
            // Check if we need to inject a system prompt change
            const lastMessage = this._chat.messages[this._chat.messages.length - 1];
            const lastSystemPrompt = this._chat.messages.filter(m => m.role === 'system').pop()?.content;
            
            // If it's a completely new chat, or the system prompt has changed
            if (this._chat.messages.length === 0 || (settings.systemMessage && settings.systemMessage !== lastSystemPrompt)) {
                await this._chatService.addMessage(this._chat.id, 'system', settings.systemMessage || '');
            }

            const metadata = {
                systemTurnPrefix: settings.systemTurnPrefix,
                userPrefix: settings.userMessagePrefix,
                userSuffix: settings.userMessageSuffix,
                systemTurnSuffix: settings.systemTurnSuffix,
                framingId: activeFraming?.id,
                framingName: activeFraming?.name
            };

            await this._chatService.addMessage(this._chat.id, 'user', trimmedText, metadata);
            this._chat = this._chatService.getChat(this._chat.id) || this._chat; 
            this._updateTitle();
            this._panel.webview.postMessage({ 
                command: 'addMessage', 
                role: 'user', 
                content: trimmedText,
                ...metadata
            });

            if (this._chat.messages.length > 1 && this._chat.messages[0].role === 'system') {
                this._panel.webview.postMessage({ command: 'setMessages', messages: this._chat.messages });
            }
        }

        await this._generateResponse();
    }

    private async _generateResponse() {
        const apiMessages: { role: string; content: string }[] = [];

        for (const m of this._chat.messages) {
            if (m.role === 'system') {
                apiMessages.push({ role: 'system', content: m.content });
            } else if (m.role === 'user') {
                if (m.systemTurnPrefix) {
                    apiMessages.push({ role: 'system', content: m.systemTurnPrefix });
                }

                let userContent = m.content;
                if (m.userPrefix) {
                    userContent = `${m.userPrefix}${userContent}`;
                }
                if (m.userSuffix) {
                    userContent = `${userContent}${m.userSuffix}`;
                }
                apiMessages.push({ role: 'user', content: userContent });

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
                    this._panel.webview.postMessage({ command: 'startAssistantMessage' });
                    if (this._onStateChange) {
                        this._onStateChange();
                    }
                }
                fullResponse += token;
                this._panel.webview.postMessage({ command: 'appendToken', content: token });
            });

            this._panel.webview.postMessage({ command: 'setLoading', loading: false });
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

        const updatedChat = await this._chatService.deleteMessagesFrom(this._chat.id, index);
        if (updatedChat) {
            this._chat = updatedChat;
            this._updateTitle();
            this._panel.webview.postMessage({ command: 'setMessages', messages: this._chat.messages });
            await this._generateResponse();
        }
    }

    private async _handleRequestForkAssistant(index: number) {
        const newChat = await this._chatService.forkChatFrom(this._chat.id, index);
        if (newChat) {
            const newPanel = ChatPanel.createOrShow(this._extensionUri, newChat, this._chatService, this._provider, this._modelSettingsService, this._framingService, this._onStateChange);

            if (this._onStateChange) {
                this._onStateChange();
            }

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
        
        setTimeout(() => {
            const PAGE_SIZE = 50;
            const paginated = this._chatService.getPaginatedMessages(this._chat.id, PAGE_SIZE, 0);
            
            let activeFramingName = undefined;
            if (this._chat.activeFramingId) {
                activeFramingName = this._framingService.getFraming(this._chat.activeFramingId)?.name;
            }

            this._panel.webview.postMessage({
                command: 'initState',
                modelName: this._chat.modelName,
                messages: paginated.messages,
                total: paginated.total,
                activeFramingName
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
