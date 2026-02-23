import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ModelSettingsService } from '../modelSettingsService';
import { OllamaModel } from '../ollamaApi';
import { FramingService } from '../services/framingService';

export class SetupPanel {
    public static panels: Map<string, SetupPanel> = new Map();
    public static readonly viewType = 'ollamaModelSetup';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private readonly _model: OllamaModel;
    private readonly _modelSettingsService: ModelSettingsService;
    private readonly _framingService: FramingService;

    public static createOrShow(extensionUri: vscode.Uri, model: OllamaModel, modelSettingsService: ModelSettingsService, framingService: FramingService) {
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

        const setupPanel = new SetupPanel(panel, extensionUri, model, modelSettingsService, framingService);
        SetupPanel.panels.set(model.name, setupPanel);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, model: OllamaModel, modelSettingsService: ModelSettingsService, framingService: FramingService) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._model = model;
        this._modelSettingsService = modelSettingsService;
        this._framingService = framingService;

        this._update();

        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'save':
                        await this._modelSettingsService.setSettings(this._model.name, message.settings);
                        vscode.window.showInformationMessage(`Settings saved for ${this._model.name}`);
                        this.dispose();
                        return;
                    case 'applyFraming':
                        await this._handleApplyFraming();
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

    private async _handleApplyFraming() {
        const framings = this._framingService.getAllFramings();
        const items = framings.map(f => ({
            label: f.name,
            description: f.description,
            framing: f
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a model framing to apply'
        });

        if (selected) {
            const f = selected.framing;
            this._panel.webview.postMessage({
                command: 'updateFields',
                settings: {
                    systemMessage: f.systemMessage,
                    userMessagePrefix: f.userMessagePrefix,
                    userMessageSuffix: f.userMessageSuffix,
                    systemTurnPrefix: f.systemTurnPrefix,
                    systemTurnSuffix: f.systemTurnSuffix
                }
            });
            vscode.window.showInformationMessage(`Applied framing: ${f.name}`);
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
