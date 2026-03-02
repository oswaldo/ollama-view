import * as vscode from 'vscode';

import { Logger } from '../logger';
import { OllamaProvider } from '../ollamaProvider';
import { FramingProvider } from '../providers/framingProvider';

export class ProviderCommands {
    constructor(
        private ollamaProvider: OllamaProvider,
        private framingProvider: FramingProvider,
    ) {}

    refresh() {
        this.ollamaProvider.refresh();
        this.framingProvider.refresh();
    }

    async pull() {
        const POPULAR_MODELS = [
            'llama3.2',
            'mistral',
            'deepseek-r1',
            'qwen2.5',
            'gemma2',
            'phi3.5',
            'codellama',
            'dolphin-llama3',
            'llava',
            'starcoder2',
        ];

        const quickPick = vscode.window.createQuickPick();
        quickPick.items = POPULAR_MODELS.map((label) => ({ label }));
        quickPick.placeholder = 'Enter model name (e.g. llama3)';
        quickPick.canSelectMany = false;

        quickPick.onDidAccept(async () => {
            const selection = quickPick.selectedItems[0]?.label || quickPick.value;
            quickPick.hide();
            if (selection) {
                await this.pullModelInternal(selection);
            }
        });

        quickPick.show();
    }

    private async pullModelInternal(name: string) {
        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Pulling ${name}`,
                cancellable: true,
            },
            async (progress) => {
                try {
                    await this.ollamaProvider.getApi().pullModel(name, (status, completed, total) => {
                        const msg = total ? `${status} (${Math.round(((completed || 0) / total) * 100)}%)` : status;
                        progress.report({ message: msg });
                    });
                    vscode.window.showInformationMessage(`Successfully pulled ${name}`);
                    this.ollamaProvider.refresh();
                } catch (err: unknown) {
                    const error = err as Error;
                    Logger.error(`Failed to pull ${name}`, error);
                    vscode.window.showErrorMessage(`Failed to pull ${name}: ${error.message}`);
                }
            },
        );
    }
}
