import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { TemplateEditorPanel } from '../panels/templateEditorPanel';
import { TemplateSource } from '../models/template';

suite('TemplateEditorPanel Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let mockTemplateService: any;
    let mockWebviewPanel: any;

    setup(() => {
        sandbox = sinon.createSandbox();
        
        mockTemplateService = {
            updateTemplate: sandbox.stub(),
            duplicateTemplate: sandbox.stub()
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

        // We need to stub vscode.window.createWebviewPanel
        // Since we are using the mock, we can just stub the global object we injected
        sandbox.stub(vscode.window, 'createWebviewPanel').returns(mockWebviewPanel);
    });

    teardown(() => {
        sandbox.restore();
        // Clear active panels
        TemplateEditorPanel.panels.clear();
    });

    test('createOrShow should create a new panel if not exists', () => {
        const template = { id: 't1', name: 'T1', source: TemplateSource.User, tags: [], content: 'test' };
        TemplateEditorPanel.createOrShow(vscode.Uri.file(''), template as any, mockTemplateService);
        
        assert.ok((vscode.window.createWebviewPanel as sinon.SinonStub).calledOnce);
        assert.strictEqual(TemplateEditorPanel.panels.size, 1);
    });

    test('should handle save message for user templates', async () => {
        const template = { id: 't1', name: 'T1', source: TemplateSource.User, tags: [], content: 'test' };
        TemplateEditorPanel.createOrShow(vscode.Uri.file(''), template as any, mockTemplateService);
        
        const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.getCall(0).args[0];
        
        mockTemplateService.updateTemplate.resolves({ ...template, name: 'Updated' });
        
        await messageHandler({ 
            command: 'save', 
            template: { name: 'Updated', description: '', tags: [], content: 'test' } 
        });
        
        assert.ok(mockTemplateService.updateTemplate.calledWith('t1', sinon.match({ name: 'Updated' })));
    });

    test('should block save for built-in templates', async () => {
        const template = { id: 't-bi', name: 'BuiltIn', source: TemplateSource.BuiltIn, tags: [], content: 'test' };
        TemplateEditorPanel.createOrShow(vscode.Uri.file(''), template as any, mockTemplateService);
        
        const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.getCall(0).args[0];
        const errorStub = sandbox.stub(vscode.window, 'showErrorMessage');
        
        await messageHandler({ 
            command: 'save', 
            template: { name: 'Updated', description: '', tags: [], content: 'test' } 
        });
        
        assert.ok(mockTemplateService.updateTemplate.notCalled);
        assert.ok(errorStub.calledOnce);
    });

    test('should handle duplicate message', async () => {
        const template = { id: 't1', name: 'T1', source: TemplateSource.User, tags: [], content: 'test' };
        TemplateEditorPanel.createOrShow(vscode.Uri.file(''), template as any, mockTemplateService);
        
        const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.getCall(0).args[0];
        
        mockTemplateService.duplicateTemplate.resolves({ 
            id: 't2', name: 'T1 (Copy)', source: TemplateSource.User, tags: [], content: 'test' 
        });
        
        await messageHandler({ command: 'duplicate' });
        
        assert.ok(mockTemplateService.duplicateTemplate.calledWith('t1'));
    });
});
