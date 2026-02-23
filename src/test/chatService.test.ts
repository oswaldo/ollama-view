import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { ChatService, Chat } from '../chatService';

suite('ChatService Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let mockGlobalState: any;
    let mockContext: any;
    let chatService: ChatService;

    setup(() => {
        sandbox = sinon.createSandbox();

        // Mock globalState (Memento)
        const storage: { [key: string]: any } = {};
        mockGlobalState = {
            get: (key: string, defaultValue?: any) => storage[key] || defaultValue,
            update: async (key: string, value: any) => { storage[key] = value; }
        };

        // Mock ExtensionContext
        mockContext = {
            globalState: mockGlobalState
        } as vscode.ExtensionContext;

        chatService = new ChatService(mockContext);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('setActiveFraming should update chat activeFramingId', async () => {
        const chat = await chatService.createChat('llama3');
        await chatService.setActiveFraming(chat.id, 'f1');
        
        const updatedChat = chatService.getChat(chat.id);
        assert.strictEqual(updatedChat?.activeFramingId, 'f1');
    });

    test('addMessage should include framing metadata', async () => {
        const chat = await chatService.createChat('llama3');
        await chatService.addMessage(chat.id, 'user', 'Hello', { framingId: 'f1', framingName: 'Framing 1' });

        const updatedChat = chatService.getChat(chat.id);
        assert.strictEqual(updatedChat?.messages[0].framingId, 'f1');
        assert.strictEqual(updatedChat?.messages[0].framingName, 'Framing 1');
    });

    test('forkChat should inherit activeFramingId', async () => {
        const chat = await chatService.createChat('llama3');
        await chatService.setActiveFraming(chat.id, 'f1');
        await chatService.addMessage(chat.id, 'user', 'Msg 1');

        const forkedChat = await chatService.forkChat(chat.id, 1, 'Msg 1 forked');
        assert.strictEqual(forkedChat?.activeFramingId, 'f1');
    });

    test('createChat should create a new chat', async () => {
        const chat = await chatService.createChat('llama3');
        assert.ok(chat.id, 'Chat should have an ID');
        assert.strictEqual(chat.modelName, 'llama3');
        assert.strictEqual(chat.name, 'New Chat');
        assert.strictEqual(chat.messages.length, 0);

        const chats = chatService.getChatsForModel('llama3');
        assert.strictEqual(chats.length, 1);
        assert.strictEqual(chats[0].id, chat.id);
    });

    test('addMessage should add message and update name', async () => {
        const chat = await chatService.createChat('llama3');

        // Add user message (should update name)
        await chatService.addMessage(chat.id, 'user', 'Hello world');

        const updatedChat = chatService.getChat(chat.id);
        assert.strictEqual(updatedChat?.messages.length, 1);
        assert.strictEqual(updatedChat?.messages[0].content, 'Hello world');
        assert.strictEqual(updatedChat?.name, 'Hello world'); // Name updated
    });

    test('deleteChat should remove chat', async () => {
        const chat = await chatService.createChat('llama3');
        await chatService.deleteChat(chat.id);

        const found = chatService.getChat(chat.id);
        assert.strictEqual(found, undefined);
    });

    test('getPaginatedMessages should return correct slice', async () => {
        const chat = await chatService.createChat('llama3');
        for (let i = 0; i < 100; i++) {
            await chatService.addMessage(chat.id, 'user', `Msg ${i}`);
        }

        // Page 1: last 20 messages (80 to 99)
        const page1 = chatService.getPaginatedMessages(chat.id, 20, 0);
        assert.strictEqual(page1.messages.length, 20);
        assert.strictEqual(page1.total, 100);
        assert.strictEqual(page1.messages[0].content, 'Msg 80');
        assert.strictEqual(page1.messages[19].content, 'Msg 99');
    });
});
