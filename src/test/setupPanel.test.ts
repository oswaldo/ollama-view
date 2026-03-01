/* eslint-disable @typescript-eslint/no-explicit-any */
import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';

import { FramingSource, ModelFraming } from '../models/modelFraming';
import { ModelInstance } from '../models/modelInstance';
import { OllamaModel } from '../ollamaApi';
import { OllamaProvider } from '../ollamaProvider';
import { SetupPanel } from '../panels/setupPanel';
import { FramingService } from '../services/framingService';
import { ModelService } from '../services/modelService';

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
    let mockModelService: sinon.SinonStubbedInstance<ModelService>;
    let mockFramingService: sinon.SinonStubbedInstance<FramingService>;
    let mockWebviewPanel: WebviewPanelMock;
    let mockOllamaProvider: sinon.SinonStubbedInstance<OllamaProvider>;

    const mockModel: OllamaModel = { name: 'llama3', size: 1024 * 1024 * 1024, digest: '', modified_at: '' };

    setup(() => {
        sandbox = sinon.createSandbox();

        mockModelService = {
            getSettings: sandbox.stub().returns({
                id: 'llama3',
                name: 'llama3',
                modelName: 'llama3',
                ollamaModelName: 'llama3',
                config: {},
                systemMessage: '',
                createdAt: 0,
                updatedAt: 0,
                dataVersion: 2,
            }),
            setSettings: sandbox.stub().resolves(),
        } as any;

        mockFramingService = sandbox.createStubInstance(FramingService);

        mockOllamaProvider = {
            isModelRunning: sandbox.stub().returns(false),
            getApi: sandbox.stub().returns({
                showModel: sandbox.stub().resolves({ modelfile: '', parameters: '' }),
            }),
            stopModel: sandbox.stub().resolves(),
        } as any;

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

        sandbox.stub(vscode.window, 'createWebviewPanel').returns(mockWebviewPanel as any as vscode.WebviewPanel);
    });

    teardown(() => {
        sandbox.restore();
        SetupPanel.panels.clear();
    });

    test('createOrShow should create a new panel', () => {
        SetupPanel.createOrShow(
            vscode.Uri.file(''),
            mockModel,
            mockModelService as any as ModelService,
            mockFramingService as any as FramingService,
            mockOllamaProvider as any as OllamaProvider,
            'llama3',
        );
        assert.strictEqual(SetupPanel.panels.size, 1);
    });

    test('should handle applyFraming message and update fields', async () => {
        SetupPanel.createOrShow(
            vscode.Uri.file(''),
            mockModel,
            mockModelService as any as ModelService,
            mockFramingService as any as FramingService,
            mockOllamaProvider as any as OllamaProvider,
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
            .resolves({ label: 'Test Framing', framing } as any as vscode.QuickPickItem);

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
            mockModelService as any as ModelService,
            mockFramingService as any as FramingService,
            mockOllamaProvider as any as OllamaProvider,
            'llama3',
        );
        const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.getCall(0).args[0];

        const instance: Partial<ModelInstance> = {
            name: 'My Instance',
            config: { temperature: 0.5 },
        };

        await messageHandler({ command: 'save', instance });

        assert.ok(mockModelService.setSettings.calledWith('llama3', instance));
    });
});
