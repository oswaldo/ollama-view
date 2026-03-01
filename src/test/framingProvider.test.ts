import * as assert from 'assert';
import * as sinon from 'sinon';

import { FramingSource, ModelFraming } from '../models/modelFraming';
import { FramingItem, FramingProvider, FramingTagItem } from '../providers/framingProvider';
import { FramingService } from '../services/framingService';

suite('FramingProvider Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let mockFramingService: sinon.SinonStubbedInstance<FramingService>;
    let provider: FramingProvider;

    setup(() => {
        sandbox = sinon.createSandbox();
        mockFramingService = sandbox.createStubInstance(FramingService);
        provider = new FramingProvider(mockFramingService as unknown as FramingService);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('getChildren should return FramingTagItems at root', async () => {
        mockFramingService.getAllTags.returns([{ id: 't1', name: 'Tag 1' }]);

        const children = await provider.getChildren();
        assert.strictEqual(children.length, 1);
        assert.ok(children[0] instanceof FramingTagItem);
        assert.strictEqual(children[0].label, 'Tag 1');
    });

    test('getChildren should return FramingItems under a FramingTagItem', async () => {
        const mockFraming: ModelFraming = {
            id: 'f1',
            name: 'Framing 1',
            description: '',
            systemMessage: '',
            tags: ['Tag 1'],
            source: FramingSource.BuiltIn,
            createdAt: 0,
            updatedAt: 0,
            userMessagePrefix: '',
            userMessageSuffix: '',
            systemTurnPrefix: '',
            systemTurnSuffix: '',
        };
        mockFramingService.getFramingsByTag.returns([mockFraming]);

        const tagItem = new FramingTagItem({ id: 't1', name: 'Tag 1' });
        const children = await provider.getChildren(tagItem);

        assert.strictEqual(children.length, 1);
        assert.ok(children[0] instanceof FramingItem);
        assert.strictEqual(children[0].label, 'Framing 1');
    });

    test('FramingItem should have correct properties', () => {
        const mockFraming: ModelFraming = {
            id: 'f1',
            name: 'Framing 1',
            description: 'Desc',
            systemMessage: '',
            tags: ['Tag 1'],
            source: FramingSource.BuiltIn,
            createdAt: 0,
            updatedAt: 0,
            userMessagePrefix: '',
            userMessageSuffix: '',
            systemTurnPrefix: '',
            systemTurnSuffix: '',
        };
        const item = new FramingItem(mockFraming);
        assert.strictEqual(item.label, 'Framing 1');
        assert.strictEqual(item.tooltip, 'Desc');
        assert.strictEqual(item.contextValue, 'framing-builtin');
    });
});
