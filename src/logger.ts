import type * as vscode from 'vscode';

export class Logger {
    private static _outputChannel: vscode.OutputChannel | undefined;
    private static _isVscodeAvailable: boolean | undefined;

    private static checkVscode(): boolean {
        if (this._isVscodeAvailable !== undefined) {
            return this._isVscodeAvailable;
        }
        try {
            // We use a dynamic require to avoid failing at top-level if vscode is missing
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require('vscode');
            this._isVscodeAvailable = true;
        } catch {
            this._isVscodeAvailable = false;
        }
        return this._isVscodeAvailable;
    }

    public static init() {
        if (this.checkVscode() && !this._outputChannel) {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const vscodeReq = require('vscode');
            this._outputChannel = vscodeReq.window.createOutputChannel('Ollama View');
        }
    }

    public static info(message: string) {
        this.log('INFO', message);
    }

    public static warn(message: string) {
        this.log('WARN', message);
    }

    public static error(message: string, error?: any) {
        let fullMessage = message;
        if (error) {
            if (error instanceof Error) {
                fullMessage += `: ${error.message}\n${error.stack}`;
            } else {
                fullMessage += `: ${JSON.stringify(error)}`;
            }
        }
        this.log('ERROR', fullMessage);
        if (this._outputChannel) {
            this._outputChannel.show(true); 
        }
    }

    private static log(level: string, message: string) {
        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] [${level}] ${message}`;
        
        if (this.checkVscode()) {
            if (!this._outputChannel) {
                this.init();
            }
            this._outputChannel?.appendLine(formattedMessage);
        } else {
            // Fallback to console for tests/CLI
            if (level === 'ERROR') {
                console.error(formattedMessage);
            } else {
                console.log(formattedMessage);
            }
        }
    }
}
