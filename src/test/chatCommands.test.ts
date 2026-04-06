/* eslint-disable @typescript-eslint/no-explicit-any */
import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';

import { ChatCommands } from '../commands/chatCommands';
import { OllamaChatItem, OllamaInstanceItem, OllamaModelItem } from '../ollamaProvider';
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
    let mockGlobalState: any;
    let stateMap: Map<string, any>;

    setup(() => {
        sandbox = sinon.createSandbox();
        chatService = {};
        modelService = {};
        framingService = {};
        chatOrchestrator = {};
        ollamaProvider = {};
        exportService = new ExportService();

        stateMap = new Map<string, any>();
        mockGlobalState = {
            get: (key: string, defaultValue?: any) => stateMap.has(key) ? stateMap.get(key) : defaultValue,
            update: (key: string, value: any) => { stateMap.set(key, value); return Promise.resolve(); }
        };

        chatCommands = new ChatCommands(
            chatService,
            modelService,
            framingService,
            chatOrchestrator,
            ollamaProvider,
            exportService,
            mockGlobalState,
            vscode.Uri.file('/')
        );
    });

    teardown(() => {
        sandbox.restore();
    });

    test('exportChat saves as Markdown when URI ends with .md and updates state', async () => {
        const chat: Chat = {
            id: '1',
            modelName: 'llama3',
            name: 'Test Chat',
            messages: [],
            createdAt: Date.now(),
        };
        const node = new OllamaChatItem(chat);

        const saveUri = vscode.Uri.file('/tmp/test-chat.md');
        sandbox.stub(vscode.window, 'showSaveDialog').resolves(saveUri);
        const writeFileStub = sandbox.stub(vscode.workspace.fs, 'writeFile').resolves();
        sandbox.stub(vscode.window, 'showInformationMessage').resolves();

        const toMarkdownSpy = sandbox.spy(exportService, 'toMarkdown');

        await chatCommands.exportChat(node);

        assert.ok(toMarkdownSpy.calledOnce);
        assert.ok(writeFileStub.calledOnce);
        assert.strictEqual(stateMap.get('lastExportExt'), '.md');
        assert.strictEqual(stateMap.get('lastExportPath'), vscode.Uri.file('/tmp').fsPath);
    });

    test('exportChat saves as JSON when URI ends with .json and updates state', async () => {
        const chat: Chat = {
            id: '1',
            modelName: 'llama3',
            name: 'Test Chat',
            messages: [],
            createdAt: Date.now(),
        };
        const node = new OllamaChatItem(chat);

        const saveUri = vscode.Uri.file('/tmp/data/test-chat.json');
        sandbox.stub(vscode.window, 'showSaveDialog').resolves(saveUri);
        const writeFileStub = sandbox.stub(vscode.workspace.fs, 'writeFile').resolves();
        sandbox.stub(vscode.window, 'showInformationMessage').resolves();

        const toJSONSpy = sandbox.spy(exportService, 'toJSON');

        await chatCommands.exportChat(node);

        assert.ok(toJSONSpy.calledOnce);
        assert.ok(writeFileStub.calledOnce);
        assert.strictEqual(stateMap.get('lastExportExt'), '.json');
        assert.strictEqual(stateMap.get('lastExportPath'), vscode.Uri.file('/tmp/data').fsPath);
    });

    test('exportChat appends default extension if missing from URI', async () => {
        const chat: Chat = {
            id: '1',
            modelName: 'llama3',
            name: 'Test Chat',
            messages: [],
            createdAt: Date.now(),
        };
        const node = new OllamaChatItem(chat);

        stateMap.set('lastExportExt', '.json'); // Set default to json

        // User typed just "test-chat" with no extension
        const saveUri = vscode.Uri.file('/tmp/test-chat');
        sandbox.stub(vscode.window, 'showSaveDialog').resolves(saveUri);
        const writeFileStub = sandbox.stub(vscode.workspace.fs, 'writeFile').resolves();
        sandbox.stub(vscode.window, 'showInformationMessage').resolves();

        const toJSONSpy = sandbox.spy(exportService, 'toJSON');

        await chatCommands.exportChat(node);

        assert.ok(toJSONSpy.calledOnce);

        // Should have appended .json to the write URI
        const writtenUri = writeFileStub.firstCall.args[0] as vscode.Uri;
        assert.strictEqual(writtenUri.fsPath, vscode.Uri.file('/tmp/test-chat.json').fsPath);
    });

    suite('importChat', () => {
        let showOpenDialogStub: sinon.SinonStub;
        let readFileStub: sinon.SinonStub;
        let handleChatImportStub: sinon.SinonStub;
        let showErrorMessageStub: sinon.SinonStub;

        setup(() => {
            showOpenDialogStub = sandbox.stub(vscode.window, 'showOpenDialog').resolves();
            readFileStub = sandbox.stub(vscode.workspace.fs, 'readFile').resolves(Buffer.from('{"id":"1"}'));
            showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves();
            chatOrchestrator.handleChatImport = sandbox.stub().resolves();
            handleChatImportStub = chatOrchestrator.handleChatImport as sinon.SinonStub;
        });

        test('should import from selected URI if triggered from Command Palette', async () => {
            const uri = vscode.Uri.file('/tmp/chat.json');
            showOpenDialogStub.resolves([uri]);
            handleChatImportStub.resolves({ id: 'imported', name: 'Chat' });

            await chatCommands.importChat();

            assert.ok(showOpenDialogStub.calledOnce);
            assert.ok(readFileStub.calledWith(uri));
            assert.ok(handleChatImportStub.calledWith('{"id":"1"}', undefined));
        });

        test('should import from provided URI if triggered from Explorer context menu', async () => {
            const uri = vscode.Uri.file('/tmp/chat2.json');
            handleChatImportStub.resolves({ id: 'imported', name: 'Chat' });

            await chatCommands.importChat(uri);

            assert.ok(showOpenDialogStub.notCalled);
            assert.ok(readFileStub.calledWith(uri));
            assert.ok(handleChatImportStub.calledWith('{"id":"1"}', undefined));
        });

        test('should pass targetModelName if triggered from model context menu', async () => {
            const uri = vscode.Uri.file('/tmp/chat3.json');
            showOpenDialogStub.resolves([uri]);
            handleChatImportStub.resolves({ id: 'imported', name: 'Chat' });

            const modelItem = new OllamaModelItem({ name: 'llama3' } as any);

            await chatCommands.importChat(modelItem);

            assert.ok(showOpenDialogStub.calledOnce);
            assert.ok(readFileStub.calledWith(uri));
            assert.ok(handleChatImportStub.calledWith('{"id":"1"}', 'llama3'));
        });

        test('should pass targetModelName if triggered from instance context menu', async () => {
            const uri = vscode.Uri.file('/tmp/chat4.json');
            showOpenDialogStub.resolves([uri]);
            handleChatImportStub.resolves({ id: 'imported', name: 'Chat' });

            const instanceItem = new OllamaInstanceItem({ modelName: 'llama3' } as any, false);

            await chatCommands.importChat(instanceItem);

            assert.ok(showOpenDialogStub.calledOnce);
            assert.ok(readFileStub.calledWith(uri));
            assert.ok(handleChatImportStub.calledWith('{"id":"1"}', 'llama3'));
        });

        test('should do nothing if dialog is cancelled', async () => {
            showOpenDialogStub.resolves(undefined);

            await chatCommands.importChat();

            assert.ok(readFileStub.notCalled);
            assert.ok(handleChatImportStub.notCalled);
        });

        test('should catch and log read errors', async () => {
            const uri = vscode.Uri.file('/tmp/chat.json');
            showOpenDialogStub.resolves([uri]);
            readFileStub.rejects(new Error('Permission denied'));

            await chatCommands.importChat();

            assert.ok(showErrorMessageStub.calledOnce);
            assert.ok(showErrorMessageStub.calledWith(sinon.match(/Failed to read file/)));
            assert.ok(handleChatImportStub.notCalled);
        });
    });
});
