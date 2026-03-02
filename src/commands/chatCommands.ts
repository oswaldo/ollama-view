import * as vscode from 'vscode';

import { ChatPanel } from '../chatPanel';
import { Logger } from '../logger';
import { OllamaChatItem, OllamaInstanceItem, OllamaProvider } from '../ollamaProvider';
import { ChatOrchestrator } from '../services/chatOrchestrator';
import { ChatService } from '../services/chatService';
import { FramingService } from '../services/framingService';
import { ModelService } from '../services/modelService';

export class ChatCommands {
    constructor(
        private chatService: ChatService,
        private modelService: ModelService,
        private framingService: FramingService,
        private chatOrchestrator: ChatOrchestrator,
        private ollamaProvider: OllamaProvider,
        private extensionUri: vscode.Uri,
    ) {}

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

    async startChat() {
        const api = this.ollamaProvider.getApi();
        const allModels = await api.listModels();
        if (allModels.length === 0) {
            vscode.window.showInformationMessage('No models found. Please pull a model first.');
            return;
        }

        const modelName = await vscode.window.showQuickPick(
            allModels.map((m) => m.name),
            { placeHolder: 'Select a model to chat with' },
        );
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
                        await this.ollamaProvider.startModel(modelName);
                        this.ollamaProvider.refresh();
                        await panel.handleUserMessage(prompt);
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
