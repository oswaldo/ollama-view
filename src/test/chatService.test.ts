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
    test('truncateChat should truncate and update chat', async () => {
        const chat = await chatService.createChat('llama3');
        await chatService.addMessage(chat.id, 'user', 'Msg 1');
        await chatService.addMessage(chat.id, 'assistant', 'Response 1');
        await chatService.addMessage(chat.id, 'user', 'Msg 2');
        await chatService.addMessage(chat.id, 'assistant', 'Response 2');

        // Edit "Msg 2" (index 2) -> "Msg 2 Edited"
        // This should keep Msg 1, Response 1, and add Msg 2 Edited. Response 2 should be gone.
        const updatedChat = await chatService.truncateChat(chat.id, 2, 'Msg 2 Edited');

        assert.ok(updatedChat);
        assert.strictEqual(updatedChat!.messages.length, 3);
        assert.strictEqual(updatedChat!.messages[2].content, 'Msg 2 Edited');
        assert.strictEqual(updatedChat!.messages[0].content, 'Msg 1');
    });

    test('forkChat should create new chat branch', async () => {
        const chat = await chatService.createChat('llama3');
        await chatService.addMessage(chat.id, 'user', 'Msg 1');
        await chatService.addMessage(chat.id, 'assistant', 'Response 1');
        await chatService.addMessage(chat.id, 'user', 'Msg 2');

        // Fork at "Msg 2" (index 2) -> "Msg 2 Forked"
        const newChat = await chatService.forkChat(chat.id, 2, 'Msg 2 Forked');

        assert.ok(newChat);
        assert.notStrictEqual(newChat!.id, chat.id);

        // New chat should have Msg 1, Response 1, Msg 2 Forked
        assert.strictEqual(newChat!.messages.length, 3);
        assert.strictEqual(newChat!.messages[2].content, 'Msg 2 Forked');
        assert.strictEqual(newChat!.messages[0].content, 'Msg 1');

        // Original chat should be unchanged
        const originalChat = chatService.getChat(chat.id);
        assert.strictEqual(originalChat!.messages.length, 3);
        assert.strictEqual(originalChat!.messages[2].content, 'Msg 2');
    });
});
