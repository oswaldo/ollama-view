import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';

import { FramingSource, ModelFraming } from '../models/modelFraming';
import { ModelInstance } from '../models/modelInstance';
import { ModelSettingsService } from '../modelSettingsService';
import { OllamaModel } from '../ollamaApi';
import { OllamaProvider } from '../ollamaProvider';
import { SetupPanel } from '../panels/setupPanel';
import { FramingService } from '../services/framingService';

interface WebviewPanelMock {
    webview: {
        onDidReceiveMessage: sinon.SinonStub;
        postMessage: sinon.SinonStub;
        asWebviewUri: sinon.SinonStub;
        html: string;
    };
    onDidDispose: sinon.SinonStub;
    reveal: sinon.SinonStub;
    dispose: sinon.SinonStub;
}

suite('SetupPanel Integration Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let mockModelSettingsService: sinon.SinonStubbedInstance<ModelSettingsService>;
    let mockFramingService: sinon.SinonStubbedInstance<FramingService>;
    let mockWebviewPanel: WebviewPanelMock;
    let mockOllamaProvider: sinon.SinonStubbedInstance<OllamaProvider>;

    const mockModel: OllamaModel = { name: 'llama3', size: 1024 * 1024 * 1024, digest: '', modified_at: '' };

    setup(() => {
        sandbox = sinon.createSandbox();

        mockModelSettingsService = sandbox.createStubInstance(ModelSettingsService);
        mockModelSettingsService.getSettings.returns({
            id: 'llama3',
            name: 'llama3',
            modelName: 'llama3',
            ollamaModelName: 'llama3',
            config: {},
            systemMessage: '',
            createdAt: 0,
            updatedAt: 0,
        });

        mockFramingService = sandbox.createStubInstance(FramingService);

        mockOllamaProvider = sandbox.createStubInstance(OllamaProvider);
        mockOllamaProvider.isModelRunning.returns(false);

        // Mock WebviewPanel
        mockWebviewPanel = {
            webview: {
                onDidReceiveMessage: sandbox.stub(),
                postMessage: sandbox.stub(),
                asWebviewUri: sandbox.stub().returns({ toString: () => 'uri' }),
                html: '',
            },
            onDidDispose: sandbox.stub(),
            reveal: sandbox.stub(),
            dispose: sandbox.stub(),
        };

        sandbox.stub(vscode.window, 'createWebviewPanel').returns(mockWebviewPanel as unknown as vscode.WebviewPanel);
    });

    teardown(() => {
        sandbox.restore();
        SetupPanel.panels.clear();
    });

    test('createOrShow should create a new panel', () => {
        SetupPanel.createOrShow(
            vscode.Uri.file(''),
            mockModel,
            mockModelSettingsService as unknown as ModelSettingsService,
            mockFramingService as unknown as FramingService,
            mockOllamaProvider as unknown as OllamaProvider,
            'llama3',
        );
        assert.strictEqual(SetupPanel.panels.size, 1);
    });

    test('should handle applyFraming message and update fields', async () => {
        SetupPanel.createOrShow(
            vscode.Uri.file(''),
            mockModel,
            mockModelSettingsService as unknown as ModelSettingsService,
            mockFramingService as unknown as FramingService,
            mockOllamaProvider as unknown as OllamaProvider,
            'llama3',
        );

        const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.getCall(0).args[0];
        const framing: ModelFraming = {
            id: 'f1',
            name: 'Test Framing',
            systemMessage: 'System instructions',
            userMessagePrefix: 'User:',
            source: FramingSource.BuiltIn,
            tags: [],
            createdAt: 0,
            updatedAt: 0,
            description: '',
            userMessageSuffix: '',
            systemTurnPrefix: '',
            systemTurnSuffix: '',
        };

        mockFramingService.getAllFramings.returns([framing]);
        sandbox
            .stub(vscode.window, 'showQuickPick')
            .resolves({ label: 'Test Framing', framing } as unknown as vscode.QuickPickItem);

        await messageHandler({ command: 'applyFraming' });

        assert.ok(
            mockWebviewPanel.webview.postMessage.calledWith(
                sinon.match({
                    command: 'updateFields',
                    settings: sinon.match({
                        systemMessage: 'System instructions',
                        userMessagePrefix: 'User:',
                    }),
                }),
            ),
        );
    });

    test('should handle save message and call setSettings', async () => {
        SetupPanel.createOrShow(
            vscode.Uri.file(''),
            mockModel,
            mockModelSettingsService as unknown as ModelSettingsService,
            mockFramingService as unknown as FramingService,
            mockOllamaProvider as unknown as OllamaProvider,
            'llama3',
        );
        const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.getCall(0).args[0];

        const instance: Partial<ModelInstance> = {
            name: 'My Instance',
            config: { temperature: 0.5 },
        };

        await messageHandler({ command: 'save', instance });

        assert.ok(mockModelSettingsService.setSettings.calledWith('llama3', instance));
    });
});
