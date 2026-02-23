import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { FramingProvider, FramingTagItem, FramingItem } from '../providers/framingProvider';
import { FramingSource } from '../models/modelFraming';

suite('FramingProvider Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let mockFramingService: any;
    let framingProvider: FramingProvider;

    setup(() => {
        sandbox = sinon.createSandbox();
        
        mockFramingService = {
            getAllTags: sandbox.stub(),
            getFramingsByTag: sandbox.stub()
        };

        framingProvider = new FramingProvider(mockFramingService as any);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('getChildren should return FramingTagItems at root', async () => {
        mockFramingService.getAllTags.returns([
            { id: 'tag-ai', name: 'AI' },
            { id: 'tag-untagged', name: 'Untagged', isReserved: true }
        ]);

        const children = await framingProvider.getChildren();
        assert.strictEqual(children.length, 2);
        assert.ok(children[0] instanceof FramingTagItem);
        assert.strictEqual((children[0] as FramingTagItem).tag.name, 'AI');
        assert.ok(children[1] instanceof FramingTagItem);
        assert.strictEqual((children[1] as FramingTagItem).tag.name, 'Untagged');
    });

    test('getChildren should return FramingItems under a FramingTagItem', async () => {
        const tagItem = new FramingTagItem({ id: 'tag-ai', name: 'AI' });
        mockFramingService.getFramingsByTag.withArgs('AI').returns([
            { id: 'f1', name: 'Framing 1', source: FramingSource.BuiltIn, tags: ['AI'], systemMessage: 'test' }
        ]);

        const children = await framingProvider.getChildren(tagItem);
        assert.strictEqual(children.length, 1);
        assert.ok(children[0] instanceof FramingItem);
        assert.strictEqual((children[0] as FramingItem).framing.name, 'Framing 1');
    });

    test('FramingItem should have correct properties', () => {
        const framing = { 
            id: 'f1', 
            name: 'Framing 1', 
            description: 'Desc', 
            source: FramingSource.BuiltIn, 
            tags: ['AI'], 
            systemMessage: 'test',
            createdAt: 0,
            updatedAt: 0
        };
        const item = new FramingItem(framing);

        assert.strictEqual(item.label, 'Framing 1');
        assert.strictEqual(item.tooltip, 'Desc');
        assert.strictEqual(item.description, 'Built-in');
        assert.strictEqual(item.contextValue, 'framing-builtin');
    });
});
