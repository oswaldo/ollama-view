import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { TemplatesProvider, TagItem, TemplateItem } from '../providers/templatesProvider';
import { TemplateSource } from '../models/template';

suite('TemplatesProvider Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let mockTemplateService: any;
    let templatesProvider: TemplatesProvider;

    setup(() => {
        sandbox = sinon.createSandbox();
        
        mockTemplateService = {
            getAllTags: sandbox.stub(),
            getTemplatesByTag: sandbox.stub()
        };

        templatesProvider = new TemplatesProvider(mockTemplateService as any);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('getChildren should return TagItems at root', async () => {
        mockTemplateService.getAllTags.returns([
            { id: 'tag-ai', name: 'AI' },
            { id: 'tag-untagged', name: 'Untagged', isReserved: true }
        ]);

        const children = await templatesProvider.getChildren();
        assert.strictEqual(children.length, 2);
        assert.ok(children[0] instanceof TagItem);
        assert.strictEqual((children[0] as TagItem).tag.name, 'AI');
        assert.ok(children[1] instanceof TagItem);
        assert.strictEqual((children[1] as TagItem).tag.name, 'Untagged');
    });

    test('getChildren should return TemplateItems under a TagItem', async () => {
        const tagItem = new TagItem({ id: 'tag-ai', name: 'AI' });
        mockTemplateService.getTemplatesByTag.withArgs('AI').returns([
            { id: 't1', name: 'Template 1', source: TemplateSource.BuiltIn, tags: ['AI'], systemMessage: 'test' }
        ]);

        const children = await templatesProvider.getChildren(tagItem);
        assert.strictEqual(children.length, 1);
        assert.ok(children[0] instanceof TemplateItem);
        assert.strictEqual((children[0] as TemplateItem).template.name, 'Template 1');
    });

    test('TemplateItem should have correct properties', () => {
        const template = { 
            id: 't1', 
            name: 'Template 1', 
            description: 'Desc', 
            source: TemplateSource.BuiltIn, 
            tags: ['AI'], 
            systemMessage: 'test',
            createdAt: 0,
            updatedAt: 0
        };
        const item = new TemplateItem(template);

        assert.strictEqual(item.label, 'Template 1');
        assert.strictEqual(item.tooltip, 'Desc');
        assert.strictEqual(item.description, 'Built-in');
        assert.strictEqual(item.contextValue, 'template-builtin');
    });
});
