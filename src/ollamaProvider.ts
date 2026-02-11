import * as vscode from 'vscode';
import * as path from 'path';
import { OllamaApi, OllamaModel } from './ollamaApi';
import { ChatService, Chat } from './chatService';

export class OllamaChatItem extends vscode.TreeItem {
    constructor(
        public readonly chat: Chat,
    ) {
        super(chat.name, vscode.TreeItemCollapsibleState.None);
        this.tooltip = `Created: ${new Date(chat.createdAt).toLocaleString()}`;
        this.description = ''; // Maybe last message snippet?
        this.contextValue = 'ollama-chat';
        this.iconPath = new vscode.ThemeIcon('comment-discussion');

        // Command to open chat
        this.command = {
            command: 'ollamaView.openChat',
            title: 'Open Chat',
            arguments: [this]
        };
    }
}

export class OllamaModelItem extends vscode.TreeItem {
    constructor(
        public readonly model: OllamaModel,
        public readonly isRunning: boolean,
        public readonly hasChildren: boolean,
        public readonly isStarting: boolean = false,
        public readonly isStopping: boolean = false
    ) {
        // Collapsible to show chats
        super(model.name, hasChildren ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);

        const statusText = isRunning ? 'Running' : (isStarting ? 'Starting' : (isStopping ? 'Stopping' : 'Stopped'));
        this.tooltip = `${model.name}\nSize: ${(model.size / 1024 / 1024 / 1024).toFixed(2)} GB\nStatus: ${statusText}`;
        this.description = isRunning ? 'Running' : (isStarting ? 'Starting...' : (isStopping ? 'Stopping...' : 'Stopped'));

        // Context value for menus
        this.contextValue = isRunning ? 'variable-running' : (isStarting ? 'variable-starting' : (isStopping ? 'variable-stopping' : 'variable-stopped'));

        if (isRunning) {
            this.iconPath = vscode.Uri.file(path.join(__filename, '..', '..', 'media', 'model-icon-running.svg'));
        } else if (isStarting) {
            this.iconPath = vscode.Uri.file(path.join(__filename, '..', '..', 'media', 'model-icon-starting.svg'));
        } else if (isStopping) {
            this.iconPath = vscode.Uri.file(path.join(__filename, '..', '..', 'media', 'model-icon-stopping.svg'));
        } else {
            this.iconPath = {
                light: vscode.Uri.file(path.join(__filename, '..', '..', 'media', 'model-icon-light.svg')),
                dark: vscode.Uri.file(path.join(__filename, '..', '..', 'media', 'model-icon-dark.svg'))
            };
        }
    }
}

export class OllamaProvider implements vscode.TreeDataProvider<OllamaModelItem | OllamaChatItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<OllamaModelItem | OllamaChatItem | undefined | null | void> =
        new vscode.EventEmitter<OllamaModelItem | OllamaChatItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<OllamaModelItem | OllamaChatItem | undefined | null | void> =
        this._onDidChangeTreeData.event;

    private cleanModels: OllamaModel[] = [];
    private runningModels: Set<string> = new Set();
    private startingModels: Set<string> = new Set();
    private stoppingModels: Set<string> = new Set();
    private api: OllamaApi;
    private chatService: ChatService;

    constructor(chatService: ChatService) {
        this.api = new OllamaApi();
        this.chatService = chatService;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setStarting(modelName: string, starting: boolean) {
        if (starting) {
            this.startingModels.add(modelName);
        } else {
            this.startingModels.delete(modelName);
        }
        this.refresh();
    }

    setStopping(modelName: string, stopping: boolean) {
        if (stopping) {
            this.stoppingModels.add(modelName);
        } else {
            this.stoppingModels.delete(modelName);
        }
        this.refresh();
    }

    getTreeItem(element: OllamaModelItem | OllamaChatItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: OllamaModelItem | OllamaChatItem): Promise<(OllamaModelItem | OllamaChatItem)[]> {
        if (element instanceof OllamaChatItem) {
            return [];
        }

        if (element instanceof OllamaModelItem) {
            // Return chats for this model
            const chats = this.chatService.getChatsForModel(element.model.name);
            return chats.map(c => new OllamaChatItem(c));
        }

        // Root elements: Models
        const [models, running] = await Promise.all([this.api.listModels(), this.api.listRunning()]);

        this.runningModels = new Set(running.map((r) => r.model));

        return models.map((m) => {
            const isStart = this.startingModels.has(m.name);
            const isStop = this.stoppingModels.has(m.name);
            const isRun = this.runningModels.has(m.name) && !isStart && !isStop;
            const hasChildren = this.chatService.getChatsForModel(m.name).length > 0;
            return new OllamaModelItem(m, isRun, hasChildren, isStart, isStop);
        });
    }

    getApi(): OllamaApi {
        return this.api;
    }
}
