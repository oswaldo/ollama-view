import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { ChatService, Chat } from '../chatService';

suite('Chat History Optimizations', () => {
    let sandbox: sinon.SinonSandbox;
    let mockGlobalState: any;
    let mockContext: any;
    let chatService: ChatService;

    setup(() => {
        sandbox = sinon.createSandbox();
        const storage: { [key: string]: any } = {};
        mockGlobalState = {
            get: (key: string, defaultValue?: any) => storage[key] || defaultValue,
            update: async (key: string, value: any) => { storage[key] = value; }
        };
        mockContext = {
            globalState: mockGlobalState
        } as vscode.ExtensionContext;
        chatService = new ChatService(mockContext);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('should handle large chat history', async () => {
        const chat = await chatService.createChat('llama3');
        const messageCount = 1000;
        
        for (let i = 0; i < messageCount; i++) {
            await chatService.addMessage(chat.id, i % 2 === 0 ? 'user' : 'assistant', `Message ${i}`);
        }

        const retrievedChat = chatService.getChat(chat.id);
        assert.strictEqual(retrievedChat?.messages.length, messageCount);
    });
});
