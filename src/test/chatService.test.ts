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

    test('deleteChatsForModel should remove all chats for a specific model/instance', async () => {
        const chats: Chat[] = [
            { id: '1', modelName: 'model-a', name: 'C1', messages: [], createdAt: 1 },
            { id: '2', modelName: 'model-a', name: 'C2', messages: [], createdAt: 2 },
            { id: '3', modelName: 'model-b', name: 'C3', messages: [], createdAt: 3 },
        ];
        mockRepo.getAll.returns(chats);

        await chatService.deleteChatsForModel('model-a');

        assert.ok(
            mockRepo.save.calledWith([{ id: '3', modelName: 'model-b', name: 'C3', messages: [], createdAt: 3 }]),
        );
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
        assert.ok(mockRepo.saveOne.calledOnceWith(chat));
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
        assert.ok(mockRepo.save.calledOnce);
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

    test('importChat should import without collision', async () => {
        const chatData: Chat = {
            id: 'new-id',
            modelName: 'llama3',
            name: 'Imported Chat',
            messages: [],
            createdAt: Date.now(),
        };
        mockRepo.getAll.returns([]);
        
        const imported = await chatService.importChat(chatData, 'abort');
        assert.ok(imported);
        assert.strictEqual(imported?.id, 'new-id');
        assert.strictEqual(imported?.name, 'Imported Chat');
        assert.ok(mockRepo.save.calledOnce);
    });

    test('importChat should overwrite existing on collision when action is overwrite', async () => {
        const existingChat: Chat = {
            id: 'col-id',
            modelName: 'llama3',
            name: 'Existing Chat',
            messages: [],
            createdAt: Date.now(),
        };
        const chatData: Chat = {
            id: 'col-id',
            modelName: 'llama3',
            name: 'Imported Chat',
            messages: [{ role: 'user', content: 'test', timestamp: 123 }],
            createdAt: Date.now(),
        };
        mockRepo.getAll.returns([existingChat]);
        
        const imported = await chatService.importChat(chatData, 'overwrite');
        assert.ok(imported);
        assert.strictEqual(imported?.id, 'col-id');
        assert.strictEqual(imported?.name, 'Imported Chat');
        assert.strictEqual(imported?.messages.length, 1);
        assert.ok(mockRepo.save.calledOnce);
    });

    test('importChat should create new chat on collision when action is new', async () => {
        const existingChat: Chat = {
            id: 'col-id',
            modelName: 'llama3',
            name: 'Chat Name',
            messages: [],
            createdAt: Date.now(),
        };
        const chatData: Chat = {
            id: 'col-id',
            modelName: 'llama3',
            name: 'Chat Name',
            messages: [{ role: 'user', content: 'test', timestamp: 123 }],
            createdAt: Date.now(),
        };
        mockRepo.getAll.returns([existingChat]);
        
        const imported = await chatService.importChat(chatData, 'new');
        assert.ok(imported);
        assert.notStrictEqual(imported?.id, 'col-id');
        assert.strictEqual(imported?.name, 'Chat Name (1)');
        assert.ok(mockRepo.save.calledOnce);
    });

    test('importChat should do nothing on collision when action is abort', async () => {
        const existingChat: Chat = {
            id: 'col-id',
            modelName: 'llama3',
            name: 'Chat Name',
            messages: [],
            createdAt: Date.now(),
        };
        const chatData: Chat = {
            id: 'col-id',
            modelName: 'llama3',
            name: 'Imported Chat',
            messages: [],
            createdAt: Date.now(),
        };
        mockRepo.getAll.returns([existingChat]);
        
        const imported = await chatService.importChat(chatData, 'abort');
        assert.strictEqual(imported, undefined);
        assert.ok(mockRepo.save.notCalled);
    });
});
