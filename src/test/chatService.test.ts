import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';

import { Chat, ChatService } from '../chatService';

suite('ChatService Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let mockContext: { globalState: { get: sinon.SinonStub; update: sinon.SinonStub } };
    let chatService: ChatService;

    setup(() => {
        sandbox = sinon.createSandbox();
        mockContext = {
            globalState: {
                get: sandbox.stub(),
                update: sandbox.stub().resolves(),
            },
        };
        chatService = new ChatService(mockContext as unknown as vscode.ExtensionContext);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('createChat should create a new chat', async () => {
        mockContext.globalState.get.returns([]);
        const chat = await chatService.createChat('llama3');
        assert.strictEqual(chat.modelName, 'llama3');
        assert.ok(chat.id);
        assert.ok(mockContext.globalState.update.calledOnce);
    });

    test('addMessage should add message and update name', async () => {
        const chat: Chat = {
            id: '1',
            modelName: 'llama3',
            name: 'New Chat',
            messages: [],
            createdAt: Date.now(),
        };
        mockContext.globalState.get.returns([chat]);

        const updated = await chatService.addMessage('1', 'user', 'What is 2+2?');
        assert.strictEqual(updated?.messages.length, 1);
        assert.strictEqual(updated?.name, 'What is 2+2?');
    });

    test('addMessage should not update name if not first user message', async () => {
        const chat: Chat = {
            id: '1',
            modelName: 'llama3',
            name: 'Existing Chat',
            messages: [{ role: 'user', content: 'First', timestamp: Date.now() }],
            createdAt: Date.now(),
        };
        mockContext.globalState.get.returns([chat]);

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
        mockContext.globalState.get.returns([chat]);

        await chatService.deleteChat('1');
        const updateArgs = mockContext.globalState.update.getCall(0).args[1];
        assert.strictEqual(updateArgs.length, 0);
    });

    test('setActiveFraming should update chat activeFramingId', async () => {
        const chat: Chat = {
            id: '1',
            modelName: 'llama3',
            name: 'Chat',
            messages: [],
            createdAt: Date.now(),
        };
        mockContext.globalState.get.returns([chat]);

        await chatService.setActiveFraming('1', 'f1');
        const updatedChats = mockContext.globalState.update.getCall(0).args[1] as Chat[];
        assert.strictEqual(updatedChats[0].activeFramingId, 'f1');
    });

    test('addMessage should include framing metadata', async () => {
        const chat: Chat = {
            id: '1',
            modelName: 'llama3',
            name: 'Chat',
            messages: [],
            createdAt: Date.now(),
        };
        mockContext.globalState.get.returns([chat]);

        await chatService.addMessage('1', 'user', 'Hi', { framingId: 'f1', framingName: 'Framing' });
        const updatedChats = mockContext.globalState.update.getCall(0).args[1] as Chat[];
        assert.strictEqual(updatedChats[0].messages[0].framingId, 'f1');
        assert.strictEqual(updatedChats[0].messages[0].framingName, 'Framing');
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
        mockContext.globalState.get.returns([chat]);

        const updated = await chatService.truncateChat('1', 1, 'New 2');
        assert.strictEqual(updated?.messages.length, 2);
        assert.strictEqual(updated?.messages[1].content, 'New 2');
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
        mockContext.globalState.get.returns([chat]);

        const forked = await chatService.forkChat('1', 1, 'New Fork');
        assert.ok(forked);
        assert.notStrictEqual(forked?.id, '1');
        assert.strictEqual(forked?.messages.length, 2);
        assert.strictEqual(forked?.messages[1].content, 'New Fork');
    });

    test('forkChat should inherit activeFramingId', async () => {
        const chat: Chat = {
            id: '1',
            modelName: 'llama3',
            name: 'Chat',
            messages: [],
            createdAt: Date.now(),
            activeFramingId: 'f1',
        };
        mockContext.globalState.get.returns([chat]);

        const forked = await chatService.forkChat('1', 0, 'New');
        assert.strictEqual(forked?.activeFramingId, 'f1');
    });

    test('deleteMessagesFrom should remove subsequent messages', async () => {
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
        mockContext.globalState.get.returns([chat]);

        const updated = await chatService.deleteMessagesFrom('1', 1);
        assert.strictEqual(updated?.messages.length, 1);
        assert.strictEqual(updated?.messages[0].content, '1');
    });

    test('forkChatFrom should create new chat branch from index', async () => {
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
        mockContext.globalState.get.returns([chat]);

        const forked = await chatService.forkChatFrom('1', 1);
        assert.ok(forked);
        assert.strictEqual(forked?.messages.length, 1);
        assert.strictEqual(forked?.messages[0].content, '1');
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
        mockContext.globalState.get.returns([chat]);

        const page = chatService.getPaginatedMessages('1', 5, 0);
        assert.strictEqual(page.messages.length, 5);
        assert.strictEqual(page.messages[4].content, '9');
        assert.strictEqual(page.total, 10);

        const page2 = chatService.getPaginatedMessages('1', 5, 5);
        assert.strictEqual(page2.messages.length, 5);
        assert.strictEqual(page2.messages[4].content, '4');
    });
});
