/* eslint-disable @typescript-eslint/no-explicit-any */
import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';

import { FramingSource, ModelFraming } from '../models/modelFraming';
import { FramingEditorPanel } from '../panels/framingEditorPanel';
import { FramingService } from '../services/framingService';

suite('FramingEditorPanel Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let mockFramingService: sinon.SinonStubbedInstance<FramingService>;
    let mockWebviewPanel: {
        webview: {
            onDidReceiveMessage: sinon.SinonStub;
            postMessage: sinon.SinonStub;
            asWebviewUri: sinon.SinonStub;
            html: string;
        };
        onDidDispose: sinon.SinonStub;
        reveal: sinon.SinonStub;
        dispose: sinon.SinonStub;
    };

    setup(() => {
        sandbox = sinon.createSandbox();
        mockFramingService = sandbox.createStubInstance(FramingService);

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
        FramingEditorPanel.panels.clear();
    });

    test('createOrShow should create a new panel if not exists', () => {
        const framing: ModelFraming = {
            id: '1',
            name: 'Test',
            source: FramingSource.User,
            description: '',
            systemMessage: '',
            tags: [],
            createdAt: 0,
            updatedAt: 0,
            userMessagePrefix: '',
            userMessageSuffix: '',
            systemTurnPrefix: '',
            systemTurnSuffix: '',
        };
        FramingEditorPanel.createOrShow(vscode.Uri.file(''), framing, mockFramingService as any as FramingService);
        assert.strictEqual(FramingEditorPanel.panels.size, 1);
    });

    test('should handle save message for user framings', async () => {
        const framing: ModelFraming = {
            id: '1',
            name: 'Test',
            source: FramingSource.User,
            description: '',
            systemMessage: '',
            tags: [],
            createdAt: 0,
            updatedAt: 0,
            userMessagePrefix: '',
            userMessageSuffix: '',
            systemTurnPrefix: '',
            systemTurnSuffix: '',
        };
        FramingEditorPanel.createOrShow(vscode.Uri.file(''), framing, mockFramingService as any as FramingService);

        const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.getCall(0).args[0];
        const updatedData = { name: 'Updated' };

        await messageHandler({ command: 'save', framing: updatedData });
        assert.ok(mockFramingService.updateFraming.calledWith('1', updatedData));
    });

    test('should block save for built-in framings', async () => {
        const framing: ModelFraming = {
            id: '1',
            name: 'Test',
            source: FramingSource.BuiltIn,
            description: '',
            systemMessage: '',
            tags: [],
            createdAt: 0,
            updatedAt: 0,
            userMessagePrefix: '',
            userMessageSuffix: '',
            systemTurnPrefix: '',
            systemTurnSuffix: '',
        };
        FramingEditorPanel.createOrShow(vscode.Uri.file(''), framing, mockFramingService as any as FramingService);

        const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.getCall(0).args[0];
        await messageHandler({ command: 'save', framing: {} });
        assert.ok(mockFramingService.updateFraming.notCalled);
    });

    test('should handle duplicate message', async () => {
        const framing: ModelFraming = {
            id: '1',
            name: 'Test',
            source: FramingSource.User,
            description: '',
            systemMessage: '',
            tags: [],
            createdAt: 0,
            updatedAt: 0,
            userMessagePrefix: '',
            userMessageSuffix: '',
            systemTurnPrefix: '',
            systemTurnSuffix: '',
        };
        FramingEditorPanel.createOrShow(vscode.Uri.file(''), framing, mockFramingService as any as FramingService);

        const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.getCall(0).args[0];
        await messageHandler({ command: 'duplicate' });
        assert.ok(mockFramingService.duplicateFraming.calledWith('1'));
    });
});
