/* eslint-disable @typescript-eslint/no-explicit-any */
import * as assert from 'assert';
import { v4 as uuidv4 } from 'uuid';

import { IChatRepository } from '../contracts/IChatRepository';
import { IModelSettingsRepository } from '../contracts/IModelSettingsRepository';
import { ModelInstance } from '../models/modelInstance';
import { OllamaApi } from '../ollamaApi';
import { ChatOrchestrator } from '../services/chatOrchestrator';
import { ChatService } from '../services/chatService';
import { FramingService } from '../services/framingService';
import { ModelService } from '../services/modelService';

/**
 * Integration test for the high-level ChatOrchestrator to verify that
 * UI-driven configuration changes are actually effective during chat.
 */
suite('ChatOrchestrator Integration', function () {
    this.timeout(60000);

    const api = new OllamaApi();
    const BASE_MODEL = 'tinyllama';

    let chatService: ChatService;
    let modelService: ModelService;
    let framingService: FramingService;
    let orchestrator: ChatOrchestrator;

    // Mock Repositories using simple Map-based state
    class MockChatRepo implements IChatRepository {
        private chats = new Map<string, any>();
        getAll() {
            return Array.from(this.chats.values());
        }
        getById(id: string) {
            return this.chats.get(id);
        }
        async save(chats: any[]) {
            chats.forEach((c) => this.chats.set(c.id, c));
        }
        async saveOne(chat: any) {
            this.chats.set(chat.id, chat);
        }
    }

    class MockSettingsRepo implements IModelSettingsRepository {
        private settings: Record<string, ModelInstance> = {};
        getAll() {
            return this.settings;
        }
        async save(settings: Record<string, ModelInstance>) {
            this.settings = settings;
        }
    }

    suiteSetup(async function () {
        try {
            await api.showModel(BASE_MODEL);
        } catch {
            console.log(`Pulling ${BASE_MODEL} for integration test...`);
            await api.pullModel(BASE_MODEL, () => {});
        }

        const chatRepo = new MockChatRepo();
        const settingsRepo = new MockSettingsRepo();

        chatService = new ChatService(chatRepo as any);
        modelService = new ModelService(settingsRepo as any, api, chatService);
        framingService = new FramingService({ extensionUri: { fsPath: '' } } as any); // Minimal mock
        orchestrator = new ChatOrchestrator(chatService, modelService, framingService, api);
    });

    test('should honor num_predict: 1 when chatting through orchestrator (Base Model)', async () => {
        // 1. Configure the primary instance of the base model
        console.log(`Configuring ${BASE_MODEL} with num_predict: 1`);
        await modelService.setSettings(BASE_MODEL, {
            config: { num_predict: 1 },
        });

        // 2. Start a new chat
        const chat = await chatService.createChat(BASE_MODEL);
        await orchestrator.handleUserMessage(chat.id, 'Tell me a long story.');

        // 3. Generate response
        console.log(`Generating response for ${BASE_MODEL}...`);
        let tokens = 0;
        await orchestrator.generateResponse(chat.id, () => {
            tokens++;
        });

        console.log(`Tokens received: ${tokens}`);
        assert.ok(tokens <= 2, `Base model should have honored num_predict: 1, but sent ${tokens} tokens.`);
    });

    test('should honor num_predict: 1 when chatting through orchestrator (Custom Instance)', async () => {
        // 1. Create a custom instance
        const instanceName = `orch-test-${uuidv4().substring(0, 8)}`;
        console.log(`Creating custom instance ${instanceName}`);
        const instance = await modelService.createInstance(BASE_MODEL, instanceName);

        // 2. Configure it
        await modelService.setSettings(instance.id, {
            config: { num_predict: 1 },
        });

        // 3. Start chat
        const chat = await chatService.createChat(instance.id);
        await orchestrator.handleUserMessage(chat.id, 'Write a poem about space.');

        // 4. Generate
        console.log(`Generating response for custom instance ${instance.ollamaModelName}...`);
        let tokens = 0;
        await orchestrator.generateResponse(chat.id, () => {
            tokens++;
        });

        console.log(`Tokens received: ${tokens}`);

        // Cleanup instance immediately
        await modelService.deleteSettings(instance.id);

        assert.ok(tokens <= 2, `Custom instance should have honored num_predict: 1, but sent ${tokens} tokens.`);
    });
});
