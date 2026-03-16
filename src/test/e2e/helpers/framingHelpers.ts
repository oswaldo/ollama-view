import { 
    By,
    TreeItem,
    WebView,
    Workbench} from 'vscode-extension-tester';

import { SidebarHelpers } from './sidebarHelpers';

export class FramingHelpers {
    private static readonly SECTION_FRAMING = 'Model Framing';

    /**
     * Opens the framing editor for a specific framing via sidebar.
     */
    public static async openFraming(label: string): Promise<WebView> {
        const section = await SidebarHelpers.getSection(this.SECTION_FRAMING);
        
        // Find the framing item (might be nested under a tag)
        let framingItem: TreeItem | undefined;
        const items = await section.getVisibleItems() as TreeItem[];
        for (const item of items) {
            const itemLabel = await item.getLabel();
            if (itemLabel.includes(label)) {
                framingItem = item;
                break;
            }
        }

        if (!framingItem) {
            throw new Error(`Could not find framing item with label: ${label}`);
        }

        await framingItem.click(); // Standard click opens the editor
        
        const workbench = new Workbench();
        const editorView = workbench.getEditorView();
        
        // The title is "Framing: <name>"
        let framingEditor = await editorView.openEditor(`Framing: ${label}`);
        if (!framingEditor) {
            await new Promise(res => setTimeout(res, 2000));
            framingEditor = await editorView.openEditor(`Framing: ${label}`);
        }
        
        if (!framingEditor) {
            throw new Error(`Could not find framing editor for: ${label}`);
        }

        const webview = new WebView();
        await webview.switchToFrame();
        return webview;
    }

    /**
     * Updates a field in the framing webview.
     */
    public static async setField(webview: WebView, id: string, value: string): Promise<void> {
        const element = await webview.findWebElement(By.id(id));
        await element.clear();
        await element.sendKeys(value);
    }

    /**
     * Saves the framing.
     */
    public static async save(webview: WebView): Promise<void> {
        const saveBtn = await webview.findWebElement(By.id('save-btn'));
        await saveBtn.click();
        await new Promise(res => setTimeout(res, 1000));
    }

    /**
     * Deletes the framing from the editor.
     */
    public static async delete(webview: WebView): Promise<void> {
        const deleteBtn = await webview.findWebElement(By.id('delete-btn'));
        await deleteBtn.click();
        // Handle confirmation if any
    }

    /**
     * Duplicates the framing.
     */
    public static async duplicate(webview: WebView): Promise<void> {
        const duplicateBtn = await webview.findWebElement(By.id('duplicate-btn'));
        await duplicateBtn.click();
        await new Promise(res => setTimeout(res, 1000));
    }
}
