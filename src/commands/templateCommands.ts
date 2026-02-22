import * as vscode from 'vscode';
import { TemplateService } from '../services/templateService';
import { TemplateItem } from '../providers/templatesProvider';
import { TemplateEditorPanel } from '../panels/templateEditorPanel';

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

    // Create a new blank template
    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaView.createTemplate', async () => {
            const template = await templateService.createTemplate({
                name: 'New Template',
                content: 'You are a helpful assistant.'
            });
            vscode.commands.executeCommand('ollamaView.refresh');
            TemplateEditorPanel.createOrShow(context.extensionUri, template, templateService);
        })
    );
}
