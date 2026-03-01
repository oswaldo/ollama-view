import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';

import { ModelInstance } from '../models/modelInstance';
import { ModelSettingsService } from '../modelSettingsService';

suite('ModelSettingsService Migration and Compatibility', () => {
    let sandbox: sinon.SinonSandbox;
    let mockContext: { globalState: { get: sinon.SinonStub; update: sinon.SinonStub } };
    let service: ModelSettingsService;

    setup(() => {
        sandbox = sinon.createSandbox();
        mockContext = {
            globalState: {
                get: sandbox.stub().returns({}),
                update: sandbox.stub().resolves(),
            },
        };
        service = new ModelSettingsService(mockContext as unknown as vscode.ExtensionContext);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('should migrate legacy settings (V1) to the new structure (V2)', async () => {
        const legacySettings = {
            llama3: {
                systemMessage: 'Legacy message',
                dataVersion: 1,
            },
        };
        mockContext.globalState.get.returns(legacySettings);

        const settings = service.getSettings('llama3');
        assert.strictEqual(settings.id, 'llama3');
        assert.strictEqual(settings.systemMessage, 'Legacy message');
        assert.strictEqual(settings.dataVersion, ModelSettingsService.CURRENT_VERSION);
    });

    test('should preserve unknown fields when saving (Forward Compatibility)', async () => {
        const settingsWithExtra: ModelInstance = {
            id: 'inst1',
            name: 'Instance 1',
            modelName: 'llama3',
            ollamaModelName: 'llama3-inst1',
            systemMessage: 'msg',
            config: {},
            createdAt: Date.now(),
            updatedAt: Date.now(),
            extraField: 'should stay',
        };
        mockContext.globalState.get.returns({ inst1: settingsWithExtra });

        await service.setSettings('inst1', { systemMessage: 'new msg' });

        const updateArgs = mockContext.globalState.update.getCall(0).args[1] as Record<string, ModelInstance>;
        assert.strictEqual(updateArgs['inst1'].extraField, 'should stay');
        assert.strictEqual(updateArgs['inst1'].systemMessage, 'new msg');
    });

    test('getSettings should resolve correct base model name for instances', () => {
        const mockInstance: ModelInstance = {
            id: 'inst1',
            name: 'Instance 1',
            modelName: 'llama3',
            ollamaModelName: 'llama3-inst1',
            config: {},
            systemMessage: '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        mockContext.globalState.get.returns({ inst1: mockInstance });

        const settings = service.getSettings('inst1');
        assert.strictEqual(settings.modelName, 'llama3');
    });
});
