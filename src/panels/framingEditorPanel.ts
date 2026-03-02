import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { FramingSource, ModelFraming } from '../models/modelFraming';
import { FramingItem } from '../providers/framingProvider';
import { FramingService } from '../services/framingService';

/**
 * Manages the Model Framing Editor webview panel.
 */
export class FramingEditorPanel {
    public static panels: Map<string, FramingEditorPanel> = new Map();
    public static readonly viewType = 'ollamaFramingEditor';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private readonly _framingService: FramingService;
    private _framing: ModelFraming;

    /**
     * Creates or shows a framing editor panel.
     */
    public static createOrShow(extensionUri: vscode.Uri, framing: ModelFraming, framingService: FramingService) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

        // If we already have a panel for this framing, show it.
        const existingPanel = FramingEditorPanel.panels.get(framing.id);
        if (existingPanel) {
            existingPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            FramingEditorPanel.viewType,
            `Framing: ${framing.name}`,
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(extensionUri.fsPath, 'media')),
                    vscode.Uri.file(path.join(extensionUri.fsPath, 'dist')),
                ],
            },
        );

        const framingPanel = new FramingEditorPanel(panel, extensionUri, framing, framingService);
        FramingEditorPanel.panels.set(framing.id, framingPanel);
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        framing: ModelFraming,
        framingService: FramingService,
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._framing = framing;
        this._framingService = framingService;

        // Set the webview's initial html content
        this._update();

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'save': {
                        if (this._framing.source === FramingSource.BuiltIn) {
                            vscode.window.showErrorMessage(
                                'Built-in framings cannot be saved. Please duplicate it first.',
                            );
                            return;
                        }
                        const updated = await this._framingService.updateFraming(this._framing.id, message.framing);
                        if (updated) {
                            this._framing = updated;
                            vscode.window.showInformationMessage(`Model Framing '${this._framing.name}' saved.`);
                            // Refresh tree view to reflect changes
                            vscode.commands.executeCommand('ollamaView.refresh');
                        }
                        return;
                    }
                    case 'duplicate': {
                        const copy = await this._framingService.duplicateFraming(this._framing.id);
                        if (copy) {
                            vscode.window.showInformationMessage(`Model Framing duplicated as '${copy.name}'.`);
                            vscode.commands.executeCommand('ollamaView.refresh');
                            // Open the new copy
                            FramingEditorPanel.createOrShow(this._extensionUri, copy, this._framingService);
                        }
                        return;
                    }
                    case 'delete': {
                        if (this._framing.source === FramingSource.User) {
                            // Trigger the global delete command with a temporary FramingItem
                            vscode.commands.executeCommand('ollamaView.deleteFraming', new FramingItem(this._framing));
                        }
                        return;
                    }
                    case 'cancel': {
                        this.dispose();
                        return;
                    }
                }
            },
            null,
            this._disposables,
        );

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    public dispose() {
        FramingEditorPanel.panels.delete(this._framing.id);
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
                framing: this._framing,
            });
        }, 100);
    }

    private _getHtmlForWebview() {
        const htmlPath = path.join(this._extensionUri.fsPath, 'media', 'framing.html');
        let html = fs.readFileSync(htmlPath, 'utf8');

        const scriptUri = this._panel.webview.asWebviewUri(
            vscode.Uri.file(path.join(this._extensionUri.fsPath, 'dist', 'webview', 'framing.js')),
        );
        const styleUri = this._panel.webview.asWebviewUri(
            vscode.Uri.file(path.join(this._extensionUri.fsPath, 'media', 'common-webview.css')),
        );

        html = html.replace('{{scriptUri}}', scriptUri.toString());
        html = html.replace('{{styleUri}}', styleUri.toString());

        return html;
    }
}
