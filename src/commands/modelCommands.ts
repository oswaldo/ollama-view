import * as vscode from 'vscode';

import { ChatPanel } from '../chatPanel';
import { Logger } from '../logger';
import { OllamaInstanceItem, OllamaModelItem, OllamaProvider } from '../ollamaProvider';
import { ChatService } from '../services/chatService';
import { ModelService } from '../services/modelService';

export class ModelCommands {
    constructor(
        private modelService: ModelService,
        private chatService: ChatService,
        private ollamaProvider: OllamaProvider,
    ) {}

    async createInstance(node?: OllamaModelItem | OllamaInstanceItem, extensionUri?: vscode.Uri) {
        if (!node) {
            return;
        }

        const modelName = node instanceof OllamaModelItem ? node.model.name : node.instance.modelName;
        const instanceName = await vscode.window.showInputBox({
            prompt: `Enter a name for the new instance of ${modelName}`,
            placeHolder: 'e.g. Experiment 1',
        });

        if (instanceName) {
            const newInstance = await this.modelService.createInstance(modelName, instanceName);
            this.ollamaProvider.refresh();

            if (extensionUri) {
                // Trigger setup automatically for the new instance
                vscode.commands.executeCommand(
                    'ollamaView.setup',
                    node instanceof OllamaModelItem
                        ? node
                        : new OllamaInstanceItem(newInstance, false, false, false, true),
                );
            }
        }
    }

    async start(node?: OllamaInstanceItem | OllamaModelItem) {
        let modelName =
            node instanceof OllamaInstanceItem
                ? node.instance.ollamaModelName || node.instance.modelName
                : node?.model.name;

        if (!modelName) {
            const api = this.ollamaProvider.getApi();
            const [allModels, runningModels] = await Promise.all([api.listModels(), api.listRunning()]);
            const runningSet = new Set(runningModels.map((r) => r.model));
            const stoppedModels = allModels.filter((m) => !runningSet.has(m.name));

            if (stoppedModels.length === 0) {
                vscode.window.showInformationMessage('No stopped models found.');
                return;
            }

            const selected = await vscode.window.showQuickPick(
                stoppedModels.map((m) => m.name),
                { placeHolder: 'Select a model to start' },
            );
            if (!selected) {
                return;
            }
            modelName = selected;
        }

        const targetModelName = modelName;
        try {
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Starting ${targetModelName}...`,
                    cancellable: false,
                },
                async () => {
                    await this.ollamaProvider.startModel(targetModelName);
                },
            );
            vscode.window.showInformationMessage(`Started ${modelName}`);
            this.ollamaProvider.refresh();
        } catch (err: unknown) {
            const error = err as Error;
            Logger.error(`Failed to start ${modelName}`, error);
            vscode.window.showErrorMessage(`Failed to start ${modelName}: ${error.message}`);
        }
    }

    async stop(node?: OllamaInstanceItem | OllamaModelItem) {
        let modelName =
            node instanceof OllamaInstanceItem
                ? node.instance.ollamaModelName || node.instance.modelName
                : node?.model.name;

        if (!modelName) {
            const api = this.ollamaProvider.getApi();
            const runningModels = await api.listRunning();

            if (runningModels.length === 0) {
                vscode.window.showInformationMessage('No running models found.');
                return;
            }

            const selected = await vscode.window.showQuickPick(
                runningModels.map((m) => m.model),
                { placeHolder: 'Select a model to stop' },
            );
            if (!selected) {
                return;
            }
            modelName = selected;
        }

        const targetModelName = modelName;
        try {
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Stopping ${targetModelName}...`,
                    cancellable: false,
                },
                async () => {
                    await this.ollamaProvider.stopModel(targetModelName);
                },
            );
            vscode.window.showInformationMessage(`Stopped ${modelName}`);
            // Add a small delay to allow Ollama to update its internal state
            await new Promise((resolve) => setTimeout(resolve, 1000));
            this.ollamaProvider.refresh();
        } catch (err: unknown) {
            const error = err as Error;
            Logger.error(`Failed to stop ${modelName}`, error);
            vscode.window.showErrorMessage(`Failed to stop ${modelName}: ${error.message}`);
        }
    }

    async delete(node?: OllamaInstanceItem | OllamaModelItem) {
        if (node instanceof OllamaInstanceItem) {
            if (node.isRoot) {
                const modelName = node.instance.modelName;
                const confirm = await vscode.window.showWarningMessage(
                    `Delete model "${modelName}"? This will permanently delete the model, all its instances, and all associated chats. This action cannot be undone.`,
                    { modal: true },
                    'Delete',
                );

                if (confirm === 'Delete') {
                    await this.deleteModelFully(modelName);
                }
                return;
            }

            // Delete Instance (nested)
            if (node.instance.id === node.instance.modelName) {
                vscode.window.showWarningMessage(
                    'The primary instance cannot be deleted. Use "Delete Model" to remove the entire model.',
                );
                return;
            }
            const confirm = await vscode.window.showWarningMessage(
                `Delete instance "${node.instance.name}"? All associated chats will be permanently deleted. This action cannot be undone.`,
                { modal: true },
                'Delete',
            );
            if (confirm === 'Delete') {
                await this.deleteInstanceFully(node.instance.id);
            }
            return;
        }

        let modelName = node?.model.name;

        if (!modelName) {
            const api = this.ollamaProvider.getApi();
            const allModels = await api.listModels();

            if (allModels.length === 0) {
                vscode.window.showInformationMessage('No models found.');
                return;
            }

            const selected = await vscode.window.showQuickPick(
                allModels.map((m) => m.name),
                { placeHolder: 'Select a model to delete' },
            );
            if (!selected) {
                return;
            }
            modelName = selected;
        }

        const targetModelName = modelName;
        const confirm = await vscode.window.showWarningMessage(
            `Delete model "${targetModelName}"? This will permanently delete the model, all its instances, and all associated chats. This action cannot be undone.`,
            { modal: true },
            'Delete',
        );

        if (confirm === 'Delete') {
            await this.deleteModelFully(targetModelName);
        }
    }

    private async deleteInstanceFully(instanceId: string) {
        const chats = this.chatService.getChatsForModel(instanceId);
        for (const chat of chats) {
            const panel = ChatPanel.panels.get(chat.id);
            if (panel) {
                panel.dispose();
            }
        }

        await this.modelService.deleteSettings(instanceId);
        this.ollamaProvider.refresh();
    }

    private async deleteModelFully(modelName: string) {
        try {
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Deleting ${modelName}...`,
                    cancellable: false,
                },
                async () => {
                    const instances = this.modelService.getInstancesForModel(modelName);
                    for (const inst of instances) {
                        const chats = this.chatService.getChatsForModel(inst.id);
                        for (const chat of chats) {
                            const panel = ChatPanel.panels.get(chat.id);
                            if (panel) {
                                panel.dispose();
                            }
                        }
                        await this.modelService.deleteSettings(inst.id);
                    }

                    await this.ollamaProvider.getApi().deleteModel(modelName);
                },
            );
            this.ollamaProvider.refresh();
            vscode.window.showInformationMessage(`Deleted ${modelName}`);
        } catch (err: unknown) {
            const error = err as Error;
            Logger.error(`Failed to delete ${modelName}`, error);
            vscode.window.showErrorMessage(`Failed to delete: ${error.message}`);
        }
    }
}
