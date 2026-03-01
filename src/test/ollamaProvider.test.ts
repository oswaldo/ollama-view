/* eslint-disable @typescript-eslint/no-explicit-any */
import * as assert from 'assert';
import * as sinon from 'sinon';

import { IOllamaClient } from '../contracts/IOllamaClient';
import { ModelInstance } from '../models/modelInstance';
import { OllamaModel } from '../ollamaApi';
import { OllamaModelItem, OllamaProvider } from '../ollamaProvider';
import { ChatService } from '../services/chatService';
import { ModelService } from '../services/modelService';

suite('OllamaProvider Tree Structure', () => {
    let sandbox: sinon.SinonSandbox;
    let mockChatService: sinon.SinonStubbedInstance<ChatService>;
    let mockModelService: sinon.SinonStubbedInstance<ModelService>;
    let mockApi: sinon.SinonStubbedInstance<IOllamaClient>;
    let provider: OllamaProvider;

    setup(() => {
        sandbox = sinon.createSandbox();

        mockChatService = {
            getChatsForModel: sandbox.stub(),
        } as any;
        mockModelService = {
            getInstancesForModel: sandbox.stub(),
            getSettings: sandbox.stub(),
            cleanupOrphanedSettings: sandbox.stub(),
        } as any;
        mockApi = {
            listModels: sandbox.stub(),
            listRunning: sandbox.stub(),
            startModel: sandbox.stub(),
            stopModel: sandbox.stub(),
        } as any;

        provider = new OllamaProvider(mockChatService, mockModelService, mockApi);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('getChildren should return model items at root', async () => {
        const mockModels: OllamaModel[] = [{ name: 'llama3', size: 100, digest: '', modified_at: '' }];
        mockApi.listModels.resolves(mockModels);
        mockApi.listRunning.resolves([]);

        const children = await provider.getChildren();
        assert.strictEqual(children.length, 1);
        assert.strictEqual(children[0].label, 'llama3');
    });

    test('getChildren for model should return instance items', async () => {
        const mockModel: OllamaModel = { name: 'llama3', size: 100, digest: '', modified_at: '' };
        const mockInstance: ModelInstance = {
            id: 'inst1',
            name: 'Instance 1',
            modelName: 'llama3',
            ollamaModelName: 'llama3',
            config: {},
            systemMessage: '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            dataVersion: 2,
        };

        mockModelService.getInstancesForModel.returns([mockInstance]);

        const modelItem = new OllamaModelItem(mockModel);
        const children = await provider.getChildren(modelItem);
        assert.strictEqual(children.length, 1);
        assert.strictEqual(children[0].label, 'Instance 1');
    });
});
