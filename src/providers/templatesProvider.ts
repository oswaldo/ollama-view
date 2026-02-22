import * as vscode from 'vscode';
import { TemplateService } from '../services/templateService';
import { Template, Tag, TemplateSource } from '../models/template';

/**
 * Represents a template in the tree view.
 */
export class TemplateItem extends vscode.TreeItem {
    constructor(public readonly template: Template) {
        super(template.name, vscode.TreeItemCollapsibleState.None);
        
        this.tooltip = template.description || template.name;
        this.description = template.source === TemplateSource.BuiltIn ? 'Built-in' : '';
        this.contextValue = template.source === TemplateSource.BuiltIn ? 'template-builtin' : 'template-user';
        this.iconPath = new vscode.ThemeIcon('file-code');
        
        // Command to open the template editor
        this.command = {
            command: 'ollamaView.editTemplate',
            title: 'Edit Template',
            arguments: [this]
        };
    }
}

/**
 * Represents a tag folder in the tree view.
 */
export class TagItem extends vscode.TreeItem {
    constructor(public readonly tag: Tag) {
        super(tag.name, vscode.TreeItemCollapsibleState.Collapsed);
        
        this.tooltip = `Tag: ${tag.name}`;
        this.contextValue = tag.isReserved ? 'tag-reserved' : 'tag-custom';
        this.iconPath = new vscode.ThemeIcon('tag');
    }
}

export type TemplatesTreeItem = TemplateItem | TagItem;

/**
 * TreeDataProvider for the Templates sidebar view.
 */
export class TemplatesProvider implements vscode.TreeDataProvider<TemplatesTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TemplatesTreeItem | undefined | null | void> =
        new vscode.EventEmitter<TemplatesTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TemplatesTreeItem | undefined | null | void> =
        this._onDidChangeTreeData.event;

    constructor(private templateService: TemplateService) {}

    /**
     * Refreshes the tree view.
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TemplatesTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: TemplatesTreeItem): Promise<TemplatesTreeItem[]> {
        if (!element) {
            // Root level: Show Tags
            const tags = this.templateService.getAllTags();
            return tags.map(tag => new TagItem(tag));
        }

        if (element instanceof TagItem) {
            // Tag level: Show Templates under this tag
            const templates = this.templateService.getTemplatesByTag(element.tag.name);
            return templates.map(t => new TemplateItem(t));
        }

        // Templates (leaf nodes) have no children
        return [];
    }
}
