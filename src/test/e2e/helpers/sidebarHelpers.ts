import { expect } from 'chai';
import {
    By,
    DefaultTreeSection,
    InputBox,
    Key,
    ModalDialog,
    NotificationType,
    TreeItem,
    VSBrowser,
    Workbench,
} from 'vscode-extension-tester';

export class SidebarHelpers {
    private static readonly SECTION_MODELS = 'Models';

    // ─────────────────────────────────────────────────────────────────
    //  Low-level input helpers
    // ─────────────────────────────────────────────────────────────────

    /**
     * Executes a VS Code command via the Command Palette using raw keyboard actions.
     * This avoids issues with Workbench.executeCommand() that can occur in CI.
     */
    public static async safeExecuteCommand(commandTitle: string): Promise<void> {
        const workbench = new Workbench();
        await workbench.openCommandPrompt();
        await new Promise(r => setTimeout(r, 1000));
        
        const driver = VSBrowser.instance.driver;
        await driver.actions().sendKeys(commandTitle).perform();
        await new Promise(r => setTimeout(r, 1000));
        await driver.actions().sendKeys(Key.ENTER).perform();
        await new Promise(r => setTimeout(r, 1000));
    }

    /**
     * Safely type text into the currently-focused InputBox via raw WebDriver key actions.
     * This bypasses InputBox.setText() which internally calls clear() — and that triggers
     * ElementNotInteractableError on newer VS Code / ChromeDriver combinations.
     */
    public static async safeSetInputText(text: string): Promise<void> {
        const driver = VSBrowser.instance.driver;
        await driver.actions().keyDown(Key.CONTROL).sendKeys('a').keyUp(Key.CONTROL).perform();
        await new Promise(r => setTimeout(r, 200));
        await driver.actions().sendKeys(text).perform();
        await new Promise(r => setTimeout(r, 500));
    }

    /**
     * Click an inline action button on a tree item.
     * Uses the built-in getActionButton() API which handles hover automatically.
     */
    public static async clickInlineAction(item: TreeItem, actionTitle: string): Promise<void> {
        const button = await item.getActionButton(actionTitle);
        if (!button) {
            const buttons = await item.getActionButtons();
            const labels = await Promise.all(buttons.map(async b => await b.getLabel()));
            throw new Error(`Inline action '${actionTitle}' not found. Available: ${labels.join(', ')}`);
        }
        await button.click();
        await new Promise(r => setTimeout(r, 500));
    }

    /**
     * Confirms a VS Code modal dialog by clicking a button with the given title.
     * Tries ModalDialog API first, then falls back to raw WebDriver element search.
     */
    public static async confirmDialog(buttonTitle: string, timeoutMs: number = 10000): Promise<void> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
            // Attempt 1: ModalDialog page object
            try {
                const dialog = new ModalDialog();
                await dialog.pushButton(buttonTitle);
                return;
            } catch {
                // Dialog might not be ready yet
            }

            // Attempt 2: Raw WebDriver — find visible button matching the title
            try {
                const driver = VSBrowser.instance.driver;
                const buttons = await driver.findElements(
                    By.xpath(`//a[@role='button' and contains(@class,'dialog-button') and text()='${buttonTitle}']`)
                );
                for (const btn of buttons) {
                    if (await btn.isDisplayed()) {
                        await btn.click();
                        return;
                    }
                }
                // Also try generic buttons
                const genericButtons = await driver.findElements(
                    By.xpath(`//*[@role='button' and normalize-space(text())='${buttonTitle}']`)
                );
                for (const btn of genericButtons) {
                    if (await btn.isDisplayed()) {
                        await btn.click();
                        return;
                    }
                }
            } catch {
                // Ignore and retry
            }

