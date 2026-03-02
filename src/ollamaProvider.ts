import * as path from 'path';
import * as vscode from 'vscode';

import { IOllamaClient } from './contracts/IOllamaClient';
import { ModelInstance } from './models/modelInstance';
import { OllamaModel } from './ollamaApi';
import { Chat, ChatService } from './services/chatService';
import { ModelService } from './services/modelService';

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
        public readonly isRoot: boolean = false,
    ) {
        super(instance.name, vscode.TreeItemCollapsibleState.Collapsed);

        const statusText = isRunning ? 'Running' : isStarting ? 'Starting' : isStopping ? 'Stopping' : 'Stopped';
        this.tooltip = `${instance.name} (${instance.modelName})\nStatus: ${statusText}`;
        this.description = isRunning ? 'Running' : isStarting ? 'Starting...' : isStopping ? 'Stopping...' : 'Stopped';

        // Context value for menus
        const baseContext = isRunning
            ? 'variable-running'
            : isStarting
              ? 'variable-starting'
              : isStopping
                ? 'variable-stopping'
                : 'variable-stopped';

        this.contextValue = isRoot ? `${baseContext}-root` : baseContext;

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
    readonly onDidChangeTreeData: vscode.Event<
        OllamaModelItem | OllamaInstanceItem | OllamaChatItem | undefined | null | void
    > = this._onDidChangeTreeData.event;

    private runningModels: Set<string> = new Set();
    private startingModels: Set<string> = new Set();
    private stoppingModels: Set<string> = new Set();

    constructor(
        private chatService: ChatService,
        private modelService: ModelService,
        private api: IOllamaClient,
    ) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    private normalizeName(name: string): string {
        return name.replace(/:latest$/, '');
    }

    isModelRunning(modelName: string): boolean {
        return this.runningModels.has(this.normalizeName(modelName));
    }

    setStarting(modelName: string, starting: boolean) {
        const name = this.normalizeName(modelName);
        if (starting) {
            this.startingModels.add(name);
        } else {
            this.startingModels.delete(name);
        }
        this.refresh();
    }

    setStopping(modelName: string, stopping: boolean) {
        const name = this.normalizeName(modelName);
        if (stopping) {
            this.stoppingModels.add(name);
        } else {
            this.stoppingModels.delete(name);
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
            const instances = this.modelService.getInstancesForModel(element.model.name);
            return instances.map((inst) => {
                return this.createInstanceItem(inst);
            });
        }

        // Root elements: Models
        const [models, running] = await Promise.all([this.api.listModels(), this.api.listRunning()]);

        this.runningModels = new Set(running.map((r) => this.normalizeName(r.model)));

        // Cleanup settings for models that no longer exist
        this.modelService.cleanupOrphanedSettings(models.map((m) => m.name));

        // Filter out models that are actually managed instances of other models
        const rootModels = models.filter((m) => {
            const instance = this.modelService.getInstanceByOllamaName(m.name);
            if (!instance) {
                return true; // External model, show at root
            }
            // If it's ours, only show at root if it's NOT a managed custom instance
            return !instance.isManaged;
        });

        const rootItems: (OllamaModelItem | OllamaInstanceItem)[] = [];

        for (const model of rootModels) {
            const instances = this.modelService.getInstancesForModel(model.name);
            if (instances.length === 1) {
                // Flatten: Show the single instance directly at root
                rootItems.push(this.createInstanceItem(instances[0], true));
            } else {
                // Grouped: Show the model group
                rootItems.push(new OllamaModelItem(model));
            }
        }

        return rootItems;
    }

    private createInstanceItem(inst: ModelInstance, isRoot: boolean = false): OllamaInstanceItem {
        const actualName = inst.ollamaModelName || inst.modelName;
        const normName = this.normalizeName(actualName);
        const isStart = this.startingModels.has(normName);
        const isStop = this.stoppingModels.has(normName);
        const isRun = this.runningModels.has(normName) && !isStart && !isStop;
        return new OllamaInstanceItem(inst, isRun, isStart, isStop, isRoot);
    }

    getApi(): IOllamaClient {
        return this.api;
    }
}
