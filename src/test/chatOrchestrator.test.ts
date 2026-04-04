/* eslint-disable @typescript-eslint/no-explicit-any */
import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';

import { IOllamaClient } from '../contracts/IOllamaClient';
import { ModelInstance } from '../models/modelInstance';
import { ChatOrchestrator } from '../services/chatOrchestrator';
import { Chat, ChatService } from '../services/chatService';
import { FramingService } from '../services/framingService';
import { ModelService } from '../services/modelService';

suite('ChatOrchestrator Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let mockChatService: sinon.SinonStubbedInstance<ChatService>;
    let mockModelService: sinon.SinonStubbedInstance<ModelService>;
    let mockFramingService: sinon.SinonStubbedInstance<FramingService>;
    let mockOllamaClient: sinon.SinonStubbedInstance<IOllamaClient>;
    let orchestrator: ChatOrchestrator;

    setup(() => {
        sandbox = sinon.createSandbox();
        mockChatService = {
            getChat: sandbox.stub(),
            addMessage: sandbox.stub().resolves(),
            importChat: sandbox.stub().resolves(),
        } as any;
        mockModelService = {
            getSettings: sandbox.stub(),
        } as any;
        mockFramingService = {
            getFraming: sandbox.stub(),
        } as any;
        mockOllamaClient = {
            chat: sandbox.stub().resolves(),
            listModels: sandbox.stub().resolves([]),
            pullModel: sandbox.stub().resolves(),
        } as any;

        orchestrator = new ChatOrchestrator(mockChatService, mockModelService, mockFramingService, mockOllamaClient);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('generateResponse should correctly format messages with framing', async () => {
        const mockChat: Chat = {
            id: 'c1',
            modelName: 'm1',
            name: 'Chat',
            messages: [
                {
                    role: 'user',
                    content: 'Hello',
                    timestamp: 0,
                    userPrefix: 'PRE:',
                    userSuffix: ':SUF',
                    systemTurnPrefix: 'SYS_PRE',
                    systemTurnSuffix: 'SYS_SUF',
                },
            ],
            createdAt: 0,
        };

        mockChatService.getChat.returns(mockChat);
        mockModelService.getSettings.returns({
            id: 'inst1',
            name: 'Inst',
            modelName: 'm1',
            ollamaModelName: 'm1',
            config: { seed: 123 },
            systemMessage: '',
            createdAt: 0,
            updatedAt: 0,
            dataVersion: 2,
        } as ModelInstance);

        const tokens: string[] = [];
        await orchestrator.generateResponse('c1', (t) => tokens.push(t));

        assert.ok(mockOllamaClient.chat.calledOnce);
        const [, , , options] = mockOllamaClient.chat.getCall(0).args;

        if (!options) {
            assert.fail('Options should be defined');
        }
        assert.strictEqual(options.seed, 123);
        const messages = mockOllamaClient.chat.getCall(0).args[1];
        assert.strictEqual(messages.length, 3);
        assert.strictEqual(messages[0].content, 'SYS_PRE');
        assert.strictEqual(messages[1].content, 'PRE:Hello:SUF');
        assert.strictEqual(messages[2].content, 'SYS_SUF');
    });

    test('handleUserMessage should add system prompt if needed', async () => {
        const mockChat: Chat = {
            id: 'c1',
            modelName: 'm1',
            name: 'Chat',
            messages: [],
            createdAt: 0,
        };
        mockChatService.getChat.returns(mockChat);
        mockModelService.getSettings.returns({
            id: 'inst1',
            systemMessage: 'Default System',
            name: 'Inst',
            modelName: 'm1',
            ollamaModelName: 'm1',
            config: {},
            createdAt: 0,
            updatedAt: 0,
            dataVersion: 2,
        } as ModelInstance);

        await orchestrator.handleUserMessage('c1', 'Hi');

        assert.ok(mockChatService.addMessage.calledTwice);
        assert.strictEqual(mockChatService.addMessage.getCall(0).args[1], 'system');
        assert.strictEqual(mockChatService.addMessage.getCall(0).args[2], 'Default System');
        assert.strictEqual(mockChatService.addMessage.getCall(1).args[1], 'user');
        assert.strictEqual(mockChatService.addMessage.getCall(1).args[2], 'Hi');
    });

    suite('handleChatImport', () => {
        const validChatJson = JSON.stringify({
            id: 'import-id',
            modelName: 'llama3',
            name: 'Imported Chat',
            createdAt: 1000,
            messages: [{ role: 'user', content: 'test', timestamp: 1000 }],
        });

        let showErrorMessageStub: sinon.SinonStub;
        let showWarningMessageStub: sinon.SinonStub;
        let showInformationMessageStub: sinon.SinonStub;

        setup(() => {
            showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves();
            showWarningMessageStub = sandbox.stub(vscode.window, 'showWarningMessage').resolves();
            showInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves();
            sandbox.stub(vscode.window, 'withProgress').callsFake(async (_opts: any, task: any) => {
                return await task({ report: () => {} });
            });
            mockOllamaClient.listModels.resolves([{ name: 'llama3' } as any]);
            mockChatService.importChat.resolves();
            mockChatService.getChat.returns(undefined);
        });

        test('should reject invalid JSON and show error', async () => {
            const result = await orchestrator.handleChatImport('{ invalid }');
            assert.strictEqual(result, undefined);
            assert.ok(showErrorMessageStub.calledOnce);
            assert.ok(mockChatService.importChat.notCalled);
        });

        test('should show warnings and ask to proceed, returning undefined if aborted', async () => {
            const warningJson = JSON.stringify({
                id: '1',
                modelName: 'llama3',
                name: 'Warn',
                messages: [{ role: 'user', content: 'hello' }], // missing timestamp
            });
            showWarningMessageStub.resolves('Abort' as any); // Simulate user clicking Abort
            
            const result = await orchestrator.handleChatImport(warningJson);
            assert.strictEqual(result, undefined);
            assert.ok(showWarningMessageStub.calledOnce);
            assert.ok(mockChatService.importChat.notCalled);
        });

        test('should proceed with warnings if user accepts', async () => {
            const warningJson = JSON.stringify({
                id: '1',
                modelName: 'llama3',
                name: 'Warn',
                messages: [{ role: 'user', content: 'hello' }],
            });
            showWarningMessageStub.resolves('Proceed (Best Effort)' as any);
            mockChatService.importChat.resolves({ id: '1' } as any);
            
            const result = await orchestrator.handleChatImport(warningJson);
            assert.ok(result);
            assert.ok(showWarningMessageStub.calledOnce);
            assert.ok(mockChatService.importChat.calledOnce);
        });

        test('should handle collision by asking user (Overwrite)', async () => {
            mockChatService.getChat.returns({ id: 'import-id' } as any); // Exists!
            showInformationMessageStub.resolves('Overwrite' as any);
            mockChatService.importChat.resolves({ id: 'import-id' } as any);

            const result = await orchestrator.handleChatImport(validChatJson);
            assert.ok(result);
            assert.ok(showInformationMessageStub.calledOnce);
            assert.strictEqual(mockChatService.importChat.getCall(0).args[1], 'overwrite');
        });

        test('should handle collision by asking user (Import as New)', async () => {
            mockChatService.getChat.returns({ id: 'import-id' } as any);
            showInformationMessageStub.resolves('Import as New' as any);
            mockChatService.importChat.resolves({ id: 'new-id' } as any);

            const result = await orchestrator.handleChatImport(validChatJson);
            assert.ok(result);
            assert.ok(showInformationMessageStub.calledOnce);
            assert.strictEqual(mockChatService.importChat.getCall(0).args[1], 'new');
        });

        test('should abort on collision if user cancels', async () => {
            mockChatService.getChat.returns({ id: 'import-id' } as any);
            showInformationMessageStub.resolves('Cancel' as any);

            const result = await orchestrator.handleChatImport(validChatJson);
            assert.strictEqual(result, undefined);
            assert.ok(showInformationMessageStub.calledOnce);
            assert.ok(mockChatService.importChat.notCalled);
        });

        test('should bind to target model if provided', async () => {
            await orchestrator.handleChatImport(validChatJson, 'target-model');
            assert.ok(mockChatService.importChat.calledOnce);
            const importedChat = mockChatService.importChat.getCall(0).args[0];
            assert.strictEqual(importedChat.modelName, 'target-model');
        });

        test('should prompt to download if model is missing locally', async () => {
            mockOllamaClient.listModels.resolves([{ name: 'other' } as any]); // llama3 missing
            showInformationMessageStub.resolves('Download & Import' as any);
            (mockOllamaClient.pullModel as sinon.SinonStub).resetHistory();
            
            await orchestrator.handleChatImport(validChatJson);
            
            assert.ok(showInformationMessageStub.calledOnce);
            assert.ok((mockOllamaClient.pullModel as sinon.SinonStub).calledOnce);
            assert.ok(mockChatService.importChat.calledOnce);
        });

        test('should import anyway if model is missing and user selects Import Anyway', async () => {
            mockOllamaClient.listModels.resolves([{ name: 'other' } as any]);
            showInformationMessageStub.resolves('Import Anyway' as any);
            (mockOllamaClient.pullModel as sinon.SinonStub).resetHistory();
            
            await orchestrator.handleChatImport(validChatJson);
            
            assert.ok(showInformationMessageStub.calledOnce);
            assert.ok((mockOllamaClient.pullModel as sinon.SinonStub).notCalled);
            assert.ok(mockChatService.importChat.calledOnce);
        });
    });
});

