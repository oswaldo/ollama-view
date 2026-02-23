import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { FramingService } from '../services/framingService';
import { FramingSource } from '../models/modelFraming';

suite('FramingService Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let mockGlobalState: any;
    let mockContext: any;
    let framingService: FramingService;

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

        framingService = new FramingService(mockContext);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('getAllFramings should return built-in framings initially', () => {
        const framings = framingService.getAllFramings();
        assert.ok(framings.length >= 3, 'Should have at least 3 built-in framings');
        assert.ok(framings.every(f => f.source === FramingSource.BuiltIn), 'Initial framings should be built-in');
    });

    test('createFraming should add a new user framing', async () => {
        const newFraming = await framingService.createFraming({
            name: 'Test Framing',
            systemMessage: 'Test Content',
            tags: ['Test']
        });

        assert.strictEqual(newFraming.name, 'Test Framing');
        assert.strictEqual(newFraming.source, FramingSource.User);
        
        const allFramings = framingService.getAllFramings();
        assert.ok(allFramings.find(f => f.id === newFraming.id), 'Framing should be in all framings');
    });

    test('updateFraming should modify user framing', async () => {
        const framing = await framingService.createFraming({ name: 'Old Name' });
        const updated = await framingService.updateFraming(framing.id, { name: 'New Name' });

        assert.ok(updated);
        assert.strictEqual(updated!.name, 'New Name');
        
        const found = framingService.getFraming(framing.id);
        assert.strictEqual(found?.name, 'New Name');
    });

    test('updateFraming should not modify built-in framing', async () => {
        const builtIn = framingService.getAllFramings()[0];
        const updated = await framingService.updateFraming(builtIn.id, { name: 'Attempted Change' });

        assert.strictEqual(updated, undefined, 'Should not allow updating built-in framings');
        const found = framingService.getFraming(builtIn.id);
        assert.notStrictEqual(found?.name, 'Attempted Change');
    });

    test('deleteFraming should remove user framing', async () => {
        const framing = await framingService.createFraming({ name: 'To Delete' });
        const success = await framingService.deleteFraming(framing.id);

        assert.strictEqual(success, true);
        assert.strictEqual(framingService.getFraming(framing.id), undefined);
    });

    test('deleteFraming should not remove built-in framing', async () => {
        const builtIn = framingService.getAllFramings()[0];
        const success = await framingService.deleteFraming(builtIn.id);

        assert.strictEqual(success, false);
        assert.ok(framingService.getFraming(builtIn.id), 'Built-in framing should still exist');
    });

    test('duplicateFraming should create a user copy of built-in framing', async () => {
        const builtIn = framingService.getAllFramings()[0];
        const copy = await framingService.duplicateFraming(builtIn.id);

        assert.ok(copy);
        assert.strictEqual(copy!.name, `${builtIn.name} (Copy)`);
        assert.strictEqual(copy!.source, FramingSource.User);
        assert.strictEqual(copy!.systemMessage, builtIn.systemMessage);
    });

    test('getAllTags should organize tags correctly', async () => {
        await framingService.createFraming({ name: 'T1', tags: ['Programming', 'AI'] });
        await framingService.createFraming({ name: 'T2', tags: ['AI', 'Writing'] });
        await framingService.createFraming({ name: 'T3', tags: [] }); // Untagged

        const tags = framingService.getAllTags();
        const tagNames = tags.map(t => t.name);

        assert.ok(tagNames.includes('Programming'));
        assert.ok(tagNames.includes('AI'));
        assert.ok(tagNames.includes('Writing'));
        assert.ok(tagNames.includes('Untagged'));
        
        // Check "Untagged" reserved status
        const untagged = tags.find(t => t.name === 'Untagged');
        assert.strictEqual(untagged?.isReserved, true);
    });

    test('getFramingsByTag should return correct framings', async () => {
        await framingService.createFraming({ name: 'AI Framing', tags: ['AI'] });
        await framingService.createFraming({ name: 'Untagged Framing', tags: [] });

        const aiFramings = framingService.getFramingsByTag('AI');
        assert.strictEqual(aiFramings.length, 1);
        assert.strictEqual(aiFramings[0].name, 'AI Framing');

        const untaggedFramings = framingService.getFramingsByTag('Untagged');
        assert.strictEqual(untaggedFramings.length, 1);
        assert.strictEqual(untaggedFramings[0].name, 'Untagged Framing');
    });

    test('should filter out reserved tags from user input', async () => {
        const framing = await framingService.createFraming({
            name: 'Reserved Tag Test',
            tags: ['Built-in', 'Untagged', 'MyTag']
        });

        assert.strictEqual(framing.tags.length, 1);
        assert.strictEqual(framing.tags[0], 'MyTag');

        const updated = await framingService.updateFraming(framing.id, {
            tags: ['built-in', 'Other']
        });
        assert.strictEqual(updated?.tags.length, 1);
        assert.strictEqual(updated?.tags[0], 'Other');
    });

    test('duplicateFraming should remove Built-in tag from copy', async () => {
        const builtIn = framingService.getAllFramings()[0]; // Has 'Built-in' tag
        const copy = await framingService.duplicateFraming(builtIn.id);

        assert.ok(copy);
        assert.ok(!copy!.tags.includes('Built-in'), 'Copy should not have Built-in tag');
    });
});
