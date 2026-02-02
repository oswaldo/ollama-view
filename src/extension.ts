import * as vscode from 'vscode';
import { OllamaProvider, OllamaModelItem, OllamaChatItem } from './ollamaProvider';
import { ChatService } from './chatService';
import { ChatPanel } from './chatPanel';

// "Popular" models for autocomplete simulation
const POPULAR_MODELS = ['llama3', 'llama2', 'mistral', 'gemma', 'phi', 'codellama', 'orca-mini', 'vicuna', 'llava'];

export function activate(context: vscode.ExtensionContext) {
    const chatService = new ChatService(context);
    const ollamaProvider = new OllamaProvider(chatService);

    // Register TreeDataProvider
    vscode.window.registerTreeDataProvider('ollama-models-view', ollamaProvider);

    // Commands
    context.subscriptions.push(vscode.commands.registerCommand('ollamaView.refresh', () => ollamaProvider.refresh()));

    context.subscriptions.push(vscode.commands.registerCommand('ollamaView.createChat', async (node?: OllamaModelItem) => {
        if (!node) { return; }

        // 1. Check if model is running, if not start it with progress
        if (!node.isRunning) {
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Starting ${node.model.name}...`,
                    cancellable: false,
                },
                async () => {
                    await ollamaProvider.getApi().startModel(node.model.name);
                }
            );
            // Wait a small bit for Ollama to register state
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // 2. Create Chat
        const chat = await chatService.createChat(node.model.name);

        // 3. Refresh to update tree (show running status and new chat)
        ollamaProvider.refresh();

        // 4. Open Chat Panel
        ChatPanel.createOrShow(context.extensionUri, chat, chatService, ollamaProvider.getApi(), () => ollamaProvider.refresh());
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ollamaView.deleteChat', async (node: OllamaChatItem) => {
        if (!node) { return; }
        const confirm = await vscode.window.showWarningMessage(
            `Delete chat "${node.chat.name || 'New Chat'}"?`,
            { modal: true },
            'Delete'
        );
        if (confirm === 'Delete') {
            await chatService.deleteChat(node.chat.id);
            ollamaProvider.refresh();
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ollamaView.openChat', (node: OllamaChatItem) => {
        if (!node) { return; }
        ChatPanel.createOrShow(context.extensionUri, node.chat, chatService, ollamaProvider.getApi(), () => ollamaProvider.refresh());
    }));

    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaView.start', async (node?: OllamaModelItem) => {
            let modelName = node?.model.name;
            if (!modelName) {
                const api = ollamaProvider.getApi();
                const [allModels, runningModels] = await Promise.all([api.listModels(), api.listRunning()]);
                const runningSet = new Set(runningModels.map((r) => r.model));
                const stoppedModels = allModels.filter((m) => !runningSet.has(m.name));

                if (stoppedModels.length === 0) {
                    vscode.window.showInformationMessage('No stopped models found.');
                    return;
                }

                const selected = await vscode.window.showQuickPick(stoppedModels.map(m => m.name), {
                    placeHolder: 'Select a model to start'
                });
                if (!selected) { return; }
                modelName = selected;
            }

            try {
                await vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: `Starting ${modelName}...`,
                        cancellable: false,
                    },
                    async () => {
                        await ollamaProvider.getApi().startModel(modelName!);
                    },
                );
                vscode.window.showInformationMessage(`Started ${modelName}`);
                ollamaProvider.refresh();
            } catch (err: any) {
                vscode.window.showErrorMessage(`Failed to start ${modelName}: ${err.message}`);
            }
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaView.stop', async (node?: OllamaModelItem) => {
            let modelName = node?.model.name;

            if (!modelName) {
                const api = ollamaProvider.getApi();
                const runningModels = await api.listRunning();

                if (runningModels.length === 0) {
                    vscode.window.showInformationMessage('No running models found.');
                    return;
                }

                const selected = await vscode.window.showQuickPick(runningModels.map(m => m.model), {
                    placeHolder: 'Select a model to stop'
                });
                if (!selected) { return; }
                modelName = selected;
            }

            try {
                await vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: `Stopping ${modelName}...`,
                        cancellable: false,
                    },
                    async () => {
                        await ollamaProvider.getApi().stopModel(modelName!);
                    },
                );
                vscode.window.showInformationMessage(`Stopped ${modelName}`);
                // Add a small delay to allow Ollama to update its internal state
                await new Promise(resolve => setTimeout(resolve, 1000));
                ollamaProvider.refresh();
            } catch (err: any) {
                vscode.window.showErrorMessage(`Failed to stop ${modelName}: ${err.message}`);
            }
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaView.delete', async (node?: OllamaModelItem) => {
            let modelName = node?.model.name;

            if (!modelName) {
                const api = ollamaProvider.getApi();
                const allModels = await api.listModels();

                if (allModels.length === 0) {
                    vscode.window.showInformationMessage('No models found.');
                    return;
                }

                const selected = await vscode.window.showQuickPick(allModels.map(m => m.name), {
                    placeHolder: 'Select a model to delete'
                });
                if (!selected) { return; }
                modelName = selected;
            }

            const confirm = await vscode.window.showWarningMessage(
                `Are you sure you want to delete ${modelName}?`,
                { modal: true },
                'Delete',
            );

            if (confirm === 'Delete') {
                try {
                    await vscode.window.withProgress(
                        {
                            location: vscode.ProgressLocation.Notification,
                            title: `Deleting ${modelName}...`,
                            cancellable: false,
                        },
                        async () => {
                            await ollamaProvider.getApi().deleteModel(modelName!);
                        },
                    );
                    ollamaProvider.refresh();
                    vscode.window.showInformationMessage(`Deleted ${modelName}`);
                } catch (err: any) {
                    vscode.window.showErrorMessage(`Failed to delete: ${err.message}`);
                }
            }
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaView.pull', async () => {
            // QuickPick with validation/custom input
            const quickPick = vscode.window.createQuickPick();
            quickPick.items = POPULAR_MODELS.map((label) => ({ label }));
            quickPick.placeholder = 'Enter model name (e.g. llama3)';
            quickPick.canSelectMany = false;

            quickPick.onDidChangeValue((value) => {
                // simple simulated autocomplete or just keeping popular ones?
                // For now, if value is not in items, add it dynamically?
                // Actually VS Code QuickPick allows any input if we handle accept.
            });

            quickPick.onDidAccept(async () => {
                const selection = quickPick.selectedItems[0]?.label || quickPick.value;
                quickPick.hide();
                if (selection) {
                    await pullModel(selection, ollamaProvider);
                }
            });

            quickPick.show();
        }),
    );
}

async function pullModel(name: string, provider: OllamaProvider) {
    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: `Pulling ${name}`,
            cancellable: true,
        },
        async (progress, token) => {
            try {
                await provider.getApi().pullModel(name, (status, completed, total) => {
                    const msg = total ? `${status} (${Math.round(((completed || 0) / total) * 100)}%)` : status;
                    progress.report({ message: msg });
                });
                vscode.window.showInformationMessage(`Successfully pulled ${name}`);
                provider.refresh();
            } catch (err: any) {
                vscode.window.showErrorMessage(`Failed to pull ${name}: ${err.message}`);
            }
        },
    );
}

export function deactivate() { }
