import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';

import { Chat, ChatService } from '../chatService';

suite('Chat History Optimizations', () => {
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

        mockContext.globalState.get.returns([mockChat]);

        const chat = chatService.getChat('1');
        assert.ok(chat);
        assert.strictEqual(chat.messages.length, 1000);
    });
});
