import * as path from 'path';
import * as vscode from 'vscode';

import { Chat, ChatService } from './chatService';
import { ModelInstance } from './models/modelInstance';
import { ModelSettingsService } from './modelSettingsService';
import { OllamaApi, OllamaModel } from './ollamaApi';

export class OllamaChatItem extends vscode.TreeItem {
    constructor(public readonly chat: Chat) {
        super(chat.name, vscode.TreeItemCollapsibleState.None);
        this.tooltip = `Created: ${new Date(chat.createdAt).toLocaleString()}`;
        this.description = ''; // Maybe last message snippet?
        this.contextValue = 'ollama-chat';
        this.iconPath = new vscode.ThemeIcon('comment-discussion');

        // Command to open chat
        this.command = {
            command: 'ollamaView.openChat',
            title: 'Open Chat',
            arguments: [this],
        };
    }
}

export class OllamaInstanceItem extends vscode.TreeItem {
    constructor(
        public readonly instance: ModelInstance,
        public readonly isRunning: boolean,
        public readonly isStarting: boolean = false,
        public readonly isStopping: boolean = false,
    ) {
        super(instance.name, vscode.TreeItemCollapsibleState.Collapsed);

        const statusText = isRunning ? 'Running' : isStarting ? 'Starting' : isStopping ? 'Stopping' : 'Stopped';
        this.tooltip = `${instance.name} (${instance.modelName})\nStatus: ${statusText}`;
        this.description = isRunning ? 'Running' : isStarting ? 'Starting...' : isStopping ? 'Stopping...' : 'Stopped';

        // Context value for menus
        this.contextValue = isRunning
            ? 'variable-running'
            : isStarting
              ? 'variable-starting'
              : isStopping
                ? 'variable-stopping'
                : 'variable-stopped';

        if (isRunning) {
            this.iconPath = vscode.Uri.file(path.join(__dirname, '..', 'media', 'model-icon-running.svg'));
        } else if (isStarting) {
            this.iconPath = vscode.Uri.file(path.join(__dirname, '..', 'media', 'model-icon-starting.svg'));
        } else if (isStopping) {
            this.iconPath = vscode.Uri.file(path.join(__dirname, '..', 'media', 'model-icon-stopping.svg'));
        } else {
            this.iconPath = {
                light: vscode.Uri.file(path.join(__dirname, '..', 'media', 'model-icon-light.svg')),
                dark: vscode.Uri.file(path.join(__dirname, '..', 'media', 'model-icon-dark.svg')),
            };
        }
    }
}

export class OllamaModelItem extends vscode.TreeItem {
    constructor(public readonly model: OllamaModel) {
        // Collapsible to show instances
        super(model.name, vscode.TreeItemCollapsibleState.Collapsed);

        this.tooltip = `${model.name}\nSize: ${(model.size / 1024 / 1024 / 1024).toFixed(2)} GB`;
        this.contextValue = 'ollama-model';
        this.iconPath = new vscode.ThemeIcon('library');
    }
}

export class OllamaProvider implements vscode.TreeDataProvider<OllamaModelItem | OllamaInstanceItem | OllamaChatItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<
        OllamaModelItem | OllamaInstanceItem | OllamaChatItem | undefined | null | void
    > = new vscode.EventEmitter<OllamaModelItem | OllamaInstanceItem | OllamaChatItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<OllamaModelItem | OllamaInstanceItem | OllamaChatItem | undefined | null | void> =
        this._onDidChangeTreeData.event;

    private runningModels: Set<string> = new Set();
    private startingModels: Set<string> = new Set();
    private stoppingModels: Set<string> = new Set();
    private api: OllamaApi;
    private chatService: ChatService;
    private modelSettingsService: ModelSettingsService;

    constructor(chatService: ChatService, modelSettingsService: ModelSettingsService) {
        this.api = new OllamaApi();
        this.chatService = chatService;
        this.modelSettingsService = modelSettingsService;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    isModelRunning(modelName: string): boolean {
        return this.runningModels.has(modelName);
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

    async startModel(modelName: string): Promise<void> {
        this.setStarting(modelName, true);
        try {
            await this.api.startModel(modelName);
        } finally {
            this.setStarting(modelName, false);
        }
    }

    async stopModel(modelName: string): Promise<void> {
        this.setStopping(modelName, true);
        try {
            await this.api.stopModel(modelName);
        } finally {
            this.setStopping(modelName, false);
        }
    }

    async chat(
        instanceId: string,
        messages: { role: string; content: string }[],
        onToken: (token: string) => void,
    ): Promise<void> {
        const settings = this.modelSettingsService.getSettings(instanceId);
        const ollamaName = settings.ollamaModelName || settings.modelName;
        const options = settings.config;

        // If we know it's not running, show starting state
        const wasRunning = this.runningModels.has(ollamaName);
        if (!wasRunning) {
            this.setStarting(ollamaName, true);
        }

        try {
            await this.api.chat(ollamaName, messages, onToken, options);
        } finally {
            if (!wasRunning) {
                this.setStarting(ollamaName, false);
            }
        }
    }

    getTreeItem(element: OllamaModelItem | OllamaChatItem): vscode.TreeItem {
        return element;
    }

    async getChildren(
        element?: OllamaModelItem | OllamaInstanceItem | OllamaChatItem,
    ): Promise<(OllamaModelItem | OllamaInstanceItem | OllamaChatItem)[]> {
        if (element instanceof OllamaChatItem) {
            return [];
        }

        if (element instanceof OllamaInstanceItem) {
            // Return chats for this instance
            const chats = this.chatService.getChatsForModel(element.instance.id);
            return chats.map((c) => new OllamaChatItem(c));
        }

        if (element instanceof OllamaModelItem) {
            // Return instances for this model
            const instances = this.modelSettingsService.getInstancesForModel(element.model.name);
            return instances.map((inst) => {
                const isStart = this.startingModels.has(inst.modelName);
                const isStop = this.stoppingModels.has(inst.modelName);
                const isRun = this.runningModels.has(inst.modelName) && !isStart && !isStop;
                return new OllamaInstanceItem(inst, isRun, isStart, isStop);
            });
        }

        // Root elements: Models
        const [models, running] = await Promise.all([this.api.listModels(), this.api.listRunning()]);

        this.runningModels = new Set(running.map((r) => r.model));

        // Cleanup settings for models that no longer exist
        this.modelSettingsService.cleanupOrphanedSettings(models.map((m) => m.name));

        return models.map((m) => new OllamaModelItem(m));
    }

    getApi(): OllamaApi {
        return this.api;
    }
}
