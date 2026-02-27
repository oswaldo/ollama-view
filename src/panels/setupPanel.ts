import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ModelSettingsService } from '../modelSettingsService';
import { OllamaApi, OllamaModel } from '../ollamaApi';
import { FramingService } from '../services/framingService';
import { Logger } from '../logger';

export class SetupPanel {
    public static panels: Map<string, SetupPanel> = new Map();
    public static readonly viewType = 'ollamaModelSetup';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private readonly _model: OllamaModel;
    private readonly _instanceId: string;
    private readonly _modelSettingsService: ModelSettingsService;
    private readonly _framingService: FramingService;
    private readonly _onStateChange?: () => void;
    private _originalValues: any = null;

    public static createOrShow(extensionUri: vscode.Uri, model: OllamaModel, modelSettingsService: ModelSettingsService, framingService: FramingService, instanceId?: string, onStateChange?: () => void) {
        const id = instanceId || model.name;
        if (SetupPanel.panels.has(id)) {
            SetupPanel.panels.get(id)!._panel.reveal();
            return;
        }

        const instance = modelSettingsService.getSettings(id);
        const title = `${instance.name} - ${model.name}`;

        const panel = vscode.window.createWebviewPanel(
            SetupPanel.viewType,
            `Setup: ${title}`,
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

        const setupPanel = new SetupPanel(panel, extensionUri, model, modelSettingsService, framingService, id, onStateChange);
        SetupPanel.panels.set(id, setupPanel);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, model: OllamaModel, modelSettingsService: ModelSettingsService, framingService: FramingService, instanceId: string, onStateChange?: () => void) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._model = model;
        this._instanceId = instanceId;
        this._modelSettingsService = modelSettingsService;
        this._framingService = framingService;
        this._onStateChange = onStateChange;

        this._update();

        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'save':
                        await this._modelSettingsService.setSettings(this._instanceId, message.instance);
                        vscode.window.showInformationMessage(`Settings saved for ${message.instance.name}`);
                        if (this._onStateChange) {
                            this._onStateChange();
                        }
                        this.dispose();
                        return;
                    case 'applyFraming':
                        await this._handleApplyFraming();
                        return;
                    case 'resetGroup':
                        await this._handleResetGroup(message.group);
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

    private async _handleResetGroup(group: 'hardware' | 'inference') {
        if (!this._originalValues) {
            this._originalValues = await new OllamaApi().showModel(this._model.name);
        }

        const params = this._extractParams(this._originalValues);
        const instance = this._modelSettingsService.getSettings(this._instanceId);
        if (group === 'hardware') {
            instance.config.num_gpu = params.num_gpu;
            instance.config.num_thread = params.num_thread;
            instance.config.use_mmap = params.use_mmap;
            instance.config.use_mlock = params.use_mlock;
        } else {
            instance.config.num_ctx = params.num_ctx;
            instance.config.num_predict = params.num_predict;
            instance.config.temperature = params.temperature;
            instance.config.top_p = params.top_p;
            instance.config.top_k = params.top_k;
            instance.config.repeat_penalty = params.repeat_penalty;
            instance.config.seed = params.seed;
            instance.config.stop = params.stop ? (Array.isArray(params.stop) ? params.stop : [params.stop]) : undefined;
        }

        this._panel.webview.postMessage({
            command: 'init',
            model: this._model,
            settings: instance,
            originalValues: this._originalValues,
            defaultMessage: ModelSettingsService.DEFAULT_SYSTEM_MESSAGE
        });
    }

    private _extractParams(showData: any): any {
        const params: any = {};
        const modelfile = showData.modelfile || '';
        const parameters = showData.parameters || '';

        // Helper to parse a single line
        const parseLine = (line: string) => {
            const match = line.match(/^\s*(?:PARAMETER\s+)?(\w+)\s+(.+)$/i);
            if (match) {
                const key = match[1].toLowerCase();
                let val: any = match[2].trim();
                try {
                    if (val === 'true') val = true;
                    else if (val === 'false') val = false;
                    else if (!isNaN(Number(val))) val = Number(val);
                    else val = val.replace(/^"|"$/g, '');
                } catch (e) {
                    // Ignore parsing errors for individual parameters
                }
                
                if (key === 'stop') {
                    if (!params.stop) params.stop = [];
                    params.stop.push(val);
                } else {
                    params[key] = val;
                }
            }
        };

        modelfile.split('\n').forEach((l: string) => {
            if (l.toUpperCase().startsWith('PARAMETER ')) parseLine(l);
        });
        parameters.split('\n').forEach((l: string) => parseLine(l));

        return params;
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
        SetupPanel.panels.delete(this._instanceId);
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private async _update() {
        this._panel.webview.html = this._getHtmlForWebview();
        
        // Lazy load original values if needed
        if (!this._originalValues) {
            try {
                this._originalValues = await new OllamaApi().showModel(this._model.name);
            } catch (e) {
                Logger.error('Failed to fetch original model values', e);
            }
        }

        setTimeout(() => {
            const instance = this._modelSettingsService.getSettings(this._instanceId);
            const originalParams = this._extractParams(this._originalValues || {});
            
            this._panel.webview.postMessage({
                command: 'init',
                model: this._model,
                settings: instance,
                originalValues: this._originalValues,
                originalParams: originalParams,
                defaultMessage: ModelSettingsService.DEFAULT_SYSTEM_MESSAGE,
                isRunning: true // TODO: check actual status
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
