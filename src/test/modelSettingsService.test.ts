import * as assert from 'assert';
import { ModelSettingsService, ModelSettings } from '../modelSettingsService';
import * as vscode from 'vscode';

class MockMemento implements vscode.Memento {
    private data: Record<string, any> = {};
    get<T>(key: string): T | undefined;
    get<T>(key: string, defaultValue: T): T;
    get(key: any, defaultValue?: any) {
        return this.data[key] || defaultValue;
    }
    update(key: string, value: any): Thenable<void> {
        this.data[key] = value;
        return Promise.resolve();
    }
    keys(): readonly string[] {
        return Object.keys(this.data);
    }
    setKeysForSync(keys: readonly string[]): void { }
}

class MockExtensionContext implements Partial<vscode.ExtensionContext> {
    globalState = new MockMemento();
}

suite('ModelSettingsService Migration and Compatibility', () => {
    let mockContext: MockExtensionContext;
    let service: ModelSettingsService;

    setup(() => {
        mockContext = new MockExtensionContext();
        service = new ModelSettingsService(mockContext as any);
    });

    test('should migrate legacy settings (V1) to the new structure (V2)', async () => {
        const legacyData: Record<string, ModelSettings> = {
            'tinyllama:latest': {
                systemMessage: 'Legacy message',
                userMessagePrefix: 'Pre:'
            }
        };
        await mockContext.globalState.update('ollama-view.modelSettings', legacyData);

        const settings = service.getSettings('tinyllama:latest');
        assert.strictEqual(settings.systemMessage, 'Legacy message');
    });

    test('should preserve unknown fields when saving (Forward Compatibility)', async () => {
        const dataWithUnknownFields = {
            'tinyllama:latest': {
                systemMessage: 'V2 message',
                futureField: 'I should survive'
            }
        };
        await mockContext.globalState.update('ollama-view.modelSettings', dataWithUnknownFields);

        await service.setSystemMessage('tinyllama:latest', 'Updated message');

        const savedData = mockContext.globalState.get<any>('ollama-view.modelSettings');
        assert.strictEqual(savedData['tinyllama:latest'].systemMessage, 'Updated message');
        assert.strictEqual(savedData['tinyllama:latest'].futureField, 'I should survive', 'Unknown fields should be preserved');
    });

    test('getSettings should resolve correct base model name for instances', async () => {
        const instanceId = 'test-uuid-123';
        const instanceData = {
            id: instanceId,
            name: 'My Custom Instance',
            modelName: 'llama3', // The actual base model
            config: {}
        };
        
        const allSettings = { [instanceId]: instanceData };
        await mockContext.globalState.update('ollama-view.modelSettings', allSettings);

        const resolved = service.getSettings(instanceId);
        assert.strictEqual(resolved.modelName, 'llama3', 'Base model name should be llama3');
        assert.strictEqual(resolved.id, instanceId, 'Instance ID should be the UUID');
    });
});
