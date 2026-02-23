import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { SetupPanel } from '../panels/setupPanel';
import { TemplateSource } from '../models/template';

suite('SetupPanel Integration Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let mockModelSettingsService: any;
    let mockTemplateService: any;
    let mockWebviewPanel: any;

    const mockModel = { name: 'llama3', size: 1024 * 1024 * 1024 };

    setup(() => {
        sandbox = sinon.createSandbox();
        
        mockModelSettingsService = {
            getSettings: sandbox.stub().returns({}),
            setSettings: sandbox.stub().resolves()
        };

        mockTemplateService = {
            getAllTemplates: sandbox.stub()
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
        SetupPanel.createOrShow(vscode.Uri.file(''), mockModel as any, mockModelSettingsService, mockTemplateService);
        assert.strictEqual(SetupPanel.panels.size, 1);
    });

    test('should handle applyTemplate message and update fields', async () => {
        SetupPanel.createOrShow(vscode.Uri.file(''), mockModel as any, mockModelSettingsService, mockTemplateService);
        
        const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.getCall(0).args[0];
        const template = {
            id: 't1',
            name: 'Test Template',
            systemMessage: 'System instructions',
            userMessagePrefix: 'User:',
            source: TemplateSource.BuiltIn,
            tags: []
        };

        mockTemplateService.getAllTemplates.returns([template]);
        sandbox.stub(vscode.window, 'showQuickPick').resolves({ label: 'Test Template', template } as any);

        await messageHandler({ command: 'applyTemplate' });

        assert.ok(mockWebviewPanel.webview.postMessage.calledWith(sinon.match({
            command: 'updateFields',
            settings: sinon.match({
                systemMessage: 'System instructions',
                userMessagePrefix: 'User:'
            })
        })));
    });
});
