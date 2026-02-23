import * as vscode from 'vscode';
import { FramingService } from '../services/framingService';
import { ModelFraming, FramingTag, FramingSource } from '../models/modelFraming';

/**
 * Represents a framing in the tree view.
 */
export class FramingItem extends vscode.TreeItem {
    constructor(public readonly framing: ModelFraming) {
        super(framing.name, vscode.TreeItemCollapsibleState.None);
        
        this.tooltip = framing.description || framing.name;
        this.description = framing.source === FramingSource.BuiltIn ? 'Built-in' : '';
        this.contextValue = framing.source === FramingSource.BuiltIn ? 'framing-builtin' : 'framing-user';
        this.iconPath = new vscode.ThemeIcon('file-code');
        
        // Command to open the framing editor
        this.command = {
            command: 'ollamaView.editFraming',
            title: 'Edit Model Framing',
            arguments: [this]
        };
    }
}

/**
 * Represents a tag folder in the tree view.
 */
export class FramingTagItem extends vscode.TreeItem {
    constructor(public readonly tag: FramingTag) {
        super(tag.name, vscode.TreeItemCollapsibleState.Collapsed);
        
        this.tooltip = `Tag: ${tag.name}`;
        this.contextValue = tag.isReserved ? 'tag-reserved' : 'tag-custom';
        this.iconPath = new vscode.ThemeIcon('tag');
    }
}

export type FramingTreeItem = FramingItem | FramingTagItem;

/**
 * TreeDataProvider for the Model Framings sidebar view.
 */
export class FramingProvider implements vscode.TreeDataProvider<FramingTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FramingTreeItem | undefined | null | void> =
        new vscode.EventEmitter<FramingTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<FramingTreeItem | undefined | null | void> =
        this._onDidChangeTreeData.event;

    constructor(private framingService: FramingService) {}

    /**
     * Refreshes the tree view.
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: FramingTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: FramingTreeItem): Promise<FramingTreeItem[]> {
        if (!element) {
            // Root level: Show Tags
            const tags = this.framingService.getAllTags();
            return tags.map(tag => new FramingTagItem(tag));
        }

        if (element instanceof FramingTagItem) {
            // Tag level: Show Framings under this tag
            const framings = this.framingService.getFramingsByTag(element.tag.name);
            return framings.map(f => new FramingItem(f));
        }

        // Framings (leaf nodes) have no children
        return [];
    }
}
