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

    test('addMessage should not update name if not first user message', async () => {
        const chat = await chatService.createChat('llama3');
        await chatService.addMessage(chat.id, 'system', 'System prompt');

        // First user message (technically 2nd message total) - logic says: filter(m => user).length === 1
        await chatService.addMessage(chat.id, 'user', 'User message 1');
        let updatedChat = chatService.getChat(chat.id);
        assert.strictEqual(updatedChat?.name, 'User message 1');

        await chatService.addMessage(chat.id, 'user', 'User message 2');
        updatedChat = chatService.getChat(chat.id);
        assert.strictEqual(updatedChat?.name, 'User message 1'); // Name NOT updated
    });

    test('deleteChat should remove chat', async () => {
        const chat = await chatService.createChat('llama3');
        await chatService.deleteChat(chat.id);

        const found = chatService.getChat(chat.id);
        assert.strictEqual(found, undefined);
    });
});
