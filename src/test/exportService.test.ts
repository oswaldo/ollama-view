import * as assert from 'assert';

import { Chat } from '../../src/services/chatService';
import { ExportService } from '../../src/services/exportService';

suite('ExportService', () => {
    let exportService: ExportService;

    setup(() => {
        exportService = new ExportService();
    });

    test('toMarkdown should format chat correctly', () => {
        const chat: Chat = {
            id: 'test-id',
            modelName: 'test-model',
            name: 'Test Chat',
            messages: [
                { role: 'system', content: 'You are a helpful assistant.', timestamp: 1000 },
                { role: 'user', content: 'Hello', timestamp: 2000 },
                { role: 'assistant', content: 'Hi there!', timestamp: 3000 }
            ],
            createdAt: 1000,
        };

        const markdown = exportService.toMarkdown(chat);
        
        assert.ok(markdown.includes('# Chat: Test Chat'));
        assert.ok(markdown.includes('**Model:** test-model'));
        assert.ok(markdown.includes('### System'));
        assert.ok(markdown.includes('You are a helpful assistant.'));
        assert.ok(markdown.includes('### User'));
        assert.ok(markdown.includes('Hello'));
        assert.ok(markdown.includes('### Assistant'));
        assert.ok(markdown.includes('Hi there!'));
    });

    test('toJSON should return exact internal representation', () => {
        const chat: Chat = {
            id: 'test-id',
            modelName: 'test-model',
            name: 'Test Chat',
            messages: [
                { role: 'user', content: 'Hello', timestamp: 1000 }
            ],
            createdAt: 1000,
        };

        const json = exportService.toJSON(chat);
        const parsed = JSON.parse(json);
        
        assert.deepStrictEqual(parsed, chat);
    });
});
