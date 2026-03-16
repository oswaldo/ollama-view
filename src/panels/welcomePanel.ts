import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { WelcomeExtensionToWebviewCommand, WelcomeWebviewToExtensionCommand } from '../contracts/IWelcomeWebviewMessages';
import { assertNever } from '../utils';

export class WelcomePanel {
    public static currentPanel: WelcomePanel | undefined;
    public static readonly viewType = 'ollamaWelcome';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private readonly _version: string;
    private readonly _isFirstInstall: boolean;

    public static createOrShow(extensionUri: vscode.Uri, version: string, isFirstInstall: boolean) {
        if (WelcomePanel.currentPanel) {
            WelcomePanel.currentPanel._panel.reveal();
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            WelcomePanel.viewType,
            `Welcome to Ollama View ${version}`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(extensionUri.fsPath, 'media')),
                    vscode.Uri.file(path.join(extensionUri.fsPath, 'dist')),
                ],
            },
        );

        WelcomePanel.currentPanel = new WelcomePanel(panel, extensionUri, version, isFirstInstall);
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        version: string,
        isFirstInstall: boolean,
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._version = version;
        this._isFirstInstall = isFirstInstall;

        this._update();

        this._panel.webview.onDidReceiveMessage(
            async (message: WelcomeWebviewToExtensionCommand) => {
                switch (message.command) {
                    case 'configureOllama':
                        // If no specific model is provided, we should probably focus the models view
                        // or show a quickpick. For now, let's try to trigger the command.
                        vscode.commands.executeCommand('ollamaView.setup');
                        return;
                    case 'configureConnection':
                        vscode.commands.executeCommand('workbench.action.openSettings', 'ollama-view.apiUrl');
                        return;
                    case 'startChat':
                        vscode.commands.executeCommand('ollamaView.startChat');
                        return;
                    case 'openExternal':
                        vscode.env.openExternal(vscode.Uri.parse(message.url));
                        return;
                    default:
                        assertNever(message);
                }
            },
            null,
            this._disposables,
        );

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    public dispose() {
        WelcomePanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        this._panel.webview.html = this._getHtmlForWebview();

        setTimeout(() => {
            this._panel.webview.postMessage({
                command: 'init',
                version: this._version,
                isFirstInstall: this._isFirstInstall,
            } as WelcomeExtensionToWebviewCommand);
        }, 100);
    }

    private _getHtmlForWebview() {
        const htmlPath = path.join(this._extensionUri.fsPath, 'media', 'welcome.html');
        let html = '';
        try {
            html = fs.readFileSync(htmlPath, 'utf8');
        } catch {
            html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome to Ollama View</title>
                <link rel="stylesheet" href="{{styleUri}}">
                <link rel="stylesheet" href="{{welcomeStyleUri}}">
            </head>
            <body>
                <div id="app">
                    <h1>Welcome to Ollama View</h1>
                    <p>Loading...</p>
                </div>
                <script src="{{scriptUri}}"></script>
            </body>
            </html>`;
        }

        const scriptUri = this._panel.webview.asWebviewUri(
            vscode.Uri.file(path.join(this._extensionUri.fsPath, 'dist', 'webview', 'welcome.js')),
        );
        const styleUri = this._panel.webview.asWebviewUri(
            vscode.Uri.file(path.join(this._extensionUri.fsPath, 'media', 'common-webview.css')),
        );
        const welcomeStyleUri = this._panel.webview.asWebviewUri(
            vscode.Uri.file(path.join(this._extensionUri.fsPath, 'media', 'welcome.css')),
        );
        const logoUri = this._panel.webview.asWebviewUri(
            vscode.Uri.file(path.join(this._extensionUri.fsPath, 'media', 'logo.svg')),
        );

        html = html.replace('{{scriptUri}}', scriptUri.toString());
        html = html.replace('{{styleUri}}', styleUri.toString());
        html = html.replace('{{welcomeStyleUri}}', welcomeStyleUri.toString());
        html = html.replace('{{logoUri}}', logoUri.toString());

        return html;
    }
}
