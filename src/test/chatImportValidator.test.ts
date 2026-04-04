import * as assert from 'assert';

import { validateChatImport } from '../chatImportValidator';

suite('ChatImportValidator Test Suite', () => {
    test('should return fatal error for invalid JSON string', () => {
        const result = validateChatImport('{ invalid }');
        assert.strictEqual(result.chat, null);
        assert.strictEqual(result.errors.length, 1);
        assert.ok(result.errors[0].includes('Invalid JSON format'));
    });

    test('should return fatal error if not an object', () => {
        const result = validateChatImport('["not an object"]');
        assert.strictEqual(result.chat, null);
        assert.strictEqual(result.errors.length, 1);
        assert.ok(result.errors[0].includes('Root element must be a JSON object'));
    });

    test('should return fatal error if messages is missing or not array', () => {
        const result = validateChatImport('{"id": "123", "name": "Test"}');
        assert.strictEqual(result.chat, null);
        assert.strictEqual(result.errors.length, 1);
        assert.ok(result.errors[0].includes('Missing or invalid "messages" array'));
    });

    test('should parse valid chat with no warnings', () => {
        const json = JSON.stringify({
            id: '123',
            modelName: 'llama3',
            name: 'Valid Chat',
            createdAt: 1000,
            messages: [
                { role: 'user', content: 'hello', timestamp: 1000 }
            ]
        });
        const result = validateChatImport(json);
        assert.ok(result.chat);
        assert.strictEqual(result.errors.length, 0);
        assert.strictEqual(result.warnings.length, 0);
        assert.strictEqual(result.chat?.id, '123');
        assert.strictEqual(result.chat?.messages.length, 1);
    });

    test('should perform best-effort parsing and generate warnings for missing fields', () => {
        const json = JSON.stringify({
            messages: [
                { role: 'user', content: 'hello' } // missing timestamp
            ]
        });
        const result = validateChatImport(json);
        assert.ok(result.chat);
        assert.strictEqual(result.errors.length, 0);
        assert.ok(result.warnings.length > 0);
        
        assert.ok(result.chat?.id); // auto-generated
        assert.strictEqual(result.chat?.name, 'Imported Chat');
        assert.strictEqual(result.chat?.modelName, 'unknown');
        assert.ok(result.chat?.createdAt);
        assert.ok(result.chat?.messages[0].timestamp); // auto-generated
    });

    test('should skip invalid messages and generate warnings', () => {
        const json = JSON.stringify({
            id: '123',
            modelName: 'llama3',
            name: 'Valid Chat',
            createdAt: 1000,
            messages: [
                { role: 'user', content: 'hello', timestamp: 1000 },
                { content: 'missing role' },
                { role: 'user' }, // missing content
                { role: 'invalid_role', content: 'hi' }
            ]
        });
        const result = validateChatImport(json);
        assert.ok(result.chat);
        assert.strictEqual(result.chat?.messages.length, 1);
        assert.strictEqual(result.warnings.length, 3);
        assert.ok(result.warnings[0].includes('Message at index 1 skipped: Missing role or content'));
        assert.ok(result.warnings[1].includes('Message at index 2 skipped: Missing role or content'));
        assert.ok(result.warnings[2].includes('Message at index 3 skipped: Invalid role'));
    });
});