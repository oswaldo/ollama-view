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

    test('deleteMessagesFrom should remove subsequent messages', async () => {
        const chat = await chatService.createChat('llama3');
        await chatService.addMessage(chat.id, 'user', 'Msg 1');
        await chatService.addMessage(chat.id, 'assistant', 'Response 1');
        await chatService.addMessage(chat.id, 'user', 'Msg 2');

        // Delete from index 1 (Response 1). Should keep Msg 1 (index 0).
        const updatedChat = await chatService.deleteMessagesFrom(chat.id, 1);

        assert.ok(updatedChat);
        assert.strictEqual(updatedChat!.messages.length, 1);
        assert.strictEqual(updatedChat!.messages[0].content, 'Msg 1');
    });

    test('forkChatFrom should create new chat branch from index', async () => {
        const chat = await chatService.createChat('llama3');
        await chatService.addMessage(chat.id, 'user', 'Msg 1');
        await chatService.addMessage(chat.id, 'assistant', 'Response 1');
        await chatService.addMessage(chat.id, 'user', 'Msg 2');

        // Fork from index 1 (Response 1). Should keep Msg 1 (index 0) in new chat.
        const newChat = await chatService.forkChatFrom(chat.id, 1);

        assert.ok(newChat);
        assert.notStrictEqual(newChat!.id, chat.id);

        assert.strictEqual(newChat!.messages.length, 1);
        assert.strictEqual(newChat!.messages[0].content, 'Msg 1');
    });

    test('getUniqueChatName should handle duplicates', async () => {

        // Create first "New Chat"
        const chat1 = await chatService.createChat('llama3');
        assert.strictEqual(chat1.name, 'New Chat');

        // Create second "New Chat" -> "New Chat (2)"
        const chat2 = await chatService.createChat('llama3');
        assert.strictEqual(chat2.name, 'New Chat (2)');

        // Create third "New Chat" -> "New Chat (3)"
        const chat3 = await chatService.createChat('llama3');
        assert.strictEqual(chat3.name, 'New Chat (3)');
    });

    test('addMessage should rename with unique name', async () => {
        const chat1 = await chatService.createChat('llama3');
        // Rename "New Chat" to "Hello"
        await chatService.addMessage(chat1.id, 'user', 'Hello');
        const updatedChat1 = chatService.getChat(chat1.id);
        assert.strictEqual(updatedChat1?.name, 'Hello');

        const chat2 = await chatService.createChat('llama3'); // "New Chat"
        // Rename "New Chat" to "Hello" -> collision with chat1 -> "Hello (2)"
        await chatService.addMessage(chat2.id, 'user', 'Hello');
        const updatedChat2 = chatService.getChat(chat2.id);
        assert.strictEqual(updatedChat2?.name, 'Hello (2)');
    });

    test('forkChat should use unique name', async () => {
        const chat1 = await chatService.createChat('llama3');
        await chatService.addMessage(chat1.id, 'user', 'Hello'); // name = "Hello"
        await chatService.addMessage(chat1.id, 'assistant', 'Response');

        // Fork -> "Hello" (as content) -> should be "Hello (2)" because "Hello" exists
        const forkedChat = await chatService.forkChat(chat1.id, 2, 'Hello');
        assert.strictEqual(forkedChat?.name, 'Hello (2)');
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

        // Page 2: next 20 messages (60 to 79)
        const page2 = chatService.getPaginatedMessages(chat.id, 20, 20);
        assert.strictEqual(page2.messages.length, 20);
        assert.strictEqual(page2.messages[0].content, 'Msg 60');
        assert.strictEqual(page2.messages[19].content, 'Msg 79');

        // Page 6: last bit (0 to 19) is not right, Page 5 is 0 to 19.
        // offset 80 -> messages 0 to 19
        const page5 = chatService.getPaginatedMessages(chat.id, 20, 80);
        assert.strictEqual(page5.messages.length, 20);
        assert.strictEqual(page5.messages[0].content, 'Msg 0');
        assert.strictEqual(page5.messages[19].content, 'Msg 19');
        
        // Overflow
        const page6 = chatService.getPaginatedMessages(chat.id, 20, 90);
        assert.strictEqual(page6.messages.length, 10);
        assert.strictEqual(page6.messages[0].content, 'Msg 0');
        assert.strictEqual(page6.messages[9].content, 'Msg 9');
    });

    test('getUniqueChatName should handle duplicates with non-numeric suffixes', async () => {
        // Manually create a chat with a non-numeric suffix
        const chats = (mockContext.globalState.get('ollama-view.chats', [])) as Chat[];
        chats.push({ id: '1', name: 'My Chat', modelName: 'llama3', messages: [], createdAt: Date.now() });
        chats.push({ id: '2', name: 'My Chat (Fork)', modelName: 'llama3', messages: [], createdAt: Date.now() });
        await mockContext.globalState.update('ollama-view.chats', chats);

        // Fork the chat with the non-numeric suffix
        const newChat = await chatService.forkChatFrom('2', 0);
        assert.strictEqual(newChat?.name, 'My Chat (Fork) (2)');
    });

    test('truncateChat should not allow empty new content', async () => {
        const chat = await chatService.createChat('llama3');
        await chatService.addMessage(chat.id, 'user', 'Msg 1');

        await chatService.truncateChat(chat.id, 1, '');
        const updatedChat = chatService.getChat(chat.id);
        assert.strictEqual(updatedChat?.messages.length, 1, "Should not add empty message");
    });

    test('forkChat should not allow empty new content', async () => {
        const chat = await chatService.createChat('llama3');
        await chatService.addMessage(chat.id, 'user', 'Msg 1');
        await chatService.addMessage(chat.id, 'assistant', 'Response 1');

        await chatService.forkChat(chat.id, 2, '');
        const updatedChat = chatService.getChat(chat.id); // This will be the original chat
        const newChats = chatService.getChatsForModel('llama3');
        assert.strictEqual(newChats.length, 1, "Should not create a new chat with empty message");
    });
});
