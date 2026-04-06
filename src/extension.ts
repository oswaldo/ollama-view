import * as vscode from 'vscode';

import { ChatCommands } from './commands/chatCommands';
import { registerFramingCommands } from './commands/framingCommands';
import { ModelCommands } from './commands/modelCommands';
import { ProviderCommands } from './commands/providerCommands';
import { IOllamaClient } from './contracts/IOllamaClient';
import { Logger } from './logger';
import { OllamaApi, OllamaModel } from './ollamaApi';
import { OllamaChatItem, OllamaInstanceItem, OllamaModelItem, OllamaProvider } from './ollamaProvider';
import { SetupPanel } from './panels/setupPanel';
import { FramingProvider } from './providers/framingProvider';
import { VscodeChatRepository } from './repositories/VscodeChatRepository';
import { VscodeModelSettingsRepository } from './repositories/VscodeModelSettingsRepository';
import { ChatOrchestrator } from './services/chatOrchestrator';
import { ChatService } from './services/chatService';
import { ExportService } from './services/exportService';
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
    {
        label: '$(sign-in) Import Chat...',
        id: 'importChat',
        command: 'ollamaView.importChat',
        description: 'Import a JSON chat history',
    },
    { label: '$(trash) Delete', id: 'delete', command: 'ollamaView.delete', description: 'Permanently remove model' },
];

const getChatActions = (): ModelAction[] => [
    {
        label: '$(export) Export Chat...',
        id: 'exportChat',
        command: 'ollamaView.exportChat',
        description: 'Export chat history to Markdown or JSON',
    },
    {
        label: '$(trash) Delete Chat',
        id: 'deleteChat',
        command: 'ollamaView.deleteChat',
        description: 'Permanently delete this chat',
    },
];

import { WelcomePanel } from './panels/welcomePanel';
import { getVersionChangeType, VersionChangeType } from './services/welcomeService';

export function activate(context: vscode.ExtensionContext) {
    Logger.init();

    const VERSION_KEY = 'lastSeenVersion';
    const currentVersion = context.extension.packageJSON.version;
    const lastSeenVersion = context.globalState.get<string>(VERSION_KEY);

    const versionChange = getVersionChangeType(currentVersion, lastSeenVersion);

    if (versionChange !== VersionChangeType.None) {
        WelcomePanel.createOrShow(
            context.extensionUri,
            currentVersion,
            versionChange === VersionChangeType.FirstInstall
        );
        context.globalState.update(VERSION_KEY, currentVersion);
    }

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
    const exportService = new ExportService();
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
        exportService,
        context.globalState,
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
        vscode.commands.registerCommand('ollamaView.exportChat', (node: OllamaChatItem) =>
            chatCommands.exportChat(node),
        ),
        vscode.commands.registerCommand('ollamaView.importChat', (arg?: vscode.Uri | OllamaModelItem | OllamaInstanceItem) =>
            chatCommands.importChat(arg),
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
                const api = ollamaProvider.getApi();
                let allModels: OllamaModel[] = [];
                try {
                    allModels = await api.listModels();
                } catch (e) {
                    Logger.error('Failed to list models during setup command', e);
                }

                if (allModels.length === 0) {
                    const setupChoice = await vscode.window.showInformationMessage(
                        'No models found to configure. Would you like to check your connection or pull a model?',
                        'Configure Connection',
                        'Pull Model'
                    );
                    if (setupChoice === 'Configure Connection') {
                        vscode.commands.executeCommand('workbench.action.openSettings', 'ollama-view.apiUrl');
                    } else if (setupChoice === 'Pull Model') {
                        vscode.commands.executeCommand('ollamaView.pull');
                    }
                    return;
                }

                const selectedModelName = await vscode.window.showQuickPick(
                    allModels.map((m) => m.name),
                    { placeHolder: 'Select a model to configure' },
                );

                if (!selectedModelName) {
                    return;
                }

                const model = allModels.find(m => m.name === selectedModelName);
                if (!model) { return; }

                const instances = modelService.getInstancesForModel(selectedModelName);
                let instanceId = instances[0]?.id;

                if (instances.length > 1) {
                    const selectedInst = await vscode.window.showQuickPick(
                        instances.map((i) => ({ label: i.name, id: i.id })),
                        { placeHolder: `Select an instance of ${selectedModelName}` },
                    );
                    if (!selectedInst) {
                        return;
                    }
                    instanceId = selectedInst.id;
                }

                SetupPanel.createOrShow(
                    context.extensionUri,
                    model,
                    modelService,
                    framingService,
                    ollamaProvider,
                    instanceId,
                    () => ollamaProvider.refresh(),
                );
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

        vscode.commands.registerCommand('ollamaView.showWelcome', () => {
            WelcomePanel.createOrShow(context.extensionUri, currentVersion, false);
        }),

        vscode.commands.registerCommand('ollamaView.showMoreActions',
            async (node?: OllamaInstanceItem | OllamaModelItem | OllamaChatItem) => {
                if (!node) {
                    return;
                }
                const isChat = node instanceof OllamaChatItem;
                const name = isChat ? node.chat.name : (node instanceof OllamaInstanceItem ? node.instance.name : node.model.name);
                const actions = isChat ? getChatActions() : getModelActions();
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
