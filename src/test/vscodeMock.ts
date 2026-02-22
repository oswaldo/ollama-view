export enum TreeItemCollapsibleState {
    None = 0,
    Collapsed = 1,
    Expanded = 2
}

export class TreeItem {
    constructor(public readonly label: string | { label: string }, public readonly collapsibleState?: TreeItemCollapsibleState) {}
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
        this._listeners.forEach(l => l(data));
    }
}

export const window = {
    showInformationMessage: async () => {},
    showWarningMessage: async () => {},
    showQuickPick: async () => {},
};

export class Uri {
    static file(path: string) {
        return { fsPath: path };
    }
    static parse(url: string) {
        return { url };
    }
}
