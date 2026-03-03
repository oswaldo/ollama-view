import { 
    Workbench,
    WebView,
    By
} from 'vscode-extension-tester';
import { SidebarHelpers } from './sidebarHelpers';

export class SetupHelpers {
    /**
     * Opens the setup panel for a specific model instance via sidebar context menu.
     */
    public static async openSetup(modelLabel: string): Promise<WebView> {
        await SidebarHelpers.executeAction(modelLabel, 'Setup');
        
        const workbench = new Workbench();
        const editorView = workbench.getEditorView();
        
        let setupEditor = await editorView.openEditor(`Setup: ${modelLabel}`);
        if (!setupEditor) {
            await new Promise(res => setTimeout(res, 2000));
            setupEditor = await editorView.openEditor(`Setup: ${modelLabel}`);
        }
        
        if (!setupEditor) {
            throw new Error(`Could not find setup editor for model: ${modelLabel}`);
        }

        const webview = new WebView();
        await webview.switchToFrame();
        return webview;
    }

    /**
     * Updates a field in the setup webview.
     */
    public static async setField(webview: WebView, id: string, value: string | number | boolean): Promise<void> {
        const element = await webview.findWebElement(By.id(id));
        const type = await element.getAttribute('type');
        
        if (type === 'checkbox') {
            const checked = await element.isSelected();
            if (checked !== value) {
                await element.click();
            }
        } else {
            await element.clear();
            await element.sendKeys(String(value));
        }
    }

    /**
     * Gets the value of a field in the setup webview.
     */
    public static async getFieldValue(webview: WebView, id: string): Promise<string> {
        const element = await webview.findWebElement(By.id(id));
        return await element.getAttribute('value');
    }

    /**
     * Saves the changes in the setup webview.
     */
    public static async save(webview: WebView): Promise<void> {
        const saveBtn = await webview.findWebElement(By.id('save-btn'));
        await saveBtn.click();
        await new Promise(res => setTimeout(res, 1000));
    }

    /**
     * Cancels the changes in the setup webview.
     */
    public static async cancel(webview: WebView): Promise<void> {
        const cancelBtn = await webview.findWebElement(By.id('cancel-btn'));
        await cancelBtn.click();
    }

    /**
     * Resets all fields to original model defaults.
     */
    public static async resetToDefault(webview: WebView): Promise<void> {
        const resetBtn = await webview.findWebElement(By.id('reset-btn'));
        await resetBtn.click();
    }

    /**
     * Expands a details section in the setup webview if it's not already open.
     */
    public static async expandSection(webview: WebView, summaryText: string): Promise<void> {
        const details = await webview.findWebElements(By.tagName('details'));
        for (const detail of details) {
            const summary = await detail.findElement(By.tagName('summary'));
            const text = await summary.getText();
            if (text.includes(summaryText)) {
                const isOpen = await detail.getAttribute('open');
                if (!isOpen) {
                    await summary.click();
                }
                return;
            }
        }
    }
}
