import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../logger';
import { ModelInstance } from '../models/modelInstance';
import { OllamaModel, OllamaShowResponse } from '../ollamaApi';
import { OllamaProvider } from '../ollamaProvider';
import { FramingService } from '../services/framingService';
import { ModelService } from '../services/modelService';

export class SetupPanel {
    public static panels: Map<string, SetupPanel> = new Map();
    public static readonly viewType = 'ollamaModelSetup';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private readonly _model: OllamaModel;
    private readonly _instanceId: string;
    private readonly _modelService: ModelService;
    private readonly _framingService: FramingService;
    private readonly _ollamaProvider: OllamaProvider;
    private readonly _onStateChange?: () => void;
    private _originalValues: OllamaShowResponse | null = null;

    public static createOrShow(
        extensionUri: vscode.Uri,
        model: OllamaModel,
        modelService: ModelService,
        framingService: FramingService,
        ollamaProvider: OllamaProvider,
        instanceId?: string,
        onStateChange?: () => void,
    ) {
        const id = instanceId || model.name;
        if (SetupPanel.panels.has(id)) {
            SetupPanel.panels.get(id)!._panel.reveal();
            return;
        }

        const instance = modelService.getSettings(id);
        const title = `${instance.name} - ${model.name}`;

        const panel = vscode.window.createWebviewPanel(SetupPanel.viewType, `Setup: ${title}`, vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(extensionUri.fsPath, 'media')),
                vscode.Uri.file(path.join(extensionUri.fsPath, 'dist')),
            ],
        });

        const setupPanel = new SetupPanel(
            panel,
            extensionUri,
            model,
            modelService,
            framingService,
            ollamaProvider,
            id,
            onStateChange,
        );
        SetupPanel.panels.set(id, setupPanel);
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        model: OllamaModel,
        modelService: ModelService,
        framingService: FramingService,
        ollamaProvider: OllamaProvider,
        instanceId: string,
        onStateChange?: () => void,
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._model = model;
        this._instanceId = instanceId;
        this._modelService = modelService;
        this._framingService = framingService;
        this._ollamaProvider = ollamaProvider;
        this._onStateChange = onStateChange;

        this._update();

        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'save': {
                        const settings = this._modelService.getSettings(this._instanceId);
                        const ollamaName = settings.ollamaModelName || settings.modelName;

                        // If model is running, we should stop it so it restarts with new parameters
                        if (this._ollamaProvider.isModelRunning(ollamaName)) {
                            try {
                                await this._ollamaProvider.stopModel(ollamaName);
                            } catch (e: unknown) {
                                Logger.error(`Failed to stop model ${ollamaName} during settings update`, e);
                            }
                        }

                        await this._modelService.setSettings(
                            this._instanceId,
                            message.instance as Partial<ModelInstance>,
                        );
                        vscode.window.showInformationMessage(`Settings saved for ${message.instance.name}`);
                        if (this._onStateChange) {
                            this._onStateChange();
                        }
                        this.dispose();
                        return;
                    }
                    case 'applyFraming':
                        await this._handleApplyFraming();
                        return;
                    case 'resetGroup':
                        await this._handleResetGroup(message.group as 'hardware' | 'inference');
                        return;
                    case 'cancel':
                        this.dispose();
                        return;
                }
            },
            null,
            this._disposables,
        );

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    private async _handleResetGroup(group: 'hardware' | 'inference') {
        if (!this._originalValues) {
            this._originalValues = await this._ollamaProvider.getApi().showModel(this._model.name);
        }

        if (!this._originalValues) {
            return;
        }

        const params = this._extractParams(this._originalValues);
        const instance = this._modelService.getSettings(this._instanceId);
        if (group === 'hardware') {
            instance.config.num_gpu = params.num_gpu as number;
            instance.config.num_thread = params.num_thread as number;
            instance.config.use_mmap = params.use_mmap as boolean;
            instance.config.use_mlock = params.use_mlock as boolean;
        } else {
            instance.config.num_ctx = params.num_ctx as number;
            instance.config.num_predict = params.num_predict as number;
            instance.config.temperature = params.temperature as number;
            instance.config.top_p = params.top_p as number;
            instance.config.top_k = params.top_k as number;
            instance.config.repeat_penalty = params.repeat_penalty as number;
            instance.config.seed = params.seed as number;
            instance.config.stop = params.stop
                ? Array.isArray(params.stop)
                    ? (params.stop as string[])
                    : [params.stop as string]
                : undefined;
        }

        this._panel.webview.postMessage({
            command: 'init',
            model: this._model,
            settings: instance,
            originalValues: this._originalValues,
            defaultMessage: ModelService.DEFAULT_SYSTEM_MESSAGE,
        });
    }

    private _extractParams(showData: OllamaShowResponse): Record<string, string | number | boolean | string[]> {
        const params: Record<string, string | number | boolean | string[]> = {};
        const modelfile = showData.modelfile || '';
        const parameters = showData.parameters || '';

        // Helper to parse a single line
        const parseLine = (line: string) => {
            const match = line.match(/^\s*(?:PARAMETER\s+)?(\w+)\s+(.+)$/i);
            if (match) {
                const key = match[1].toLowerCase();
                const rawVal = match[2].trim();
                let val: string | number | boolean = rawVal;

                if (rawVal === 'true') {
                    val = true;
                } else if (rawVal === 'false') {
                    val = false;
                } else if (!isNaN(Number(rawVal))) {
                    val = Number(rawVal);
                } else {
                    val = rawVal.replace(/^"|"$/g, '');
                }

                if (key === 'stop') {
                    if (!params.stop) {
                        params.stop = [];
                    }
                    (params.stop as string[]).push(val as string);
                } else {
                    params[key] = val;
                }
            }
        };

        modelfile.split('\n').forEach((l: string) => {
            if (l.toUpperCase().startsWith('PARAMETER ')) {
                parseLine(l);
            }
        });
        parameters.split('\n').forEach((l: string) => parseLine(l));

        return params;
    }

    private async _handleApplyFraming() {
        const framings = this._framingService.getAllFramings();
        const items = framings.map((f) => ({
            label: f.name,
            description: f.description,
            framing: f,
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a model framing to apply',
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
                    systemTurnSuffix: f.systemTurnSuffix,
                },
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
                this._originalValues = await this._ollamaProvider.getApi().showModel(this._model.name);
            } catch (e: unknown) {
                Logger.error('Failed to fetch original model values', e);
            }
        }

        setTimeout(() => {
            const instance = this._modelService.getSettings(this._instanceId);
            const originalParams = this._originalValues ? this._extractParams(this._originalValues) : {};

            this._panel.webview.postMessage({
                command: 'init',
                model: this._model,
                settings: instance,
                originalValues: this._originalValues,
                originalParams: originalParams,
                defaultMessage: ModelService.DEFAULT_SYSTEM_MESSAGE,
                isRunning: this._ollamaProvider.isModelRunning(instance.ollamaModelName || instance.modelName),
            });
        }, 100);
    }

    private _getHtmlForWebview() {
        const htmlPath = path.join(this._extensionUri.fsPath, 'media', 'setup.html');
        let html = fs.readFileSync(htmlPath, 'utf8');

        const scriptUri = this._panel.webview.asWebviewUri(
            vscode.Uri.file(path.join(this._extensionUri.fsPath, 'dist', 'webview', 'setup.js')),
        );
        const styleUri = this._panel.webview.asWebviewUri(
            vscode.Uri.file(path.join(this._extensionUri.fsPath, 'media', 'common-webview.css')),
        );

        html = html.replace('{{scriptUri}}', scriptUri.toString());
        html = html.replace('{{styleUri}}', styleUri.toString());

        return html;
    }
}
