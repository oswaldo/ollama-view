/* eslint-disable @typescript-eslint/no-explicit-any */
import * as assert from 'assert';
import * as sinon from 'sinon';

import { IChatRepository } from '../contracts/IChatRepository';
import { Chat, ChatService } from '../services/chatService';

suite('ChatService Test Suite', () => {
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

    test('createChat should create a new chat', async () => {
        mockRepo.getAll.returns([]);
        const chat = await chatService.createChat('llama3');
        assert.strictEqual(chat.modelName, 'llama3');
        assert.ok(chat.id);
        assert.ok(mockRepo.save.calledOnce);
    });

    test('addMessage should add message and update name', async () => {
        const chat: Chat = {
            id: '1',
            modelName: 'llama3',
            name: 'New Chat',
            messages: [],
            createdAt: Date.now(),
        };
        mockRepo.getById.withArgs('1').returns(chat);
        mockRepo.getAll.returns([chat]);

        const updated = await chatService.addMessage('1', 'user', 'What is 2+2?');
        assert.strictEqual(updated?.messages.length, 1);
        assert.strictEqual(updated?.name, 'What is 2+2?');
        assert.ok(mockRepo.saveOne.calledWith(chat));
    });

    test('addMessage should not update name if not first user message', async () => {
        const chat: Chat = {
            id: '1',
            modelName: 'llama3',
            name: 'Existing Chat',
            messages: [{ role: 'user', content: 'First', timestamp: Date.now() }],
            createdAt: Date.now(),
        };
        mockRepo.getById.withArgs('1').returns(chat);

        const updated = await chatService.addMessage('1', 'user', 'Second');
        assert.strictEqual(updated?.name, 'Existing Chat');
    });

    test('deleteChat should remove chat', async () => {
        const chat: Chat = {
            id: '1',
            modelName: 'llama3',
            name: 'Chat',
            messages: [],
            createdAt: Date.now(),
        };
        mockRepo.getAll.returns([chat]);

        await chatService.deleteChat('1');
        assert.ok(mockRepo.save.calledWith([]));
    });

    test('setActiveFraming should update chat activeFramingId', async () => {
        const chat: Chat = {
            id: '1',
            modelName: 'llama3',
            name: 'Chat',
            messages: [],
            createdAt: Date.now(),
        };
        mockRepo.getById.withArgs('1').returns(chat);

        await chatService.setActiveFraming('1', 'f1');
        assert.strictEqual(chat.activeFramingId, 'f1');
        assert.ok(mockRepo.saveOne.calledWith(chat));
    });

    test('truncateChat should truncate and update chat', async () => {
        const chat: Chat = {
            id: '1',
            modelName: 'llama3',
            name: 'Chat',
            messages: [
                { role: 'user', content: '1', timestamp: Date.now() },
                { role: 'assistant', content: '2', timestamp: Date.now() },
                { role: 'user', content: '3', timestamp: Date.now() },
            ],
            createdAt: Date.now(),
        };
        mockRepo.getById.withArgs('1').returns(chat);

        const updated = await chatService.truncateChat('1', 1, 'New 2');
        assert.strictEqual(updated?.messages.length, 2);
        assert.strictEqual(updated?.messages[1].content, 'New 2');
        assert.ok(mockRepo.saveOne.calledWith(chat));
    });

    test('forkChat should create new chat branch', async () => {
        const chat: Chat = {
            id: '1',
            modelName: 'llama3',
            name: 'Chat',
            messages: [
                { role: 'user', content: '1', timestamp: Date.now() },
                { role: 'assistant', content: '2', timestamp: Date.now() },
            ],
            createdAt: Date.now(),
        };
        mockRepo.getById.withArgs('1').returns(chat);
        mockRepo.getAll.returns([chat]);

        const forked = await chatService.forkChat('1', 1, 'New Fork');
        assert.ok(forked);
        assert.notStrictEqual(forked?.id, '1');
        assert.strictEqual(forked?.messages.length, 2);
        assert.strictEqual(forked?.messages[1].content, 'New Fork');
        assert.ok(mockRepo.save.calledTwice); // Once for original, once for new (but getAll was called)
    });

    test('getPaginatedMessages should return correct slice', () => {
        const chat: Chat = {
            id: '1',
            modelName: 'model',
            name: 'Chat',
            messages: Array.from({ length: 10 }, (_, i) => ({
                role: 'user' as const,
                content: `${i}`,
                timestamp: Date.now(),
            })),
            createdAt: Date.now(),
        };
        mockRepo.getById.withArgs('1').returns(chat);

        const page = chatService.getPaginatedMessages('1', 5, 0);
        assert.strictEqual(page.messages.length, 5);
        assert.strictEqual(page.messages[4].content, '9');
        assert.strictEqual(page.total, 10);
    });
});
