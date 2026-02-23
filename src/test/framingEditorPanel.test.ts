import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { FramingEditorPanel } from '../panels/framingEditorPanel';
import { FramingSource } from '../models/modelFraming';

suite('FramingEditorPanel Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let mockFramingService: any;
    let mockWebviewPanel: any;

    setup(() => {
        sandbox = sinon.createSandbox();
        
        mockFramingService = {
            updateFraming: sandbox.stub(),
            duplicateFraming: sandbox.stub()
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
        FramingEditorPanel.panels.clear();
    });

    test('createOrShow should create a new panel if not exists', () => {
        const framing = { id: 'f1', name: 'F1', source: FramingSource.User, tags: [], systemMessage: 'test' };
        FramingEditorPanel.createOrShow(vscode.Uri.file(''), framing as any, mockFramingService);
        
        assert.ok((vscode.window.createWebviewPanel as sinon.SinonStub).calledOnce);
        assert.strictEqual(FramingEditorPanel.panels.size, 1);
    });

    test('should handle save message for user framings', async () => {
        const framing = { id: 'f1', name: 'F1', source: FramingSource.User, tags: [], systemMessage: 'test' };
        FramingEditorPanel.createOrShow(vscode.Uri.file(''), framing as any, mockFramingService);
        
        const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.getCall(0).args[0];
        
        mockFramingService.updateFraming.resolves({ ...framing, name: 'Updated' });
        
        await messageHandler({ 
            command: 'save', 
            framing: { name: 'Updated', description: '', tags: [], systemMessage: 'test' } 
        });
        
        assert.ok(mockFramingService.updateFraming.calledWith('f1', sinon.match({ name: 'Updated' })));
    });

    test('should block save for built-in framings', async () => {
        const framing = { id: 'f-bi', name: 'BuiltIn', source: FramingSource.BuiltIn, tags: [], systemMessage: 'test' };
        FramingEditorPanel.createOrShow(vscode.Uri.file(''), framing as any, mockFramingService);
        
        const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.getCall(0).args[0];
        const errorStub = sandbox.stub(vscode.window, 'showErrorMessage');
        
        await messageHandler({ 
            command: 'save', 
            framing: { name: 'Updated', description: '', tags: [], systemMessage: 'test' } 
        });
        
        assert.ok(mockFramingService.updateFraming.notCalled);
        assert.ok(errorStub.calledOnce);
    });

    test('should handle duplicate message', async () => {
        const framing = { id: 'f1', name: 'F1', source: FramingSource.User, tags: [], systemMessage: 'test' };
        FramingEditorPanel.createOrShow(vscode.Uri.file(''), framing as any, mockFramingService);
        
        const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.getCall(0).args[0];
        
        mockFramingService.duplicateFraming.resolves({ 
            id: 'f2', name: 'F1 (Copy)', source: FramingSource.User, tags: [], systemMessage: 'test' 
        });
        
        await messageHandler({ command: 'duplicate' });
        
        assert.ok(mockFramingService.duplicateFraming.calledWith('f1'));
    });
});
