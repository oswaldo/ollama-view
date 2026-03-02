import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { ChatExtensionToWebviewCommand, ChatWebviewToExtensionCommand } from './contracts/IChatWebviewMessages';
import { Logger } from './logger';
import { OllamaProvider } from './ollamaProvider';
import { ChatOrchestrator } from './services/chatOrchestrator';
import { Chat, ChatService } from './services/chatService';
import { FramingService } from './services/framingService';
import { ModelService } from './services/modelService';
import { assertNever } from './utils';

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
    private _modelService: ModelService;
    private _framingService: FramingService;
    private _orchestrator: ChatOrchestrator;
    private _onStateChange?: () => void;

    public static createOrShow(
        extensionUri: vscode.Uri,
        chat: Chat,
        chatService: ChatService,
        provider: OllamaProvider,
        modelService: ModelService,
        framingService: FramingService,
        orchestrator: ChatOrchestrator,
        onStateChange?: () => void,
    ) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

        if (ChatPanel.panels.has(chat.id)) {
            const existing = ChatPanel.panels.get(chat.id);
            if (existing) {
                existing._chat = chat;
                const instance = modelService.getSettings(chat.modelName);
                existing._panel.title = `${chat.name} - ${instance.name}`;
                existing._panel.reveal(column);
                return existing;
            }
        }

        const instance = modelService.getSettings(chat.modelName);
        const panel = vscode.window.createWebviewPanel(
            ChatPanel.viewType,
            `${chat.name} - ${instance.name}`,
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(extensionUri.fsPath, 'media')),
                    vscode.Uri.file(path.join(extensionUri.fsPath, 'dist')),
                ],
            },
        );

        const chatPanel = new ChatPanel(
            panel,
            extensionUri,
            chat,
            chatService,
            provider,
            modelService,
            framingService,
            orchestrator,
            onStateChange,
        );
        ChatPanel.panels.set(chat.id, chatPanel);
        return chatPanel;
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        chat: Chat,
        chatService: ChatService,
        provider: OllamaProvider,
        modelService: ModelService,
        framingService: FramingService,
        orchestrator: ChatOrchestrator,
        onStateChange?: () => void,
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._chat = chat;
        this._chatService = chatService;
        this._provider = provider;
        this._modelService = modelService;
        this._framingService = framingService;
        this._orchestrator = orchestrator;
        this._onStateChange = onStateChange;

        this._update();

        this._panel.webview.onDidReceiveMessage(
            async (message: ChatWebviewToExtensionCommand) => {
                switch (message.command) {
                    case 'sendMessage':
                        await this.handleUserMessage(message.text, message.editOptions, message.framingId);
                        return;
                    case 'requestTruncate':
                        await this._handleHistoryAction(
                            'truncate',
                            message.index,
                            message.content,
                            message.framingId,
                            message.framingName,
                        );
                        return;
                    case 'requestFork':
                        await this._handleHistoryAction(
                            'fork',
                            message.index,
                            message.content,
                            message.framingId,
                            message.framingName,
                        );
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
                    default:
                        assertNever(message);
                }
            },
            null,
            this._disposables,
        );

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    private async _handleRequestFraming() {
        const framings = this._framingService.getAllFramings();
        const items = framings.map((f) => ({
            label: f.name,
            description: f.description,
            framing: f,
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a model framing for this chat',
        });

        if (selected) {
            await this._chatService.setActiveFraming(this._chat.id, selected.framing.id);
            this._chat.activeFramingId = selected.framing.id;
            await this.postMessage({
                command: 'updateFraming',
                framingId: selected.framing.id,
                framingName: selected.framing.name,
            });
            vscode.window.showInformationMessage(`Applied framing override: ${selected.framing.name}`);
        }
    }

    private async _handleRevertFraming() {
        await this._chatService.setActiveFraming(this._chat.id, undefined);
        this._chat.activeFramingId = undefined;
        await this.postMessage({
            command: 'updateFraming',
            framingId: undefined,
            framingName: undefined,
        });
        vscode.window.showInformationMessage('Reverted to model default framing');
    }

    private async _handleRequestMoreActions() {
        const actions = [{ label: '$(library) Apply Model Framing', id: 'applyFraming' }];

        const selected = await vscode.window.showQuickPick(actions, {
            placeHolder: 'Chat Actions',
        });

        if (selected?.id === 'applyFraming') {
            await this._handleRequestFraming();
        }
    }

    private async _handleHistoryAction(
        mode: 'truncate' | 'fork',
        index: number,
        content: string,
        msgFramingId?: string,
        msgFramingName?: string,
    ) {
        const activeFramingId = this._chat.activeFramingId;
        const activeFramingName = activeFramingId ? this._framingService.getFraming(activeFramingId)?.name : undefined;

        let targetFramingId = activeFramingId;
        let targetFramingName = activeFramingName;

        if (msgFramingId !== activeFramingId) {
            const msgName = msgFramingName || 'Default Framing';
            const currentName = activeFramingName || 'Default Framing';

            const selection = await vscode.window.showWarningMessage(
                `Framing Mismatch: This message used "${msgName}", but the chat is currently using "${currentName}". Which framing should be active for the new turn?`,
                { modal: true },
                `Use "${msgName}"`,
                `Keep "${currentName}"`,
            );

            if (selection === `Use "${msgName}"`) {
                targetFramingId = msgFramingId;
                targetFramingName = msgName;
            } else if (!selection) {
                return;
            }
        }

        await this.postMessage({
            command: 'enterEditMode',
            mode,
            index,
            content,
            framingId: targetFramingId,
            framingName: targetFramingName,
        });
    }

    private async _handleRequestLoadMore(offset: number) {
        const PAGE_SIZE = 50;
        const paginated = this._chatService.getPaginatedMessages(this._chat.id, PAGE_SIZE, offset);
        await this.postMessage({
            command: 'moreMessagesLoaded',
            messages: paginated.messages,
            total: paginated.total,
        });
    }

    public async postMessage(message: ChatExtensionToWebviewCommand) {
        await this._panel.webview.postMessage(message);
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

    public async handleUserMessage(
        text: string,
        editOptions?: { mode: 'truncate' | 'fork'; index: number },
        framingIdOverride?: string,
    ) {
        const trimmedText = text.trim();

        if (editOptions && framingIdOverride !== undefined && framingIdOverride !== this._chat.activeFramingId) {
            await this._chatService.setActiveFraming(this._chat.id, framingIdOverride);
            this._chat.activeFramingId = framingIdOverride;
            const name = framingIdOverride ? this._framingService.getFraming(framingIdOverride)?.name : undefined;
            await this.postMessage({
                command: 'updateFraming',
                framingId: framingIdOverride,
                framingName: name,
            });
        }

        if (this._chat.activeFramingId) {
            const activeFraming = this._framingService.getFraming(this._chat.activeFramingId);
            if (!activeFraming) {
                const selection = await vscode.window.showWarningMessage(
                    `The framing previously used in this chat was deleted. What would you like to do?`,
                    { modal: true },
                    'Select New Framing',
                    'Use Model Defaults',
                );

                if (selection === 'Select New Framing') {
                    await this._handleRequestFraming();
                } else if (selection === 'Use Model Defaults') {
                    await this._handleRevertFraming();
                } else {
                    return;
                }
            }
        }

        if (editOptions) {
            if (editOptions.mode === 'truncate') {
                const answer = await vscode.window.showWarningMessage(
                    'Are you sure? Editing this message will remove all subsequent messages in this chat.',
                    { modal: true },
                    'Edit & Truncate',
                );

                if (answer !== 'Edit & Truncate') {
                    return;
                }

                const updatedChat = await this._chatService.deleteMessagesFrom(this._chat.id, editOptions.index);
                if (updatedChat) {
                    this._chat = updatedChat;
                }
            } else if (editOptions.mode === 'fork') {
                const newChat = await this._chatService.forkChatFrom(this._chat.id, editOptions.index);
                if (newChat) {
                    const newPanel = ChatPanel.createOrShow(
                        this._extensionUri,
                        newChat,
                        this._chatService,
                        this._provider,
                        this._modelService,
                        this._framingService,
                        this._orchestrator,
                        this._onStateChange,
                    );

                    if (this._onStateChange) {
                        this._onStateChange();
                    }

                    if (newPanel) {
                        await newPanel.handleUserMessage(trimmedText);
                    }

                    return;
                }
            }
        }

        await this._orchestrator.handleUserMessage(this._chat.id, trimmedText);
        this._chat = this._chatService.getChat(this._chat.id) || this._chat;
        this._updateTitle();

        // Refresh view to show added messages
        await this.postMessage({ command: 'setMessages', messages: this._chat.messages });

        await this._generateResponse();
    }

    private async _generateResponse() {
        try {
            await this.postMessage({ command: 'setLoading', loading: true });

            await this._orchestrator.generateResponse(
                this._chat.id,
                async (token) => {
                    await this.postMessage({ command: 'appendToken', content: token });
                },
                async () => {
                    await this.postMessage({ command: 'setLoading', loading: false });
                    const instName = this._modelService.getSettings(this._chat.modelName).name;
                    await this.postMessage({ command: 'startAssistantMessage', modelName: instName });
                    if (this._onStateChange) {
                        this._onStateChange();
                    }
                },
            );

            await this.postMessage({ command: 'setLoading', loading: false });
            this._chat = this._chatService.getChat(this._chat.id) || this._chat;
            await this.postMessage({ command: 'endAssistantMessage' });
        } catch (err: unknown) {
            const error = err as Error;
            await this.postMessage({ command: 'setLoading', loading: false });
            await this.postMessage({ command: 'endAssistantMessage' });
            Logger.error('Chat generation error', error);

            let errorMessage = error.message;
            const options = ['Retry'];
            const instance = this._modelService.getSettings(this._chat.modelName);

            if (errorMessage.includes('ECONNREFUSED')) {
                errorMessage = 'Could not connect to Ollama. Is it running?';
            } else if (errorMessage.toLowerCase().includes('not found')) {
                errorMessage = `Model '${instance.modelName}' not found.`;
                options.push('Pull Model');
            }

            await this.postMessage({ command: 'addErrorMessage', content: errorMessage });

            // Persist the error message
            await this._chatService.addMessage(this._chat.id, 'assistant', `Error: ${errorMessage}`, {
                isError: true,
            });
            this._chat = this._chatService.getChat(this._chat.id) || this._chat;

            const selection = await vscode.window.showErrorMessage(`Chat Error: ${errorMessage}`, ...options);

            if (selection === 'Retry') {
                await this._generateResponse();
            } else if (selection === 'Pull Model') {
                vscode.commands.executeCommand('ollamaView.pull', this._chat.modelName);
            }
        }
    }

    private async _handleRequestRegenerate(index: number) {
        if (index < this._chat.messages.length - 1) {
            const answer = await vscode.window.showWarningMessage(
                'Regenerating this message will remove all subsequent messages in this chat. Are you sure?',
                { modal: true },
                'Regenerate',
            );
            if (answer !== 'Regenerate') {
                return;
            }
        }

        const updatedChat = await this._chatService.deleteMessagesFrom(this._chat.id, index);
        if (updatedChat) {
            this._chat = updatedChat;
            this._updateTitle();
            await this.postMessage({ command: 'setMessages', messages: this._chat.messages });
            await this._generateResponse();
        }
    }

    private async _handleRequestForkAssistant(index: number) {
        const newChat = await this._chatService.forkChatFrom(this._chat.id, index);
        if (newChat) {
            const newPanel = ChatPanel.createOrShow(
                this._extensionUri,
                newChat,
                this._chatService,
                this._provider,
                this._modelService,
                this._framingService,
                this._orchestrator,
                this._onStateChange,
            );

            if (this._onStateChange) {
                this._onStateChange();
            }

            if (newPanel) {
                await newPanel._generateResponse();
            }
        }
    }

    private _updateTitle() {
        const instance = this._modelService.getSettings(this._chat.modelName);
        this._panel.title = `${this._chat.name} - ${instance.name}`;
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

            this.postMessage({
                command: 'initState',
                modelName: this._modelService.getSettings(this._chat.modelName).name,
                messages: paginated.messages,
                total: paginated.total,
                activeFramingId: this._chat.activeFramingId,
                activeFramingName,
            });
        }, 100);
    }

    private _getHtmlForWebview() {
        const htmlPath = path.join(this._extensionUri.fsPath, 'media', 'chat.html');
        let html = fs.readFileSync(htmlPath, 'utf8');

        const scriptUri = this._panel.webview.asWebviewUri(
            vscode.Uri.file(path.join(this._extensionUri.fsPath, 'dist', 'webview', 'chat.js')),
        );
        const styleUri = this._panel.webview.asWebviewUri(
            vscode.Uri.file(path.join(this._extensionUri.fsPath, 'media', 'chat.css')),
        );

        html = html.replace('{{scriptUri}}', scriptUri.toString());
        html = html.replace('{{styleUri}}', styleUri.toString());

        return html;
    }
}
