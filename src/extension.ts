import * as vscode from 'vscode';
import { OllamaProvider, OllamaModelItem } from './ollamaProvider';

// "Popular" models for autocomplete simulation
const POPULAR_MODELS = ['llama3', 'llama2', 'mistral', 'gemma', 'phi', 'codellama', 'orca-mini', 'vicuna', 'llava'];

export function activate(context: vscode.ExtensionContext) {
    const ollamaProvider = new OllamaProvider();

    // Register TreeDataProvider
    vscode.window.registerTreeDataProvider('ollama-models-view', ollamaProvider);

    // Commands
    context.subscriptions.push(vscode.commands.registerCommand('ollamaView.refresh', () => ollamaProvider.refresh()));

    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaView.start', async (node: OllamaModelItem) => {
            if (!node) {
                return;
            }
            try {
                await vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: `Starting ${node.model.name}...`,
                        cancellable: false,
                    },
                    async () => {
                        await ollamaProvider.getApi().startModel(node.model.name);
                    },
                );
                vscode.window.showInformationMessage(`Started ${node.model.name}`);
                ollamaProvider.refresh();
            } catch (err: any) {
                vscode.window.showErrorMessage(`Failed to start ${node.model.name}: ${err.message}`);
            }
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaView.stop', async (node: OllamaModelItem) => {
            if (!node) {
                return;
            }
            try {
                await vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: `Stopping ${node.model.name}...`,
                        cancellable: false,
                    },
                    async () => {
                        await ollamaProvider.getApi().stopModel(node.model.name);
                    },
                );
                vscode.window.showInformationMessage(`Stopped ${node.model.name}`);
                // Add a small delay to allow Ollama to update its internal state
                await new Promise(resolve => setTimeout(resolve, 1000));
                ollamaProvider.refresh();
            } catch (err: any) {
                vscode.window.showErrorMessage(`Failed to stop ${node.model.name}: ${err.message}`);
            }
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaView.delete', async (node: OllamaModelItem) => {
            if (!node) {
                return;
            }
            const confirm = await vscode.window.showWarningMessage(
                `Are you sure you want to delete ${node.model.name}?`,
                { modal: true },
                'Delete',
            );

            if (confirm === 'Delete') {
                try {
                    await vscode.window.withProgress(
                        {
                            location: vscode.ProgressLocation.Notification,
                            title: `Deleting ${node.model.name}...`,
                            cancellable: false,
                        },
                        async () => {
                            await ollamaProvider.getApi().deleteModel(node.model.name);
                        },
                    );
                    ollamaProvider.refresh();
                    vscode.window.showInformationMessage(`Deleted ${node.model.name}`);
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
