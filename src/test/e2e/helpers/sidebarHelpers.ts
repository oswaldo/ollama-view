import { 
    DefaultTreeSection,
    TreeItem,
    Workbench,
    NotificationType,
    InputBox
} from 'vscode-extension-tester';
import { expect } from 'chai';

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
        expect(successFound, `Model ${name} should be pulled successfully`).to.be.true;
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
     * Executes a context menu action on a model item.
     */
    public static async executeAction(label: string, actionName: string): Promise<void> {
        const item = await this.findModelItem(label);
        if (!item) {
            throw new Error(`Could not find model item with label: ${label}`);
        }
        
        const menu = await item.openContextMenu();
        const action = await menu.getItem(actionName);
        if (!action) {
            await menu.close();
            throw new Error(`Could not find action '${actionName}' for model '${label}'`);
        }
        await action.click();
    }

    /**
     * Starts a model via context menu.
     */
    public static async startModel(label: string): Promise<void> {
        await this.executeAction(label, 'Start');
    }

    /**
     * Stops a model via context menu.
     */
    public static async stopModel(label: string): Promise<void> {
        await this.executeAction(label, 'Stop');
    }

    /**
     * Deletes a model via context menu.
     */
    public static async deleteModel(label: string): Promise<void> {
        await this.executeAction(label, 'Delete');
        // Handle potential confirmation if any (currently it's direct in some flows or uses notifications)
    }
}
