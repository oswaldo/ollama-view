import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';

import { FramingSource, ModelFraming } from '../models/modelFraming';
import { FramingService } from '../services/framingService';

suite('FramingService Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let mockContext: { globalState: { get: sinon.SinonStub; update: sinon.SinonStub } };
    let service: FramingService;

    setup(() => {
        sandbox = sinon.createSandbox();
        mockContext = {
            globalState: {
                get: sandbox.stub().returns([]),
                update: sandbox.stub().resolves(),
            },
        };
        service = new FramingService(mockContext as unknown as vscode.ExtensionContext);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('getAllFramings should return built-in framings initially', () => {
        const all = service.getAllFramings();
        assert.ok(all.length >= 3);
        assert.ok(all.some((f) => f.source === FramingSource.BuiltIn));
    });

    test('createFraming should add a new user framing', async () => {
        const framingData: Partial<ModelFraming> = {
            name: 'New',
            systemMessage: 'System',
        };
        const created = await service.createFraming(framingData);
        assert.strictEqual(created.name, 'New');
        assert.strictEqual(created.source, FramingSource.User);
        assert.ok(mockContext.globalState.update.calledOnce);
    });

    test('updateFraming should modify user framing', async () => {
        const userFraming: ModelFraming = {
            id: 'u1',
            name: 'Old',
            description: '',
            systemMessage: '',
            tags: [],
            source: FramingSource.User,
            createdAt: 0,
            updatedAt: 0,
            userMessagePrefix: '',
            userMessageSuffix: '',
            systemTurnPrefix: '',
            systemTurnSuffix: '',
        };
        mockContext.globalState.get.returns([userFraming]);

        const updated = await service.updateFraming('u1', { name: 'Updated' });
        assert.strictEqual(updated?.name, 'Updated');
    });

    test('updateFraming should not modify built-in framing', async () => {
        const updated = await service.updateFraming('builtin-helpful-assistant', { name: 'Attempt' });
        assert.strictEqual(updated, undefined);
    });

    test('deleteFraming should remove user framing', async () => {
        const userFraming: ModelFraming = {
            id: 'u1',
            name: 'Old',
            description: '',
            systemMessage: '',
            tags: [],
            source: FramingSource.User,
            createdAt: 0,
            updatedAt: 0,
            userMessagePrefix: '',
            userMessageSuffix: '',
            systemTurnPrefix: '',
            systemTurnSuffix: '',
        };
        mockContext.globalState.get.returns([userFraming]);

        const success = await service.deleteFraming('u1');
        assert.strictEqual(success, true);
        assert.ok(mockContext.globalState.update.calledWith(sinon.match.any, []));
    });

    test('deleteFraming should not remove built-in framing', async () => {
        const success = await service.deleteFraming('builtin-helpful-assistant');
        assert.strictEqual(success, false);
    });

    test('duplicateFraming should create a user copy of built-in framing', async () => {
        const copy = await service.duplicateFraming('builtin-helpful-assistant');
        assert.ok(copy);
        assert.strictEqual(copy?.source, FramingSource.User);
        assert.ok(copy?.name.includes('(Copy)'));
    });

    test('getAllTags should organize tags correctly', async () => {
        const userFraming: ModelFraming = {
            id: 'u1',
            name: 'User 1',
            tags: ['Custom'],
            source: FramingSource.User,
            createdAt: 0,
            updatedAt: 0,
            description: '',
            systemMessage: '',
            userMessagePrefix: '',
            userMessageSuffix: '',
            systemTurnPrefix: '',
            systemTurnSuffix: '',
        };
        mockContext.globalState.get.returns([userFraming]);

        const tags = service.getAllTags();
        assert.ok(tags.some((t) => t.name === 'Custom'));
        assert.ok(tags.some((t) => t.name === 'Built-in'));
    });

    test('getFramingsByTag should return correct framings', async () => {
        const framings = service.getFramingsByTag('Programming');
        assert.ok(framings.length > 0);
        assert.strictEqual(framings[0].tags.includes('Programming'), true);
    });

    test('should filter out reserved tags from user input', async () => {
        const created = await service.createFraming({
            name: 'Test',
            tags: ['Built-in', 'RealTag'],
        });
        assert.strictEqual(created.tags.length, 1);
        assert.strictEqual(created.tags[0], 'RealTag');
    });

    test('duplicateFraming should remove Built-in tag from copy', async () => {
        const copy = await service.duplicateFraming('builtin-helpful-assistant');
        assert.strictEqual(copy?.tags.includes('Built-in'), false);
    });
});
