import * as path from 'path';
import * as vscode from 'vscode';

import { ChatPanel } from '../chatPanel';
import { Logger } from '../logger';
import { OllamaModel } from '../ollamaApi';
import { OllamaChatItem, OllamaInstanceItem, OllamaProvider } from '../ollamaProvider';
import { ChatOrchestrator } from '../services/chatOrchestrator';
import { ChatService } from '../services/chatService';
import { ExportService } from '../services/exportService';
import { FramingService } from '../services/framingService';
import { ModelService } from '../services/modelService';

export class ChatCommands {
    constructor(
        private chatService: ChatService,
        private modelService: ModelService,
        private framingService: FramingService,
        private chatOrchestrator: ChatOrchestrator,
        private ollamaProvider: OllamaProvider,
        private exportService: ExportService,
        private globalState: vscode.Memento,
        private extensionUri: vscode.Uri,
    ) {}

    async exportChat(node: OllamaChatItem) {
        if (!node) {
            return;
        }

        const dateStr = new Date(node.chat.createdAt).toISOString().replace(/[:.]/g, '-');
        const lastExportExt = this.globalState.get<string>('lastExportExt') || '.md';
        const lastExportPath = this.globalState.get<string>('lastExportPath');
        
        const defaultFileName = `${node.chat.modelName}-${dateStr}-chat${lastExportExt}`;
        let defaultUri = vscode.Uri.file(defaultFileName);
        
        if (lastExportPath) {
            defaultUri = vscode.Uri.file(path.join(lastExportPath, defaultFileName));
        }

        const filters: { [name: string]: string[] } = {};
        if (lastExportExt === '.json') {
            filters['JSON'] = ['json'];
            filters['Markdown'] = ['md'];
        } else {
            filters['Markdown'] = ['md'];
            filters['JSON'] = ['json'];
        }

        const uri = await vscode.window.showSaveDialog({
            defaultUri: defaultUri,
            filters: filters
        });

        if (!uri) {
            return; // User cancelled
        }

        // If the user didn't type an extension and VS Code didn't append one, add the default
        let finalUri = uri;
        const ext = path.extname(uri.fsPath);
        if (!ext) {
            finalUri = vscode.Uri.file(uri.fsPath + lastExportExt);
        }

        let content = '';
        if (finalUri.fsPath.endsWith('.json')) {
            content = this.exportService.toJSON(node.chat);
        } else {
            content = this.exportService.toMarkdown(node.chat);
        }

        try {
            await vscode.workspace.fs.writeFile(finalUri, Buffer.from(content, 'utf8'));
            
            // Save state for next time
            await this.globalState.update('lastExportExt', path.extname(finalUri.fsPath));
            await this.globalState.update('lastExportPath', path.dirname(finalUri.fsPath));

            const openAction = 'Open File';
            const message = `Chat exported successfully to ${finalUri.fsPath}`;
            vscode.window.showInformationMessage(message, openAction).then(selection => {
                if (selection === openAction) {
                    vscode.commands.executeCommand('vscode.open', finalUri);
                }
            });
        } catch (err: unknown) {
            const error = err as Error;
            Logger.error(`Failed to export chat: ${error.message}`, error);
            vscode.window.showErrorMessage(`Failed to export chat: ${error.message}`);
        }
    }

