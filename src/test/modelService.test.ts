/* eslint-disable @typescript-eslint/no-explicit-any */
import * as assert from 'assert';
import * as sinon from 'sinon';

import { IModelSettingsRepository } from '../contracts/IModelSettingsRepository';
import { IOllamaClient } from '../contracts/IOllamaClient';
import { ModelInstance } from '../models/modelInstance';
import { ChatService } from '../services/chatService';
import { ModelService } from '../services/modelService';
import { createMockInstance } from './testUtils';

suite('ModelService Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let mockRepo: sinon.SinonStubbedInstance<IModelSettingsRepository>;
    let mockApi: sinon.SinonStubbedInstance<IOllamaClient>;
    let mockChatService: sinon.SinonStubbedInstance<ChatService>;
    let modelService: ModelService;

    setup(() => {
        sandbox = sinon.createSandbox();
        mockRepo = {
            getAll: sandbox.stub(),
            save: sandbox.stub().resolves(),
        } as any;
        mockApi = {
            listModels: sandbox.stub(),
            listRunning: sandbox.stub(),
            startModel: sandbox.stub().resolves(),
            stopModel: sandbox.stub().resolves(),
            deleteModel: sandbox.stub().resolves(),
            createModel: sandbox.stub().resolves(),
            chat: sandbox.stub().resolves(),
        } as any;
        mockChatService = {
            deleteChatsForModel: sandbox.stub().resolves(),
            getChatsForModel: sandbox.stub().returns([]),
        } as any;
        modelService = new ModelService(mockRepo, mockApi, mockChatService as any);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('getSettings should return default instance if not found', () => {
        mockRepo.getAll.returns({});
        const settings = modelService.getSettings('llama3');
        assert.strictEqual(settings.name, 'llama3');
        assert.strictEqual(settings.modelName, 'llama3');
        assert.strictEqual(settings.systemMessage, ModelService.DEFAULT_SYSTEM_MESSAGE);
    });

    test('getSettings should migrate legacy settings', () => {
        const legacy = { systemMessage: 'Custom System' };
        mockRepo.getAll.returns({ llama3: legacy as any });
        const settings = modelService.getSettings('llama3');
        assert.strictEqual(settings.id, 'llama3');
        assert.strictEqual(settings.systemMessage, 'Custom System');
        assert.strictEqual(settings.dataVersion, ModelService.CURRENT_VERSION);
        assert.strictEqual(settings.isManaged, false);
    });

    test('setSettings should save settings and sync with Ollama if managed', async () => {
        const existing = createMockInstance({
            id: '1',
            ollamaModelName: 'llama3-instance',
            isManaged: true
        });
        mockRepo.getAll.returns({ '1': existing });

        await modelService.setSettings('1', { systemMessage: 'New System' });

        assert.ok(mockRepo.save.calledOnce);
        assert.ok(mockApi.createModel.calledOnce);
        const updateArgs = mockRepo.save.getCall(0).args[0] as Record<string, ModelInstance>;
        assert.strictEqual(updateArgs['1'].systemMessage, 'New System');
    });

    test('createInstance should create and sync new model', async () => {
        mockRepo.getAll.returns({});
        const instance = await modelService.createInstance('llama3', 'New Experiment');

        assert.strictEqual(instance.name, 'New Experiment');
        assert.strictEqual(instance.modelName, 'llama3');
        assert.strictEqual(instance.isManaged, true);
        assert.ok(instance.ollamaModelName?.startsWith('llama3-new-experiment'));
        assert.ok(mockApi.createModel.calledOnce);
        assert.ok(mockRepo.save.calledOnce);
    });

    test('deleteSettings should delete from Ollama if managed and cascade chats', async () => {
        const managed = createMockInstance({
            id: '1',
            ollamaModelName: 'llama3-managed',
            isManaged: true
        });
        mockRepo.getAll.returns({ '1': managed });

        await modelService.deleteSettings('1');

        assert.ok(mockApi.deleteModel.calledWith('llama3-managed'));
        assert.ok(mockChatService.deleteChatsForModel.calledWith('1'));
        assert.ok(mockRepo.save.calledOnce);
    });

    test('cleanupOrphanedSettings should cascade delete chats', async () => {
        const orphaned = createMockInstance({
            id: 'orphaned-1',
            modelName: 'missing-model'
        });
        mockRepo.getAll.returns({ 'orphaned-1': orphaned });

        await modelService.cleanupOrphanedSettings(['other-model']);

        assert.ok(mockChatService.deleteChatsForModel.calledWith('orphaned-1'));
        assert.ok(mockRepo.save.calledOnce);
    });

    test('getInstanceByOllamaName should find instance by name or tag', () => {
        const primary = createMockInstance({ id: 'llama3', modelName: 'llama3', isManaged: false });
        const custom = createMockInstance({ id: 'custom-id', ollamaModelName: 'llama3-custom', isManaged: true });
        
        mockRepo.getAll.returns({ 
            'llama3': primary,
            'custom-id': custom 
        });

        // Match primary
        assert.strictEqual(modelService.getInstanceByOllamaName('llama3')?.id, 'llama3');
        assert.strictEqual(modelService.getInstanceByOllamaName('llama3:latest')?.id, 'llama3');

        // Match custom
        assert.strictEqual(modelService.getInstanceByOllamaName('llama3-custom')?.id, 'custom-id');
        assert.strictEqual(modelService.getInstanceByOllamaName('llama3-custom:latest')?.id, 'custom-id');

        // No match
        assert.strictEqual(modelService.getInstanceByOllamaName('non-existent'), undefined);
    });
});
