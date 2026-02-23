import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ModelSettingsService } from '../modelSettingsService';
import { OllamaModel } from '../ollamaApi';
import { TemplateService } from '../services/templateService';

export class SetupPanel {
    public static panels: Map<string, SetupPanel> = new Map();
    public static readonly viewType = 'ollamaModelSetup';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private readonly _model: OllamaModel;
    private readonly _modelSettingsService: ModelSettingsService;
    private readonly _templateService: TemplateService;

    public static createOrShow(extensionUri: vscode.Uri, model: OllamaModel, modelSettingsService: ModelSettingsService, templateService: TemplateService) {
        if (SetupPanel.panels.has(model.name)) {
            SetupPanel.panels.get(model.name)!._panel.reveal();
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            SetupPanel.viewType,
            `Setup: ${model.name}`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(extensionUri.fsPath, 'media')),
                    vscode.Uri.file(path.join(extensionUri.fsPath, 'dist'))
                ]
            }
        );

        const setupPanel = new SetupPanel(panel, extensionUri, model, modelSettingsService, templateService);
        SetupPanel.panels.set(model.name, setupPanel);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, model: OllamaModel, modelSettingsService: ModelSettingsService, templateService: TemplateService) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._model = model;
        this._modelSettingsService = modelSettingsService;
        this._templateService = templateService;

        this._update();

        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'save':
                        await this._modelSettingsService.setSettings(this._model.name, message.settings);
                        vscode.window.showInformationMessage(`Settings saved for ${this._model.name}`);
                        this.dispose();
                        return;
                    case 'applyTemplate':
                        await this._handleApplyTemplate();
                        return;
                    case 'cancel':
                        this.dispose();
                        return;
                }
            },
            null,
            this._disposables
        );

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    private async _handleApplyTemplate() {
        const templates = this._templateService.getAllTemplates();
        const items = templates.map(t => ({
            label: t.name,
            description: t.description,
            template: t
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a template to apply'
        });

        if (selected) {
            const t = selected.template;
            this._panel.webview.postMessage({
                command: 'updateFields',
                settings: {
                    systemMessage: t.systemMessage,
                    userMessagePrefix: t.userMessagePrefix,
                    userMessageSuffix: t.userMessageSuffix,
                    systemTurnPrefix: t.systemTurnPrefix,
                    systemTurnSuffix: t.systemTurnSuffix
                }
            });
            vscode.window.showInformationMessage(`Applied template: ${t.name}`);
        }
    }

    public dispose() {
        SetupPanel.panels.delete(this._model.name);
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
        
        setTimeout(() => {
            this._panel.webview.postMessage({
                command: 'init',
                model: this._model,
                settings: this._modelSettingsService.getSettings(this._model.name),
                defaultMessage: ModelSettingsService.DEFAULT_SYSTEM_MESSAGE
            });
        }, 100);
    }

    private _getHtmlForWebview() {
        const htmlPath = path.join(this._extensionUri.fsPath, 'media', 'setup.html');
        let html = fs.readFileSync(htmlPath, 'utf8');

        const scriptUri = this._panel.webview.asWebviewUri(
            vscode.Uri.file(path.join(this._extensionUri.fsPath, 'dist', 'webview', 'setup.js'))
        );
        const styleUri = this._panel.webview.asWebviewUri(
            vscode.Uri.file(path.join(this._extensionUri.fsPath, 'media', 'common-webview.css'))
        );

        html = html.replace('{{scriptUri}}', scriptUri.toString());
        html = html.replace('{{styleUri}}', styleUri.toString());

        return html;
    }
}
