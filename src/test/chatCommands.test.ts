/* eslint-disable @typescript-eslint/no-explicit-any */
import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';

import { ChatCommands } from '../commands/chatCommands';
import { OllamaChatItem } from '../ollamaProvider';
import { Chat } from '../services/chatService';
import { ExportService } from '../services/exportService';

suite('ChatCommands Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let chatCommands: ChatCommands;
    let exportService: ExportService;
    let chatService: any;
    let modelService: any;
    let framingService: any;
    let chatOrchestrator: any;
    let ollamaProvider: any;

    setup(() => {
        sandbox = sinon.createSandbox();
        chatService = {};
        modelService = {};
        framingService = {};
        chatOrchestrator = {};
        ollamaProvider = {};
        exportService = new ExportService();
        chatCommands = new ChatCommands(
            chatService,
            modelService,
            framingService,
            chatOrchestrator,
            ollamaProvider,
            exportService,
            vscode.Uri.file('/')
        );
    });

    teardown(() => {
        sandbox.restore();
    });

    test('exportChat should call showSaveDialog and writeFile', async () => {
        const chat: Chat = {
            id: '1',
            modelName: 'llama3',
            name: 'Test Chat',
            messages: [],
            createdAt: Date.now(),
        };
        const node = new OllamaChatItem(chat);

        const saveUri = vscode.Uri.file('/tmp/test-chat.md');
        const showSaveDialogStub = sandbox.stub(vscode.window, 'showSaveDialog').resolves(saveUri);
        const writeFileStub = sandbox.stub(vscode.workspace.fs, 'writeFile').resolves();
        const showInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves();

        await chatCommands.exportChat(node);

        assert.ok(showSaveDialogStub.calledOnce);
        assert.ok(writeFileStub.calledOnce);
        assert.ok(showInformationMessageStub.calledOnce);
    });
});
