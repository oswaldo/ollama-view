import * as assert from 'assert';
import * as sinon from 'sinon';

import { ChatService } from '../chatService';
import { ModelInstance } from '../models/modelInstance';
import { ModelSettingsService } from '../modelSettingsService';
import { OllamaModel, OllamaProcess } from '../ollamaApi';
import { OllamaModelItem, OllamaProvider } from '../ollamaProvider';

suite('OllamaProvider Tree Structure', () => {
    let sandbox: sinon.SinonSandbox;
    let mockChatService: sinon.SinonStubbedInstance<ChatService>;
    let mockModelSettingsService: sinon.SinonStubbedInstance<ModelSettingsService>;
    let provider: OllamaProvider;

    setup(() => {
        sandbox = sinon.createSandbox();

        mockChatService = sandbox.createStubInstance(ChatService);
        mockModelSettingsService = sandbox.createStubInstance(ModelSettingsService);

        provider = new OllamaProvider(
            mockChatService as unknown as ChatService,
            mockModelSettingsService as unknown as ModelSettingsService,
        );
    });

    teardown(() => {
        sandbox.restore();
    });

    test('getChildren should return model items at root', async () => {
        const api = provider.getApi();
        const mockModels: OllamaModel[] = [{ name: 'llama3', size: 100, digest: '', modified_at: '' }];
        sandbox.stub(api, 'listModels').resolves(mockModels);
        sandbox.stub(api, 'listRunning').resolves([] as OllamaProcess[]);

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
        };

        mockModelSettingsService.getInstancesForModel.returns([mockInstance]);

        const modelItem = new OllamaModelItem(mockModel);
        const children = await provider.getChildren(modelItem);
        assert.strictEqual(children.length, 1);
        assert.strictEqual(children[0].label, 'Instance 1');
    });
});
