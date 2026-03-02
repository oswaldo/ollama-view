import * as vscode from 'vscode';

import { ChatCommands } from './commands/chatCommands';
import { registerFramingCommands } from './commands/framingCommands';
import { ModelCommands } from './commands/modelCommands';
import { ProviderCommands } from './commands/providerCommands';
import { IOllamaClient } from './contracts/IOllamaClient';
import { Logger } from './logger';
import { OllamaApi } from './ollamaApi';
import { OllamaChatItem, OllamaInstanceItem, OllamaModelItem, OllamaProvider } from './ollamaProvider';
import { SetupPanel } from './panels/setupPanel';
import { FramingProvider } from './providers/framingProvider';
import { VscodeChatRepository } from './repositories/VscodeChatRepository';
import { VscodeModelSettingsRepository } from './repositories/VscodeModelSettingsRepository';
import { ChatOrchestrator } from './services/chatOrchestrator';
import { ChatService } from './services/chatService';
import { FramingService } from './services/framingService';
import { ModelService } from './services/modelService';

interface ModelAction extends vscode.QuickPickItem {
    id: string;
    command: string;
}

const getModelActions = (): ModelAction[] => [
    {
        label: '$(add) Create New Instance',
        id: 'createInstance',
        command: 'ollamaView.createInstance',
        description: 'Create a customized instance of this model',
    },
    {
        label: '$(settings-gear) Setup',
        id: 'setup',
        command: 'ollamaView.setup',
        description: 'Configure model settings',
    },
    { label: '$(trash) Delete', id: 'delete', command: 'ollamaView.delete', description: 'Permanently remove model' },
];

export function activate(context: vscode.ExtensionContext) {
    Logger.init();

    // Infrastructure
    const chatRepository = new VscodeChatRepository(context);
    const modelSettingsRepository = new VscodeModelSettingsRepository(context);

    // Dynamic Ollama Client to support immutable implementations on config changes
    class DynamicOllamaClient implements IOllamaClient {
        private currentClient: OllamaApi;

        constructor() {
            const config = vscode.workspace.getConfiguration('ollama-view');
            const apiUrl = config.get<string>('apiUrl') || 'http://127.0.0.1:11434';
            this.currentClient = new OllamaApi(apiUrl);

            context.subscriptions.push(
                vscode.workspace.onDidChangeConfiguration((e) => {
                    if (e.affectsConfiguration('ollama-view.apiUrl')) {
                        const newApiUrl = vscode.workspace.getConfiguration('ollama-view').get<string>('apiUrl') || 'http://127.0.0.1:11434';
                        this.currentClient = new OllamaApi(newApiUrl);
                    }
                })
            );
        }

        listModels() { return this.currentClient.listModels(); }
        listRunning() { return this.currentClient.listRunning(); }
        showModel(model: string) { return this.currentClient.showModel(model); }
        startModel(model: string) { return this.currentClient.startModel(model); }
        stopModel(model: string) { return this.currentClient.stopModel(model); }
        deleteModel(model: string) { return this.currentClient.deleteModel(model); }
        pullModel(model: string, onProgress: Parameters<IOllamaClient['pullModel']>[1]) { return this.currentClient.pullModel(model, onProgress); }
        createModel(options: Parameters<IOllamaClient['createModel']>[0]) { return this.currentClient.createModel(options); }
        chat(model: string, messages: Parameters<IOllamaClient['chat']>[1], onToken: Parameters<IOllamaClient['chat']>[2], options?: Parameters<IOllamaClient['chat']>[3]) {
            return this.currentClient.chat(model, messages, onToken, options);
        }
    }

    const dynamicOllamaApi = new DynamicOllamaClient();

    // Services
    const chatService = new ChatService(chatRepository);
    const modelService = new ModelService(modelSettingsRepository, dynamicOllamaApi as unknown as OllamaApi, chatService);
    const framingService = new FramingService(context);
    const chatOrchestrator = new ChatOrchestrator(chatService, modelService, framingService, dynamicOllamaApi as unknown as OllamaApi);

    // Providers
    const ollamaProvider = new OllamaProvider(chatService, modelService, dynamicOllamaApi);
    const framingProvider = new FramingProvider(framingService);

    // Command Handlers
    const modelCommands = new ModelCommands(modelService, chatService, ollamaProvider);
    const chatCommands = new ChatCommands(
        chatService,
        modelService,
        framingService,
        chatOrchestrator,
        ollamaProvider,
        context.extensionUri,
    );
    const providerCommands = new ProviderCommands(ollamaProvider, framingProvider);

    // Register TreeDataProvider
    vscode.window.registerTreeDataProvider('ollama-models-view', ollamaProvider);
    vscode.window.registerTreeDataProvider('ollama-framing-view', framingProvider);

    // Commands
    registerFramingCommands(context, framingService);

    context.subscriptions.push(
        vscode.commands.registerCommand('ollamaView.refresh', () => providerCommands.refresh()),
        vscode.commands.registerCommand('ollamaView.pull', () => providerCommands.pull()),

        vscode.commands.registerCommand('ollamaView.createChat', (node?: OllamaInstanceItem) =>
            chatCommands.createChat(node),
        ),
        vscode.commands.registerCommand('ollamaView.startChat', () => chatCommands.startChat()),
        vscode.commands.registerCommand('ollamaView.deleteChat', (node: OllamaChatItem) =>
            chatCommands.deleteChat(node),
        ),
        vscode.commands.registerCommand('ollamaView.openChat', (node: OllamaChatItem) => chatCommands.openChat(node)),

        vscode.commands.registerCommand('ollamaView.createInstance', (node: OllamaModelItem | OllamaInstanceItem) =>
            modelCommands.createInstance(node, context.extensionUri),
        ),
        vscode.commands.registerCommand('ollamaView.start', (node?: OllamaInstanceItem | OllamaModelItem) =>
            modelCommands.start(node),
        ),
        vscode.commands.registerCommand('ollamaView.stop', (node?: OllamaInstanceItem | OllamaModelItem) =>
            modelCommands.stop(node),
        ),
        vscode.commands.registerCommand('ollamaView.delete', (node?: OllamaInstanceItem | OllamaModelItem) =>
            modelCommands.delete(node),
        ),

        vscode.commands.registerCommand('ollamaView.setup', async (node?: OllamaInstanceItem | OllamaModelItem) => {
            if (!node) {
                return;
            }
            if (node instanceof OllamaInstanceItem) {
                const api = ollamaProvider.getApi();
                const models = await api.listModels();
                const model = models.find((m) => m.name === node.instance.modelName);
                if (model) {
                    SetupPanel.createOrShow(
                        context.extensionUri,
                        model,
                        modelService,
                        framingService,
                        ollamaProvider,
                        node.instance.id,
                        () => ollamaProvider.refresh(),
                    );
                }
            } else {
                SetupPanel.createOrShow(
                    context.extensionUri,
                    node.model,
                    modelService,
                    framingService,
                    ollamaProvider,
                    undefined,
                    () => ollamaProvider.refresh(),
                );
            }
        }),

        vscode.commands.registerCommand(
            'ollamaView.showMoreActions',
            async (node?: OllamaInstanceItem | OllamaModelItem) => {
                if (!node) {
                    return;
                }
                const name = node instanceof OllamaInstanceItem ? node.instance.name : node.model.name;
                const actions = getModelActions();
                const result = await vscode.window.showQuickPick(actions, {
                    placeHolder: `Actions for ${name}`,
                });

                if (result) {
                    vscode.commands.executeCommand(result.command, node);
                }
            },
        ),
    );
}

export function deactivate() { }
