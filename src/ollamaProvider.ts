import * as vscode from 'vscode';
import * as path from 'path';
import { OllamaApi, OllamaModel } from './ollamaApi';

export class OllamaModelItem extends vscode.TreeItem {
    constructor(
        public readonly model: OllamaModel,
        public readonly isRunning: boolean,
    ) {
        super(model.name, vscode.TreeItemCollapsibleState.None);

        this.tooltip = `${model.name}\nSize: ${(model.size / 1024 / 1024 / 1024).toFixed(2)} GB\nRunning: ${isRunning}`;
        this.description = isRunning ? 'Running' : 'Stopped';

        // Context value for menus
        this.contextValue = isRunning ? 'variable-running' : 'variable-stopped';

        // Icons
        // We can use built-in ones or custom paths.
        // Using built-in colored circles if possible? VS Code doesn't have colored icons easily without custom SVGs.
        // We can use `vscode.ThemeIcon` with 'circle-filled' but color is theme dependent.
        // Best approach for red/green:
        // Use a standard icon but rely on description. Or use `resourceUri` hacks.
        // Actually, let's use standard icons that convey meaning.
        // 'pass' (check) for running, 'circle-outline' or 'stop' for stopped?
        if (isRunning) {
            this.iconPath = vscode.Uri.file(path.join(__filename, '..', '..', 'media', 'model-icon-running.svg'));
        } else {
            this.iconPath = {
                light: vscode.Uri.file(path.join(__filename, '..', '..', 'media', 'model-icon-light.svg')),
                dark: vscode.Uri.file(path.join(__filename, '..', '..', 'media', 'model-icon-dark.svg'))
            };
        }

        // Since we are using a raw SVG, we can't easily rely on ThemeColor for status (green/red)
        // without defining separate SVGs or using a mask.
        // For now, let's keep it simple as requested. The description 'Running'/'Stopped' handles the status text.
        // If we want color:
        // this.iconPath = {
        //    light: iconPath,
        //    dark: iconPath 
        // };
    }
}

export class OllamaProvider implements vscode.TreeDataProvider<OllamaModelItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<OllamaModelItem | undefined | null | void> =
        new vscode.EventEmitter<OllamaModelItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<OllamaModelItem | undefined | null | void> =
        this._onDidChangeTreeData.event;

    private cleanModels: OllamaModel[] = [];
    private runningModels: Set<string> = new Set();
    private api: OllamaApi;

    constructor() {
        this.api = new OllamaApi();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: OllamaModelItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: OllamaModelItem): Promise<OllamaModelItem[]> {
        if (element) {
            return []; // No children for now
        }

        // Fetch data
        const [models, running] = await Promise.all([this.api.listModels(), this.api.listRunning()]);

        this.runningModels = new Set(running.map((r) => r.model));

        // Note: Ollama 'ps' returns specific model names, 'list' returns tags (e.g. llama2:latest)
        // We need to match them. running model usually matches the name in list.

        return models.map((m) => {
            const isRun = this.runningModels.has(m.name);
            return new OllamaModelItem(m, isRun);
        });
    }

    getApi(): OllamaApi {
        return this.api;
    }
}
