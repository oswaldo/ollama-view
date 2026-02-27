import * as vscode from 'vscode';
import { OllamaProvider, OllamaModelItem, OllamaInstanceItem, OllamaChatItem } from './ollamaProvider';
import { ChatService } from './chatService';
import { ChatPanel } from './chatPanel';
import { SetupPanel } from './panels/setupPanel';
import { ModelSettingsService } from './modelSettingsService';
import { Logger } from './logger';
import { FramingService } from './services/framingService';
import { FramingProvider } from './providers/framingProvider';
import { registerFramingCommands } from './commands/framingCommands';

// "Popular" models as of Feb 2026
const POPULAR_MODELS = ['llama3.2', 'mistral', 'deepseek-r1', 'qwen2.5', 'gemma2', 'phi3.5', 'codellama', 'dolphin-llama3', 'llava', 'starcoder2'];

interface ModelAction extends vscode.QuickPickItem {
    id: string;
    command: string;
}

const getModelActions = (): ModelAction[] => [
    { label: '$(add) Create New Instance', id: 'createInstance', command: 'ollamaView.createInstance', description: 'Create a customized instance of this model' },
    { label: '$(settings-gear) Setup', id: 'setup', command: 'ollamaView.setup', description: 'Configure model settings' },
    { label: '$(trash) Delete', id: 'delete', command: 'ollamaView.delete', description: 'Permanently remove model' }
];

