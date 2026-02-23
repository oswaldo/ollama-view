import * as vscode from 'vscode';
import { TemplateService } from '../services/templateService';
import { TemplateItem } from '../providers/templatesProvider';
import { TemplateEditorPanel } from '../panels/templateEditorPanel';
import { TemplateSource } from '../models/template';

interface TemplateAction extends vscode.QuickPickItem {
    id: string;
    command: string;
}

/**
 * Registers all template-related commands.
 */
export function registerTemplateCommands(
    context: vscode.ExtensionContext, 
    templateService: TemplateService
) {
    // Open editor for a template
    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaView.editTemplate', (item: TemplateItem) => {
            if (!item || !item.template) {
                return;
            }
            TemplateEditorPanel.createOrShow(context.extensionUri, item.template, templateService);
        })
    );

    // Duplicate an existing template
    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaView.duplicateTemplate', async (item: TemplateItem) => {
            if (!item || !item.template) {
                return;
            }
            const copy = await templateService.duplicateTemplate(item.template.id);
            if (copy) {
                vscode.window.showInformationMessage(`Template duplicated as '${copy.name}'.`);
                vscode.commands.executeCommand('ollamaView.refresh');
                TemplateEditorPanel.createOrShow(context.extensionUri, copy, templateService);
            }
        })
    );

    // Show more actions for a template
    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaView.showMoreTemplateActions', async (item: TemplateItem) => {
            if (!item || !item.template) {
                return;
            }

            const actions: TemplateAction[] = [
                { label: '$(edit) Edit', id: 'edit', command: 'ollamaView.editTemplate', description: 'Open template editor' },
                { label: '$(copy) Duplicate', id: 'duplicate', command: 'ollamaView.duplicateTemplate', description: 'Create a copy of this template' }
            ];

            if (item.template.source === TemplateSource.User) {
                actions.push({ label: '$(trash) Delete', id: 'delete', command: 'ollamaView.deleteTemplate', description: 'Permanently remove template' });
            }

            const result = await vscode.window.showQuickPick(actions, {
                placeHolder: `Actions for ${item.template.name}`
            });

            if (result) {
                vscode.commands.executeCommand(result.command, item);
            }
        })
    );

    // Create a new blank template
    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaView.createTemplate', async () => {
            const template = await templateService.createTemplate({
                name: 'New Template',
                systemMessage: 'You are a helpful assistant.'
            });
            vscode.commands.executeCommand('ollamaView.refresh');
            TemplateEditorPanel.createOrShow(context.extensionUri, template, templateService);
        })
    );

    // Delete a template
    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaView.deleteTemplate', async (item: TemplateItem) => {
            if (!item || !item.template) {
                return;
            }

            const template = item.template;
            const confirm = await vscode.window.showWarningMessage(
                `Are you sure you want to delete template "${template.name}"? This action cannot be undone.`,
                { modal: true },
                'Delete'
            );

            if (confirm === 'Delete') {
                const success = await templateService.deleteTemplate(template.id);
                if (success) {
                    vscode.window.showInformationMessage(`Template "${template.name}" deleted.`);
                    vscode.commands.executeCommand('ollamaView.refresh');
                    
                    // Close panel if open
                    const panel = TemplateEditorPanel.panels.get(template.id);
                    if (panel) {
                        panel.dispose();
                    }
                }
            }
        })
    );
}