            await new Promise(res => setTimeout(res, 500));
        }

        throw new Error(`Could not find and click '${buttonTitle}' dialog button within ${timeoutMs}ms`);
    }

    // ─────────────────────────────────────────────────────────────────
    //  Tree navigation
    // ─────────────────────────────────────────────────────────────────

    /**
     * Gets a specific section from the Ollama View sidebar.
     */
    public static async getSection(name: string): Promise<DefaultTreeSection> {
        const workbench = new Workbench();
        for (let i = 0; i < 10; i++) {
            try {
                const sidebar = await workbench.getSideBar();
                const content = sidebar.getContent();
                const section = await content.getSection(name);
                if (section) { return section as DefaultTreeSection; }
            } catch {
                // Ignore and retry
            }
            await new Promise(res => setTimeout(res, 500));
        }
        throw new Error(`Failed to find section: ${name} after 5 seconds`);
    }

    /**
     * Finds a model item in the 'Models' section by its label.
     * Polls until found or timeout.
     */
    public static async findModelItem(label: string, timeout: number = 10000): Promise<TreeItem | undefined> {
        const section = await this.getSection(this.SECTION_MODELS);
        
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            const items = await section.getVisibleItems() as TreeItem[];
            for (const item of items) {
                const itemLabel = await item.getLabel();
                if (itemLabel.includes(label)) {
                    return item;
                }
            }
            await new Promise(res => setTimeout(res, 500));
        }
        return undefined;
    }

    /**
     * Finds a specific instance item under a root model.
     * Automatically expands the parent if needed.
     */
    public static async findInstanceItem(modelName: string, instanceName: string, timeout: number = 10000): Promise<TreeItem | undefined> {
        const rootItem = await this.findModelItem(modelName, timeout);
        if (!rootItem) { return undefined; }

        if (!(await rootItem.isExpanded())) {
            await rootItem.expand();
            await new Promise(res => setTimeout(res, 1000));
        }

        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            const children = await rootItem.getChildren();
            for (const child of children) {
                const label = await child.getLabel();
                if (label.includes(instanceName)) {
                    return child as TreeItem;
                }
            }
            await new Promise(res => setTimeout(res, 500));
        }
        return undefined;
    }

    /**
     * Generic wait-until-item-appears helper. Useful after operations that
     * trigger the extension's own refresh (start, stop, create, delete).
     * The extension auto-refreshes the tree after commands, so explicit
     * refresh() calls are not needed — just wait for the DOM to update.
     */
    public static async waitForItem(
        finder: () => Promise<TreeItem | undefined>,
        description: string,
        timeoutMs: number = 15000,
    ): Promise<TreeItem> {
        const startTime = Date.now();
        while (Date.now() - startTime < timeoutMs) {
            const item = await finder();
            if (item) { return item; }
            await new Promise(res => setTimeout(res, 1000));
        }
        throw new Error(`Timed out waiting for: ${description}`);
    }

    /**
     * Waits for an item to disappear from the tree.
     */
    public static async waitForItemGone(
        finder: () => Promise<TreeItem | undefined>,
        description: string,
        timeoutMs: number = 15000,
    ): Promise<void> {
        const startTime = Date.now();
        while (Date.now() - startTime < timeoutMs) {
            const item = await finder();
            if (!item) { return; }
            await new Promise(res => setTimeout(res, 1000));
        }
        throw new Error(`Timed out waiting for item to disappear: ${description}`);
    }

    // ─────────────────────────────────────────────────────────────────
    //  Context menu actions
    // ─────────────────────────────────────────────────────────────────

    /**
     * Executes a context menu action on a model/instance item.
     */
    public static async executeAction(labelOrItem: string | TreeItem, actionName: string): Promise<void> {
        let item: TreeItem;
        let labelStr = '';
        if (typeof labelOrItem === 'string') {
            let foundItem = await this.findModelItem(labelOrItem);
            if (!foundItem) {
                const section = await this.getSection(this.SECTION_MODELS);
                const items = await section.getVisibleItems() as TreeItem[];
                for (const i of items) {
                    const l = await i.getLabel();
                    if (l.includes(labelOrItem)) {
                        foundItem = i;
                        break;
                    }
                }
            }
            if (!foundItem) {
                throw new Error(`Could not find item with label: ${labelOrItem}`);
            }
            item = foundItem;
            labelStr = labelOrItem;
        } else {
            item = labelOrItem;
            labelStr = await item.getLabel();
        }
        
        console.log(`Executing action '${actionName}' on item '${labelStr}'`);
        
        await item.select(); 
        const menu = await item.openContextMenu();
        await new Promise(res => setTimeout(res, 500));
        
        const action = await menu.getItem(actionName);
        if (!action) {
            const items = await menu.getItems();
            const available = await Promise.all(items.map(i => i.getLabel()));
            console.log(`Available actions: ${available.join(', ')}`);
            await menu.close();
            throw new Error(`Could not find action '${actionName}' for item '${labelStr}'. Available: ${available.join(', ')}`);
        }
        await action.click();
    }

    // ─────────────────────────────────────────────────────────────────
    //  High-level model operations
    // ─────────────────────────────────────────────────────────────────

    /**
     * Refreshes the model tree view via the command palette.
     * NOTE: Prefer relying on the extension's auto-refresh after operations.
     * Use this only for initial setup (e.g. after adding models to the mock).
     */
    public static async refresh(): Promise<void> {
        await this.safeExecuteCommand('Ollama View: Refresh');
        await new Promise(res => setTimeout(res, 1000));
    }

    /**
     * Pulls a model by name using the Command Palette.
     */
    public static async pullModel(name: string): Promise<void> {
        const section = await this.getSection(this.SECTION_MODELS);
        const action = await section.getAction('Pull Model');
        if (!action) {
            throw new Error('Pull Model action not found on Models section title');
        }
        await action.click();
        
        await new Promise(res => setTimeout(res, 500));
        await InputBox.create();
        await this.safeSetInputText(name);
        const driver = VSBrowser.instance.driver;
        await driver.actions().sendKeys(Key.ENTER).perform();
        await new Promise(res => setTimeout(res, 500));
        
        // Wait for success notification
        const workbench = new Workbench();
        const center = await workbench.openNotificationsCenter();
        let successFound = false;
        
        for (let i = 0; i < 20; i++) {
            const notifications = await center.getNotifications(NotificationType.Any);
            for (const notification of notifications) {
                const text = await notification.getMessage();
                if (text.includes(`Successfully pulled ${name}`)) {
                    successFound = true;
                    await notification.dismiss();
                    break;
                }
            }
            if (successFound) {break;}
            await new Promise(res => setTimeout(res, 1000));
        }
        
        await center.close();
        expect(successFound, `Model ${name} should be pulled successfully`).to.equal(true);
    }

    /**
     * Creates a new instance for a model via context menu.
     * Returns the instance name.
     */
    public static async createInstance(modelLabel: string): Promise<string> {
        await this.executeAction(modelLabel, 'Create New Instance');
        
        await new Promise(res => setTimeout(res, 500));
        await InputBox.create();
        const instanceName = `${modelLabel}-inst`;
        await this.safeSetInputText(instanceName);
        const driver = VSBrowser.instance.driver;
        await driver.actions().sendKeys(Key.ENTER).perform();
        
        await new Promise(res => setTimeout(res, 2000));
        return instanceName;
    }

    /**
     * Starts a model instance via context menu.
     */
    public static async startModel(labelOrItem: string | TreeItem): Promise<void> {
        try {
            await this.executeAction(labelOrItem, 'Start');
        } catch {
            console.log(`Fallback: Executing start command via workbench`);
            if (typeof labelOrItem !== 'string') { await labelOrItem.select(); }
            const workbench = new Workbench();
            await workbench.executeCommand('ollamaView.start');
        }
    }

    /**
     * Stops a model instance via context menu.
     */
    public static async stopModel(labelOrItem: string | TreeItem): Promise<void> {
        try {
            await this.executeAction(labelOrItem, 'Stop');
        } catch {
            console.log(`Fallback: Executing stop command via workbench`);
            if (typeof labelOrItem !== 'string') { await labelOrItem.select(); }
            const workbench = new Workbench();
            await workbench.executeCommand('ollamaView.stop');
        }
    }

    /**
     * Deletes a model via context menu and confirms the modal dialog.
     */
    public static async deleteModel(labelOrItem: string | TreeItem): Promise<void> {
        try {
            await this.executeAction(labelOrItem, 'Delete');
        } catch {
            const labelStr = typeof labelOrItem === 'string' ? labelOrItem : await labelOrItem.getLabel();
            console.log(`Fallback: Executing delete command via workbench for ${labelStr}`);
            if (typeof labelOrItem !== 'string') { await labelOrItem.select(); }
            const workbench = new Workbench();
            await workbench.executeCommand('ollamaView.delete');
        }
        
        // The extension shows a modal warning dialog with a "Delete" confirmation button
        await this.confirmDialog('Delete');
    }

    // ─────────────────────────────────────────────────────────────────
    //  Composite setup helpers
    // ─────────────────────────────────────────────────────────────────

    /**
     * Full setup sequence: adds a model to the mock, refreshes the tree,
     * creates an instance, and returns the instance name and tree item.
     * This encapsulates the most common test setup pattern.
     */
    public static async setupInstance(modelName: string): Promise<{
        instanceName: string;
        instanceItem: TreeItem;
    }> {
        const instanceName = await this.createInstance(modelName);
        
        const instanceItem = await this.waitForItem(
            () => this.findInstanceItem(modelName, instanceName),
            `instance '${instanceName}' under '${modelName}'`,
        );
        
        return { instanceName, instanceItem };
    }

    /**
     * Full setup + start sequence: creates an instance, starts it,
     * and returns the running instance item.
     */
    public static async setupRunningInstance(modelName: string): Promise<{
        instanceName: string;
        instanceItem: TreeItem;
    }> {
        const { instanceName, instanceItem } = await this.setupInstance(modelName);
        
        await this.startModel(instanceItem);
        
        // Wait for the tree to reflect "Running" status
        const runningItem = await this.waitForItem(
            async () => {
                const item = await this.findInstanceItem(modelName, instanceName);
                if (!item) { return undefined; }
                const label = await item.getLabel();
                const tooltip = await item.getTooltip();
                if (label?.includes('Running') || tooltip?.includes('Running')) {
                    return item;
                }
                return undefined;
            },
            `instance '${instanceName}' to show as Running`,
        );
        
        return { instanceName, instanceItem: runningItem };
    }
}
