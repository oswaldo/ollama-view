/* eslint-disable @typescript-eslint/no-explicit-any */
import * as assert from 'assert';
import * as sinon from 'sinon';

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
        } as any;
        mockModelService = {
            getSettings: sandbox.stub(),
        } as any;
        mockFramingService = {
            getFraming: sandbox.stub(),
        } as any;
        mockOllamaClient = {
            chat: sandbox.stub().resolves(),
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

        assert.strictEqual(options!.seed, 123);
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
});
