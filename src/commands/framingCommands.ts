import * as vscode from 'vscode';

import { FramingSource } from '../models/modelFraming';
import { FramingEditorPanel } from '../panels/framingEditorPanel';
import { FramingItem } from '../providers/framingProvider';
import { FramingService } from '../services/framingService';

interface FramingAction extends vscode.QuickPickItem {
    id: string;
    command: string;
}

/**
 * Registers all framing-related commands.
 */
export function registerFramingCommands(context: vscode.ExtensionContext, framingService: FramingService) {
    // Open editor for a framing
    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaView.editFraming', (item: FramingItem) => {
            if (!item || !item.framing) {
                return;
            }
            FramingEditorPanel.createOrShow(context.extensionUri, item.framing, framingService);
        }),
    );

    // Duplicate an existing framing
    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaView.duplicateFraming', async (item: FramingItem) => {
            if (!item || !item.framing) {
                return;
            }
            const copy = await framingService.duplicateFraming(item.framing.id);
            if (copy) {
                vscode.window.showInformationMessage(`Model Framing duplicated as '${copy.name}'.`);
                vscode.commands.executeCommand('ollamaView.refresh');
                FramingEditorPanel.createOrShow(context.extensionUri, copy, framingService);
            }
        }),
    );

    // Show more actions for a framing
    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaView.showMoreFramingActions', async (item: FramingItem) => {
            if (!item || !item.framing) {
                return;
            }

            const actions: FramingAction[] = [
                {
                    label: '$(edit) Edit',
                    id: 'edit',
                    command: 'ollamaView.editFraming',
                    description: 'Open framing editor',
                },
                {
                    label: '$(copy) Duplicate',
                    id: 'duplicate',
                    command: 'ollamaView.duplicateFraming',
                    description: 'Create a copy of this framing',
                },
            ];

            if (item.framing.source === FramingSource.User) {
                actions.push({
                    label: '$(trash) Delete',
                    id: 'delete',
                    command: 'ollamaView.deleteFraming',
                    description: 'Permanently remove framing',
                });
            }

            const result = await vscode.window.showQuickPick(actions, {
                placeHolder: `Actions for ${item.framing.name}`,
            });

            if (result) {
                vscode.commands.executeCommand(result.command, item);
            }
        }),
    );

    // Create a new blank framing
    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaView.createFraming', async () => {
            const framing = await framingService.createFraming({
                name: 'New Model Framing',
                systemMessage: 'You are a helpful assistant.',
            });
            vscode.commands.executeCommand('ollamaView.refresh');
            FramingEditorPanel.createOrShow(context.extensionUri, framing, framingService);
        }),
    );

    // Delete a framing
    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaView.deleteFraming', async (item: FramingItem) => {
            if (!item || !item.framing) {
                return;
            }

            const framing = item.framing;
            const confirm = await vscode.window.showWarningMessage(
                `Are you sure you want to delete model framing "${framing.name}"? This action cannot be undone.`,
                { modal: true },
                'Delete',
            );

            if (confirm === 'Delete') {
                const success = await framingService.deleteFraming(framing.id);
                if (success) {
                    vscode.window.showInformationMessage(`Model Framing "${framing.name}" deleted.`);
                    vscode.commands.executeCommand('ollamaView.refresh');

                    // Close panel if open
                    const panel = FramingEditorPanel.panels.get(framing.id);
                    if (panel) {
                        panel.dispose();
                    }
                }
            }
        }),
    );
}
