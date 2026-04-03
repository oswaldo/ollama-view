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
});
