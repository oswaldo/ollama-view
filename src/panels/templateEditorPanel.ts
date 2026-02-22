import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { TemplateService } from '../services/templateService';
import { Template, TemplateSource } from '../models/template';

/**
 * Manages the Template Editor webview panel.
 */
export class TemplateEditorPanel {
    public static panels: Map<string, TemplateEditorPanel> = new Map();
    public static readonly viewType = 'ollamaTemplateEditor';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private readonly _templateService: TemplateService;
    private _template: Template;

    /**
     * Creates or shows a template editor panel.
     */
    public static createOrShow(extensionUri: vscode.Uri, template: Template, templateService: TemplateService) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

        // If we already have a panel for this template, show it.
        if (TemplateEditorPanel.panels.has(template.id)) {
            TemplateEditorPanel.panels.get(template.id)!._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            TemplateEditorPanel.viewType,
            `Template: ${template.name}`,
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(extensionUri.fsPath, 'media')),
                    vscode.Uri.file(path.join(extensionUri.fsPath, 'dist'))
                ]
            }
        );

        const templatePanel = new TemplateEditorPanel(panel, extensionUri, template, templateService);
        TemplateEditorPanel.panels.set(template.id, templatePanel);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, template: Template, templateService: TemplateService) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._template = template;
        this._templateService = templateService;

        // Set the webview's initial html content
        this._update();

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'save':
                        if (this._template.source === TemplateSource.BuiltIn) {
                            vscode.window.showErrorMessage('Built-in templates cannot be saved. Please duplicate it first.');
                            return;
                        }
                        const updated = await this._templateService.updateTemplate(this._template.id, message.template);
                        if (updated) {
                            this._template = updated;
                            vscode.window.showInformationMessage(`Template '${this._template.name}' saved.`);
                            // Refresh tree view to reflect changes
                            vscode.commands.executeCommand('ollamaView.refresh');
                        }
                        return;
                    case 'duplicate':
                        const copy = await this._templateService.duplicateTemplate(this._template.id);
                        if (copy) {
                            vscode.window.showInformationMessage(`Template duplicated as '${copy.name}'.`);
                            vscode.commands.executeCommand('ollamaView.refresh');
                            // Open the new copy
                            TemplateEditorPanel.createOrShow(this._extensionUri, copy, this._templateService);
                        }
                        return;
                    case 'cancel':
                        this.dispose();
                        return;
                }
            },
            null,
            this._disposables
        );

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    public dispose() {
        TemplateEditorPanel.panels.delete(this._template.id);
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        this._panel.webview.html = this._getHtmlForWebview();
        
        // Initial state sync
        setTimeout(() => {
            this._panel.webview.postMessage({
                command: 'init',
                template: this._template
            });
        }, 100);
    }

    private _getHtmlForWebview() {
        const htmlPath = path.join(this._extensionUri.fsPath, 'media', 'template.html');
        let html = fs.readFileSync(htmlPath, 'utf8');

        const scriptUri = this._panel.webview.asWebviewUri(
            vscode.Uri.file(path.join(this._extensionUri.fsPath, 'dist', 'webview', 'template.js'))
        );
        const styleUri = this._panel.webview.asWebviewUri(
            vscode.Uri.file(path.join(this._extensionUri.fsPath, 'media', 'template.css'))
        );

        html = html.replace('{{scriptUri}}', scriptUri.toString());
        html = html.replace('{{styleUri}}', styleUri.toString());

        return html;
    }
}
