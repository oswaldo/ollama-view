import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { SetupPanel } from '../panels/setupPanel';
import { FramingSource } from '../models/modelFraming';

suite('SetupPanel Integration Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let mockModelSettingsService: any;
    let mockFramingService: any;
    let mockWebviewPanel: any;

    const mockModel = { name: 'llama3', size: 1024 * 1024 * 1024 };

    setup(() => {
        sandbox = sinon.createSandbox();
        
        mockModelSettingsService = {
            getSettings: sandbox.stub().returns({}),
            setSettings: sandbox.stub().resolves()
        };

        mockFramingService = {
            getAllFramings: sandbox.stub()
        };

        // Mock WebviewPanel
        mockWebviewPanel = {
            webview: {
                onDidReceiveMessage: sandbox.stub(),
                postMessage: sandbox.stub(),
                asWebviewUri: sandbox.stub().returns({ toString: () => 'uri' }),
                html: ''
            },
            onDidDispose: sandbox.stub(),
            reveal: sandbox.stub(),
            dispose: sandbox.stub()
        };

        sandbox.stub(vscode.window, 'createWebviewPanel').returns(mockWebviewPanel);
    });

    teardown(() => {
        sandbox.restore();
        SetupPanel.panels.clear();
    });

    test('createOrShow should create a new panel', () => {
        SetupPanel.createOrShow(vscode.Uri.file(''), mockModel as any, mockModelSettingsService, mockFramingService);
        assert.strictEqual(SetupPanel.panels.size, 1);
    });

    test('should handle applyFraming message and update fields', async () => {
        SetupPanel.createOrShow(vscode.Uri.file(''), mockModel as any, mockModelSettingsService, mockFramingService);
        
        const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.getCall(0).args[0];
        const framing = {
            id: 'f1',
            name: 'Test Framing',
            systemMessage: 'System instructions',
            userMessagePrefix: 'User:',
            source: FramingSource.BuiltIn,
            tags: []
        };

        mockFramingService.getAllFramings.returns([framing]);
        sandbox.stub(vscode.window, 'showQuickPick').resolves({ label: 'Test Framing', framing } as any);

        await messageHandler({ command: 'applyFraming' });

        assert.ok(mockWebviewPanel.webview.postMessage.calledWith(sinon.match({
            command: 'updateFields',
            settings: sinon.match({
                systemMessage: 'System instructions',
                userMessagePrefix: 'User:'
            })
        })));
    });
});
