/* eslint-disable @typescript-eslint/no-explicit-any */
export enum TreeItemCollapsibleState {
    None = 0,
    Collapsed = 1,
    Expanded = 2,
}

export class TreeItem {
    constructor(
        public readonly label: string | { label: string },
        public readonly collapsibleState?: TreeItemCollapsibleState,
    ) {}
}

export class ThemeIcon {
    constructor(public readonly id: string) {}
}

export class EventEmitter<T> {
    private _listeners: ((data: T) => void)[] = [];
    event = (listener: (data: T) => void) => {
        this._listeners.push(listener);
        return { dispose: () => {} };
    };
    fire(data: T): void {
        this._listeners.forEach((l) => l(data));
    }
}

export const window = {
    showInformationMessage: async () => {},
    showWarningMessage: async () => {},
    showErrorMessage: async () => {},
    showQuickPick: async () => {},
    showSaveDialog: async () => {},
    createWebviewPanel: () => ({}),
    createOutputChannel: () => ({
        appendLine: () => {},
        show: () => {},
        dispose: () => {},
    }),
    withProgress: async (_options: any, task: (progress: any) => Promise<any>) => {
        return await task({ report: () => {} });
    },
};

export const workspace = {
    getConfiguration: () => ({
        get: () => {},
        update: async () => {},
    }),
    fs: {
        writeFile: async () => {},
    },
    onDidChangeConfiguration: new EventEmitter<any>().event,
};

export const commands = {
    executeCommand: async () => {},
};

export enum ViewColumn {
    Active = -1,
    Beside = -2,
    One = 1,
    Two = 2,
    Three = 3,
}

export class Uri {
    static file(path: string) {
        return { fsPath: path };
    }
    static parse(url: string) {
        return { url };
    }
}
