/* eslint-disable @typescript-eslint/no-explicit-any */
import * as assert from 'assert';
import * as sinon from 'sinon';

import { IOllamaClient } from '../contracts/IOllamaClient';
import { OllamaChatItem, OllamaInstanceItem, OllamaModelItem, OllamaProvider } from '../ollamaProvider';
import { ChatService } from '../services/chatService';
import { ModelService } from '../services/modelService';
import { createMockChat, createMockInstance, createMockProviderDeps } from './testUtils';

suite('OllamaProvider Dynamic Tree Structure', () => {
    let sandbox: sinon.SinonSandbox;
    let mockChatService: sinon.SinonStubbedInstance<ChatService>;
    let mockModelService: sinon.SinonStubbedInstance<ModelService>;
    let mockApi: sinon.SinonStubbedInstance<IOllamaClient>;
    let provider: OllamaProvider;

    setup(() => {
        sandbox = sinon.createSandbox();
        const deps = createMockProviderDeps(sandbox);
        mockChatService = deps.mockChatService;
        mockModelService = deps.mockModelService;
        mockApi = deps.mockApi;

        provider = new OllamaProvider(mockChatService as any, mockModelService as any, mockApi as any);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('getChildren should return OllamaInstanceItem at root if model has only one instance', async () => {
        const models = [{ name: 'llama3', size: 1000 }];
        mockApi.listModels.resolves(models as any);
        mockApi.listRunning.resolves([]);

        const instance = createMockInstance({ id: 'llama3', name: 'llama3', modelName: 'llama3', isManaged: false });
        mockModelService.getInstancesForModel.withArgs('llama3').returns([instance]);
        mockModelService.getInstanceByOllamaName.withArgs('llama3').returns(instance);

        const children = await provider.getChildren();

        assert.strictEqual(children.length, 1, 'Should have 1 root child');
        assert.ok(
            children[0] instanceof OllamaInstanceItem,
            'Root child should be OllamaInstanceItem when only 1 instance exists',
        );
        const rootInst = children[0] as OllamaInstanceItem;
        assert.strictEqual(rootInst.instance.name, 'llama3');
        assert.strictEqual(rootInst.isRoot, true, 'Should be marked as root');
        assert.ok(
            rootInst.contextValue?.endsWith('-root'),
            `Context value should end with -root, got: ${rootInst.contextValue}`,
        );
    });

    test('getChildren should return OllamaModelItem at root if model has multiple instances', async () => {
        const models = [{ name: 'llama3', size: 1000 }];
        mockApi.listModels.resolves(models as any);
        mockApi.listRunning.resolves([]);

        const instances = [
            createMockInstance({ id: 'llama3', name: 'llama3', modelName: 'llama3', isManaged: false }),
            createMockInstance({ id: 'custom-id', name: 'Custom Instance', modelName: 'llama3', isManaged: true }),
        ];
        mockModelService.getInstancesForModel.withArgs('llama3').returns(instances);
        mockModelService.getInstanceByOllamaName.withArgs('llama3').returns(instances[0]);

        const children = await provider.getChildren();

        assert.strictEqual(children.length, 1, 'Should have 1 root child');
        assert.ok(
            children[0] instanceof OllamaModelItem,
            'Root child should be OllamaModelItem when multiple instances exist',
        );
        assert.strictEqual((children[0] as OllamaModelItem).model.name, 'llama3');
    });

    test('expanding root OllamaInstanceItem should return chats', async () => {
        const instance = createMockInstance({ id: 'llama3', name: 'llama3', modelName: 'llama3', isManaged: false });
        const instanceItem = new OllamaInstanceItem(instance, false);

        const chats = [createMockChat({ id: 'chat1', name: 'Chat 1' })];
        mockChatService.getChatsForModel.withArgs(instance.id).returns(chats);

        const children = await provider.getChildren(instanceItem);

        assert.strictEqual(children.length, 1);
        assert.ok(children[0] instanceof OllamaChatItem);
        assert.strictEqual(children[0].label, 'Chat 1');
    });

    test('expanding root OllamaModelItem should return OllamaInstanceItems with isRoot=false', async () => {
        const modelItem = new OllamaModelItem({ name: 'llama3', size: 1000 } as any);
        const instances = [
            createMockInstance({ id: 'llama3', name: 'llama3', modelName: 'llama3', isManaged: false }),
            createMockInstance({ id: 'custom-id', name: 'Custom Instance', modelName: 'llama3', isManaged: true }),
        ];
        mockModelService.getInstancesForModel.withArgs('llama3').returns(instances);

        const children = await provider.getChildren(modelItem);

        assert.strictEqual(children.length, 2);
        assert.ok(children[0] instanceof OllamaInstanceItem);
        assert.strictEqual(
            (children[0] as OllamaInstanceItem).isRoot,
            false,
            'Nested instance should not be marked as root',
        );
        assert.ok(children[1] instanceof OllamaInstanceItem);
        assert.strictEqual(
            (children[1] as OllamaInstanceItem).isRoot,
            false,
            'Nested instance should not be marked as root',
        );
        assert.strictEqual((children[0] as OllamaInstanceItem).instance.name, 'llama3');
        assert.strictEqual((children[1] as OllamaInstanceItem).instance.name, 'Custom Instance');
    });
});
