/* eslint-disable @typescript-eslint/no-explicit-any */
import * as assert from 'assert';
import * as sinon from 'sinon';

import { IChatRepository } from '../contracts/IChatRepository';
import { Chat, ChatService } from '../services/chatService';

suite('Chat History Optimizations', () => {
    let sandbox: sinon.SinonSandbox;
    let mockRepo: sinon.SinonStubbedInstance<IChatRepository>;
    let chatService: ChatService;

    setup(() => {
        sandbox = sinon.createSandbox();
        mockRepo = {
            getAll: sandbox.stub(),
            getById: sandbox.stub(),
            save: sandbox.stub().resolves(),
            saveOne: sandbox.stub().resolves(),
        } as any;
        chatService = new ChatService(mockRepo);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('should handle large chat history', async () => {
        const largeMessages = Array.from({ length: 1000 }, (_, i) => ({
            role: 'user' as const,
            content: `Message ${i}`,
            timestamp: Date.now(),
        }));

        const mockChat: Chat = {
            id: '1',
            modelName: 'model',
            name: 'Large Chat',
            messages: largeMessages,
            createdAt: Date.now(),
        };

        mockRepo.getById.withArgs('1').returns(mockChat);

        const chat = chatService.getChat('1');
        assert.ok(chat);
        assert.strictEqual(chat.messages.length, 1000);
    });
});
