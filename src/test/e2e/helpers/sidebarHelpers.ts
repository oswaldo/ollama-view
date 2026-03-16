import { expect } from 'chai';
import { 
    By,    DefaultTreeSection,
    InputBox,
    ModalDialog,
    NotificationType,
    TreeItem,
    Workbench} from 'vscode-extension-tester';

export class SidebarHelpers {
    private static readonly SECTION_MODELS = 'Models';

    /**
     * Gets a specific section from the Ollama View sidebar.
     */
    public static async getSection(name: string): Promise<DefaultTreeSection> {
        const workbench = new Workbench();
        const sidebar = await workbench.getSideBar();
        const content = sidebar.getContent();
        return await content.getSection(name) as DefaultTreeSection;
    }

    /**
     * Finds a model item in the 'Models' section by its label.
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
     * Pulls a model by name using the Command Palette/UI button.
     */
    public static async pullModel(name: string): Promise<void> {
        const workbench = new Workbench();
        await workbench.executeCommand('ollamaView.pull');
        
        const input = await InputBox.create();
        await input.setText(name);
        await input.confirm();
        
        // Wait for success notification
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
     * Refreshes the model tree view.
     */
    public static async refresh(): Promise<void> {
        const workbench = new Workbench();
        await workbench.executeCommand('ollamaView.refresh');
        await new Promise(res => setTimeout(res, 1000));
    }

    /**
     * Finds a specific instance item under a root model.
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
     * Executes a context menu action on a model item.
     */
    public static async executeAction(labelOrItem: string | TreeItem, actionName: string): Promise<void> {
        let item: TreeItem;
        let labelStr = '';
        if (typeof labelOrItem === 'string') {
            let foundItem = await this.findModelItem(labelOrItem);
            if (!foundItem) {
                // Try finding it as an instance if not found as a root model
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
        
        try {
            // Scroll into view first
            await item.select(); 
            const menu = await item.openContextMenu();
            
            // Wait a bit for menu to be ready
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
        } catch (error) {
            console.error(`Failed to execute action via context menu: ${error}`);
            throw error;
        }
    }

    /**
     * Creates a new instance for a model.
     */
    public static async createInstance(modelLabel: string): Promise<string> {
        await this.executeAction(modelLabel, 'Create New Instance');
        
        // Handle input box for instance name
        const input = await InputBox.create();
        const instanceName = `${modelLabel}-inst`;
        await input.setText(instanceName);
        await input.confirm(); 
        
        await new Promise(res => setTimeout(res, 2000));
        return instanceName;
    }

    /**
     * Starts a model via context menu.
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
     * Stops a model via context menu.
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
     * Deletes a model via context menu and confirms the deletion.
     */
    public static async deleteModel(labelOrItem: string | TreeItem): Promise<void> {
        const labelStr = typeof labelOrItem === 'string' ? labelOrItem : await labelOrItem.getLabel();
        
        try {
            await this.executeAction(labelOrItem, 'Delete');
        } catch {
            console.log(`Fallback: Executing delete command via workbench for ${labelStr}`);
            if (typeof labelOrItem !== 'string') { await labelOrItem.select(); }
            const workbench = new Workbench();
            await workbench.executeCommand('ollamaView.delete');
        }
        
        console.log(`Waiting for deletion confirmation for '${labelStr}'...`);
        let confirmed = false;
        
        // Short loop for confirmation - everything should be fast.
        for (let i = 0; i < 5; i++) {
            // Check for Modal Dialog
            try {
                const dialog = new ModalDialog();
                const msg = await dialog.getMessage();
                console.log(`DEBUG: Found ModalDialog with message: "${msg}"`);
                const buttons = await dialog.getButtons();
                const btnLabels = await Promise.all(buttons.map(async (b) => await b.getText()));
                console.log(`DEBUG: Available buttons: ${btnLabels.join(', ')}`);

                // We'll click the button that contains "Delete"
                for (let j = 0; j < buttons.length; j++) {
                    if (btnLabels[j].trim() === 'Delete') {
                        console.log(`Clicking 'Delete' button in ModalDialog`);
                        await buttons[j].click();
                        confirmed = true;
                        break;
                    }
                }
                
                if (!confirmed) {
                     console.log(`Attempting pushButton('Delete') as fallback...`);
                     await dialog.pushButton('Delete');
                     confirmed = true;
                }
            } catch {
                // Not found via ModalDialog, try raw driver
                try {
                    const workbench = new Workbench();
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const driver = (workbench as any).driver; 
                    if (driver) {
                        const deleteButtons = await driver.findElements(By.xpath("//*[text()='Delete']"));
                        for (const btn of deleteButtons) {
                            if (await btn.isDisplayed()) {
                                console.log("DEBUG: Found 'Delete' element via XPath, clicking it.");
                                await btn.click();
                                confirmed = true;
                                break;
                            }
                        }
                    }
                } catch {
                    // Ignore
                }
            }

            if (confirmed) {break;}

            // Check for Notifications
            try {
                const center = await new Workbench().openNotificationsCenter();
                const notifications = await center.getNotifications(NotificationType.Any);
                for (const notification of notifications) {
                    const text = await notification.getMessage();
                    if (text.toLowerCase().includes('delete') || text.includes(labelStr)) {
                        const actions = await notification.getActions();
                        for (const action of actions) {
                            if (await action.getTitle() === 'Delete') {
                                await action.click();
                                confirmed = true;
                                break;
                            }
                        }
                    }
                    if (confirmed) {break;}
                }
                await center.close();
            } catch {
                // Ignore
            }

            if (confirmed) {break;}
            await new Promise(res => setTimeout(res, 1000));
        }

        if (!confirmed) {
            throw new Error(`Could not confirm deletion for '${labelStr}' within timeout`);
        }
    }
}