export function activate(context: vscode.ExtensionContext) {
    Logger.init();
    const chatService = new ChatService(context);
    const modelSettingsService = new ModelSettingsService(context);
    const ollamaProvider = new OllamaProvider(chatService, modelSettingsService);
    const framingService = new FramingService(context);
    const framingProvider = new FramingProvider(framingService);

    // Register TreeDataProvider
    vscode.window.registerTreeDataProvider('ollama-models-view', ollamaProvider);
    vscode.window.registerTreeDataProvider('ollama-framing-view', framingProvider);

    // Commands
    registerFramingCommands(context, framingService);

    context.subscriptions.push(vscode.commands.registerCommand('ollamaView.refresh', () => {
        ollamaProvider.refresh();
        framingProvider.refresh();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ollamaView.createChat', async (node?: OllamaInstanceItem) => {
        if (!node) { return; }

        // 1. Create Chat (immediate)
        const chat = await chatService.createChat(node.instance.id);

        // 2. Open Chat Panel (immediate)
        const panel = ChatPanel.createOrShow(context.extensionUri, chat, chatService, ollamaProvider, modelSettingsService, framingService, () => ollamaProvider.refresh());

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
                        await ollamaProvider.startModel(node.instance.modelName);
                        // Refresh to update tree (show running status)
                        ollamaProvider.refresh();
                    } catch (err: any) {
                        Logger.error(`Failed to start model ${node.instance.modelName}`, err);
                        panel.postMessage({ command: 'addErrorMessage', content: `Failed to start model: ${err.message}` });
                    } finally {
                        ollamaProvider.setStarting(node.instance.modelName, false);
                        panel.postMessage({ command: 'setLoading', loading: false });
                    }
                }
            );
        } else {
             ollamaProvider.refresh();
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ollamaView.createInstance', async (node: OllamaModelItem) => {
        if (!node) return;
        
        const instanceName = await vscode.window.showInputBox({
            prompt: `Enter a name for the new instance of ${node.model.name}`,
            placeHolder: 'e.g. Experiment 1'
        });

        if (instanceName) {
            const newInstance = await modelSettingsService.createInstance(node.model.name, instanceName);
            ollamaProvider.refresh();
            SetupPanel.createOrShow(context.extensionUri, node.model, modelSettingsService, framingService, newInstance.id);
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ollamaView.startChat', async () => {
        // 1. Select Model
        const api = ollamaProvider.getApi();
        const allModels = await api.listModels();
        if (allModels.length === 0) {
            vscode.window.showInformationMessage('No models found. Please pull a model first.');
            return;
        }

        const modelName = await vscode.window.showQuickPick(allModels.map(m => m.name), {
            placeHolder: 'Select a model to chat with'
        });
        if (!modelName) { return; }

        // 1.5 Select Instance
        const instances = modelSettingsService.getInstancesForModel(modelName);
        let instanceId = modelName; // Default

        if (instances.length > 1) {
            const selectedInst = await vscode.window.showQuickPick(instances.map(i => ({ label: i.name, id: i.id })), {
                placeHolder: `Select an instance of ${modelName}`
            });
            if (!selectedInst) return;
            instanceId = selectedInst.id;
        }

        // 2. Enter Prompt
        const prompt = await vscode.window.showInputBox({
            placeHolder: 'Enter your message',
            prompt: 'What would you like to ask?'
        });
        if (!prompt) { return; }

        // 3. Create Chat (immediate)
        const chat = await chatService.createChat(instanceId);
        ollamaProvider.refresh();

        // 4. Open Panel (immediate)
        const panel = ChatPanel.createOrShow(context.extensionUri, chat, chatService, ollamaProvider, modelSettingsService, framingService, () => ollamaProvider.refresh());

        // 5. Ensure Model is Running (async)
        const runningModels = await api.listRunning();
        const isRunning = runningModels.some(r => r.model === modelName);

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
                        await ollamaProvider.startModel(modelName);
                        ollamaProvider.refresh();
                        // Now that it's started, send the initial message
                        await panel.handleUserMessage(prompt);
                    } catch (err: any) {
                        Logger.error(`Failed to start model ${modelName}`, err);
                        panel.postMessage({ command: 'addErrorMessage', content: `Failed to start model: ${err.message}` });
                    } finally {
                        panel.postMessage({ command: 'setLoading', loading: false });
                    }
                }
            );
        } else {
            // Model already running, just send message
            await panel.handleUserMessage(prompt);
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ollamaView.deleteChat', async (node: OllamaChatItem) => {
        if (!node) { return; }
        const confirm = await vscode.window.showWarningMessage(
            `Delete chat "${node.chat.name || 'New Chat'}"? This action cannot be undone.`,
            { modal: true },
            'Delete'
        );
        if (confirm === 'Delete') {
            // Close panel if open
            const panel = ChatPanel.panels.get(node.chat.id);
            if (panel) {
                panel.dispose();
            }

            await chatService.deleteChat(node.chat.id);
            ollamaProvider.refresh();
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ollamaView.openChat', (node: OllamaChatItem) => {
        if (!node) { return; }
        ChatPanel.createOrShow(context.extensionUri, node.chat, chatService, ollamaProvider, modelSettingsService, framingService, () => ollamaProvider.refresh());
    }));

    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaView.start', async (node?: OllamaInstanceItem | OllamaModelItem) => {
            let modelName = node instanceof OllamaInstanceItem ? node.instance.modelName : node?.model.name;
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
                        await ollamaProvider.startModel(modelName!);
                    },
                );
                vscode.window.showInformationMessage(`Started ${modelName}`);
                ollamaProvider.refresh();
            } catch (err: any) {
                Logger.error(`Failed to start ${modelName}`, err);
                vscode.window.showErrorMessage(`Failed to start ${modelName}: ${err.message}`);
            }
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaView.stop', async (node?: OllamaInstanceItem | OllamaModelItem) => {
            let modelName = node instanceof OllamaInstanceItem ? node.instance.modelName : node?.model.name;

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
                        await ollamaProvider.stopModel(modelName!);
                    },
                );
                vscode.window.showInformationMessage(`Stopped ${modelName}`);
                // Add a small delay to allow Ollama to update its internal state
                await new Promise(resolve => setTimeout(resolve, 1000));
                ollamaProvider.refresh();
            } catch (err: any) {
                Logger.error(`Failed to stop ${modelName}`, err);
                vscode.window.showErrorMessage(`Failed to stop ${modelName}: ${err.message}`);
            }
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaView.setup', async (node?: OllamaInstanceItem | OllamaModelItem) => {
            if (!node) { return; }
            if (node instanceof OllamaInstanceItem) {
                // Find the model object for the instance
                const api = ollamaProvider.getApi();
                const models = await api.listModels();
                const model = models.find(m => m.name === node.instance.modelName);
                if (model) {
                    SetupPanel.createOrShow(context.extensionUri, model, modelSettingsService, framingService, node.instance.id);
                }
            } else {
                SetupPanel.createOrShow(context.extensionUri, node.model, modelSettingsService, framingService);
            }
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaView.showMoreActions', async (node?: OllamaInstanceItem | OllamaModelItem) => {
            if (!node) { return; }
            const name = node instanceof OllamaInstanceItem ? node.instance.name : node.model.name;
            const actions = getModelActions();
            const result = await vscode.window.showQuickPick(actions, {
                placeHolder: `Actions for ${name}`
            });

            if (result) {
                vscode.commands.executeCommand(result.command, node);
            }
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaView.delete', async (node?: OllamaInstanceItem | OllamaModelItem) => {
            if (node instanceof OllamaInstanceItem) {
                // Delete Instance
                if (node.instance.id === node.instance.modelName) {
                    vscode.window.showWarningMessage('The primary instance cannot be deleted. Use "Delete Model" to remove the entire model.');
                    return;
                }
                const confirm = await vscode.window.showWarningMessage(`Delete instance "${node.instance.name}"?`, { modal: true }, 'Delete');
                if (confirm === 'Delete') {
                    await modelSettingsService.deleteSettings(node.instance.id);
                    ollamaProvider.refresh();
                }
                return;
            }

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
                `Are you sure you want to delete model ${modelName} and all its instances?`,
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
                            // Cleanup all instances
                            const instances = modelSettingsService.getInstancesForModel(modelName!);
                            for (const inst of instances) {
                                await modelSettingsService.deleteSettings(inst.id);
                            }
                        },
                    );
                    ollamaProvider.refresh();
                    vscode.window.showInformationMessage(`Deleted ${modelName}`);
                } catch (err: any) {
                    Logger.error(`Failed to delete ${modelName}`, err);
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
                Logger.error(`Failed to pull ${name}`, err);
                vscode.window.showErrorMessage(`Failed to pull ${name}: ${err.message}`);
            }
        },
    );
}

export function deactivate() { }