    async createChat(node?: OllamaInstanceItem) {
        if (!node) {
            return;
        }

        // 1. Create Chat (immediate)
        const chat = await this.chatService.createChat(node.instance.id);

        // 2. Open Chat Panel (immediate)
        const panel = ChatPanel.createOrShow(
            this.extensionUri,
            chat,
            this.chatService,
            this.ollamaProvider,
            this.modelService,
            this.framingService,
            this.chatOrchestrator,
            () => this.ollamaProvider.refresh(),
        );

        // 3. Start model if not running (async)
        if (!node.isRunning) {
            // Signal loading in UI
            panel.postMessage({ command: 'setLoading', loading: true });

            vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Starting ${node.instance.modelName}...`,
                    cancellable: false,
                },
                async () => {
                    try {
                        await this.ollamaProvider.startModel(node.instance.modelName);
                        this.ollamaProvider.refresh();
                    } catch (err: unknown) {
                        const error = err as Error;
                        Logger.error(`Failed to start model ${node.instance.modelName}`, error);
                        panel.postMessage({
                            command: 'addErrorMessage',
                            content: `Failed to start model: ${error.message}`,
                        });
                    } finally {
                        this.ollamaProvider.setStarting(node.instance.modelName, false);
                        panel.postMessage({ command: 'setLoading', loading: false });
                    }
                },
            );
        } else {
            this.ollamaProvider.refresh();
        }
    }

    private static readonly POPULAR_MODELS = [
        'llama3.2',
        'mistral',
        'deepseek-r1',
        'qwen2.5',
        'gemma2',
        'phi3.5',
    ];

    async startChat() {
        const api = this.ollamaProvider.getApi();
        let allModels: OllamaModel[] = [];
        try {
            allModels = await api.listModels();
        } catch (e) {
            Logger.error('Failed to list models during startChat', e);
        }

        let modelName: string | undefined;

        if (allModels.length === 0) {
            const choice = await vscode.window.showInformationMessage(
                'No models found. Would you like to download one now?',
                'Yes, pick a model',
                'Configure Connection'
            );

            if (choice === 'Configure Connection') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'ollama-view.apiUrl');
                return;
            }

            if (choice !== 'Yes, pick a model') {
                return;
            }

            modelName = await vscode.window.showQuickPick(
                ChatCommands.POPULAR_MODELS,
                { placeHolder: 'Select a model to download and chat with' }
            );

            if (!modelName) {
                return;
            }

            // Pull the model first
            await this.pullModelInternal(modelName);
            // After pull, we need to refresh models
            allModels = await api.listModels();
        } else {
            modelName = await vscode.window.showQuickPick(
                allModels.map((m) => m.name),
                { placeHolder: 'Select a model to chat with' },
            );
        }

        if (!modelName) {
            return;
        }

        const instances = this.modelService.getInstancesForModel(modelName);
        let instanceId = modelName;

        if (instances.length > 1) {
            const selectedInst = await vscode.window.showQuickPick(
                instances.map((i) => ({ label: i.name, id: i.id })),
                { placeHolder: `Select an instance of ${modelName}` },
            );
            if (!selectedInst) {
                return;
            }
            instanceId = selectedInst.id;
        }

        const prompt = await vscode.window.showInputBox({
            placeHolder: 'Enter your message',
            prompt: 'What would you like to ask?',
        });
        if (!prompt) {
            return;
        }

        const chat = await this.chatService.createChat(instanceId);
        this.ollamaProvider.refresh();

        const panel = ChatPanel.createOrShow(
            this.extensionUri,
            chat,
            this.chatService,
            this.ollamaProvider,
            this.modelService,
            this.framingService,
            this.chatOrchestrator,
            () => this.ollamaProvider.refresh(),
        );

        const runningModels = await api.listRunning();
        const isRunning = runningModels.some((r) => r.model === modelName);

        if (!isRunning) {
            panel.postMessage({ command: 'setLoading', loading: true });

            vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Starting ${modelName}...`,
                    cancellable: false,
                },
                async () => {
                    try {
                        await this.ollamaProvider.startModel(modelName as string);
                        this.ollamaProvider.refresh();
                        await panel.handleUserMessage(prompt as string);
                    } catch (err: unknown) {
                        const error = err as Error;
                        Logger.error(`Failed to start model ${modelName}`, error);
                        panel.postMessage({
                            command: 'addErrorMessage',
                            content: `Failed to start model: ${error.message}`,
                        });
                    } finally {
                        panel.postMessage({ command: 'setLoading', loading: false });
                    }
                },
            );
        } else {
            await panel.handleUserMessage(prompt);
        }
    }

    private async pullModelInternal(name: string) {
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Downloading ${name}...`,
                cancellable: true,
            },
            async (progress) => {
                try {
                    await this.ollamaProvider.getApi().pullModel(name, (status, completed, total) => {
                        const msg = total ? `${status} (${Math.round(((completed || 0) / total) * 100)}%)` : status;
                        progress.report({ message: msg });
                    });
                    this.ollamaProvider.refresh();
                } catch (err: unknown) {
                    const error = err as Error;
                    Logger.error(`Failed to pull ${name}`, error);
                    vscode.window.showErrorMessage(`Failed to pull ${name}: ${error.message}`);
                    throw error;
                }
            },
        );
    }

    async deleteChat(node: OllamaChatItem) {
        if (!node) {
            return;
        }
        const confirm = await vscode.window.showWarningMessage(
            `Delete chat "${node.chat.name || 'New Chat'}"? This action cannot be undone.`,
            { modal: true },
            'Delete',
        );
        if (confirm === 'Delete') {
            const panel = ChatPanel.panels.get(node.chat.id);
            if (panel) {
                panel.dispose();
            }

            await this.chatService.deleteChat(node.chat.id);
            this.ollamaProvider.refresh();
        }
    }

    async importChat(uri?: vscode.Uri) {
        let fileUri = uri;

        if (!fileUri) {
            const result = await vscode.window.showOpenDialog({
                canSelectMany: false,
                openLabel: 'Import Chat',
                filters: {
                    'JSON': ['json']
                }
            });

            if (!result || result.length === 0) {
                return;
            }

            fileUri = result[0];
        }

        try {
            const uint8Array = await vscode.workspace.fs.readFile(fileUri);
            const content = Buffer.from(uint8Array).toString('utf8');
            const importedChat = await this.chatOrchestrator.handleChatImport(content);

            if (importedChat) {
                this.ollamaProvider.refresh();
                ChatPanel.createOrShow(
                    this.extensionUri,
                    importedChat,
                    this.chatService,
                    this.ollamaProvider,
                    this.modelService,
                    this.framingService,
                    this.chatOrchestrator,
                    () => this.ollamaProvider.refresh(),
                );
            }
        } catch (err: unknown) {
            const error = err as Error;
            Logger.error(`Failed to read file ${fileUri.fsPath}: ${error.message}`, error);
            vscode.window.showErrorMessage(`Failed to read file: ${error.message}`);
        }
    }

    openChat(node: OllamaChatItem) {
        if (!node) {
            return;
        }
        ChatPanel.createOrShow(
            this.extensionUri,
            node.chat,
            this.chatService,
            this.ollamaProvider,
            this.modelService,
            this.framingService,
            this.chatOrchestrator,
            () => this.ollamaProvider.refresh(),
        );
    }
}
