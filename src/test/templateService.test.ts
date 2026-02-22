import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { TemplateService } from '../services/templateService';
import { TemplateSource } from '../models/template';

suite('TemplateService Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let mockGlobalState: any;
    let mockContext: any;
    let templateService: TemplateService;

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

        templateService = new TemplateService(mockContext);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('getAllTemplates should return built-in templates initially', () => {
        const templates = templateService.getAllTemplates();
        assert.ok(templates.length >= 3, 'Should have at least 3 built-in templates');
        assert.ok(templates.every(t => t.source === TemplateSource.BuiltIn), 'Initial templates should be built-in');
    });

    test('createTemplate should add a new user template', async () => {
        const newTemplate = await templateService.createTemplate({
            name: 'Test Template',
            content: 'Test Content',
            tags: ['Test']
        });

        assert.strictEqual(newTemplate.name, 'Test Template');
        assert.strictEqual(newTemplate.source, TemplateSource.User);
        
        const allTemplates = templateService.getAllTemplates();
        assert.ok(allTemplates.find(t => t.id === newTemplate.id), 'Template should be in all templates');
    });

    test('updateTemplate should modify user template', async () => {
        const template = await templateService.createTemplate({ name: 'Old Name' });
        const updated = await templateService.updateTemplate(template.id, { name: 'New Name' });

        assert.ok(updated);
        assert.strictEqual(updated!.name, 'New Name');
        
        const found = templateService.getTemplate(template.id);
        assert.strictEqual(found?.name, 'New Name');
    });

    test('updateTemplate should not modify built-in template', async () => {
        const builtIn = templateService.getAllTemplates()[0];
        const updated = await templateService.updateTemplate(builtIn.id, { name: 'Attempted Change' });

        assert.strictEqual(updated, undefined, 'Should not allow updating built-in templates');
        const found = templateService.getTemplate(builtIn.id);
        assert.notStrictEqual(found?.name, 'Attempted Change');
    });

    test('deleteTemplate should remove user template', async () => {
        const template = await templateService.createTemplate({ name: 'To Delete' });
        const success = await templateService.deleteTemplate(template.id);

        assert.strictEqual(success, true);
        assert.strictEqual(templateService.getTemplate(template.id), undefined);
    });

    test('deleteTemplate should not remove built-in template', async () => {
        const builtIn = templateService.getAllTemplates()[0];
        const success = await templateService.deleteTemplate(builtIn.id);

        assert.strictEqual(success, false);
        assert.ok(templateService.getTemplate(builtIn.id), 'Built-in template should still exist');
    });

    test('duplicateTemplate should create a user copy of built-in template', async () => {
        const builtIn = templateService.getAllTemplates()[0];
        const copy = await templateService.duplicateTemplate(builtIn.id);

        assert.ok(copy);
        assert.strictEqual(copy!.name, `${builtIn.name} (Copy)`);
        assert.strictEqual(copy!.source, TemplateSource.User);
        assert.strictEqual(copy!.content, builtIn.content);
    });

    test('getAllTags should organize tags correctly', async () => {
        await templateService.createTemplate({ name: 'T1', tags: ['Programming', 'AI'] });
        await templateService.createTemplate({ name: 'T2', tags: ['AI', 'Writing'] });
        await templateService.createTemplate({ name: 'T3', tags: [] }); // Untagged

        const tags = templateService.getAllTags();
        const tagNames = tags.map(t => t.name);

        assert.ok(tagNames.includes('Programming'));
        assert.ok(tagNames.includes('AI'));
        assert.ok(tagNames.includes('Writing'));
        assert.ok(tagNames.includes('Untagged'));
        
        // Check "Untagged" reserved status
        const untagged = tags.find(t => t.name === 'Untagged');
        assert.strictEqual(untagged?.isReserved, true);
    });

    test('getTemplatesByTag should return correct templates', async () => {
        await templateService.createTemplate({ name: 'AI Template', tags: ['AI'] });
        await templateService.createTemplate({ name: 'Untagged Template', tags: [] });

        const aiTemplates = templateService.getTemplatesByTag('AI');
        assert.strictEqual(aiTemplates.length, 1);
        assert.strictEqual(aiTemplates[0].name, 'AI Template');

        const untaggedTemplates = templateService.getTemplatesByTag('Untagged');
        assert.strictEqual(untaggedTemplates.length, 1);
        assert.strictEqual(untaggedTemplates[0].name, 'Untagged Template');
    });
});
