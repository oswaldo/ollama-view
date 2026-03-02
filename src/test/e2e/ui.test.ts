import { expect } from 'chai';
import { 
    ActivityBar,
    DefaultTreeSection,
    InputBox, 
    NotificationType,
    TreeItem,
    VSBrowser,
    Workbench} from 'vscode-extension-tester';

import { MockOllamaServer } from './mockOllamaServer';

describe('Ollama View UI Tests', function () {
    this.timeout(60000);
    let mockServer: MockOllamaServer;
    let port: number;

    before(async () => {
        await VSBrowser.instance.waitForWorkbench();
        
        mockServer = new MockOllamaServer();
        port = await mockServer.start();
        console.log(`Mock Ollama server started on port ${port}`);

        // Set the API URL in settings
        const workbench = new Workbench();
        const settings = await workbench.openSettings();
        
        // Wait for settings to load
        await new Promise(res => setTimeout(res, 3000));
        
        // Wait for the setting to be available
        let setting;
        for (let i = 0; i < 10; i++) {
            try {
                setting = await settings.findSetting('apiUrl');
                if (setting) {break;}
            } catch {
                // Ignore and retry
            }
            await new Promise(res => setTimeout(res, 1000));
        }

        if (!setting) {
            throw new Error('Could not find apiUrl setting');
        }

        await setting.setValue(`http://127.0.0.1:${port}`);
        
        // Close settings editor
        await workbench.getEditorView().closeAllEditors();
        
        // Open the Ollama View container
        const activityBar = new ActivityBar();
        // The title in package.json is 'ollama-view'
        const control = await activityBar.getViewControl('ollama-view');
        if (control) {
            await control.click();
        }
    });

    after(async () => {
        if (mockServer) {
            await mockServer.stop();
        }
    });

    it('should pull a model successfully', async () => {
        const workbench = new Workbench();
        
        // Execute the pull command
        await workbench.executeCommand('ollamaView.pull');
        
        // Wait for InputBox
        const input = await InputBox.create();
        await input.setText('tiny-model');
        await input.confirm();
        
        // Wait for the success notification
        // The mock server takes some time to finish pulling
        const center = await workbench.openNotificationsCenter();
        
        // We might need to wait for the notification to appear
        let successNotificationFound = false;
        for (let i = 0; i < 20; i++) {
            const notifications = await center.getNotifications(NotificationType.Any);
            for (const notification of notifications) {
                const text = await notification.getMessage();
                if (text.includes('Successfully pulled tiny-model')) {
                    successNotificationFound = true;
                    break;
                }
            }
            if (successNotificationFound) {break;}
            await new Promise(res => setTimeout(res, 1000));
        }
        
        expect(successNotificationFound).to.equal(true);
        
        await center.close();
    });

    it('should show the pulled model in the tree view', async () => {
        const workbench = new Workbench();
        const sidebar = await workbench.getSideBar();
        const view = await sidebar.getContent().getSection<DefaultTreeSection>('Models');
        
        // Refresh the view if needed
        await workbench.executeCommand('ollamaView.refresh');
        
        // Find the model in the tree
        // Wait a bit for the tree to update
        let modelFound = false;
        for (let i = 0; i < 10; i++) {
            const items = await view.getVisibleItems() as TreeItem[];
            for (const item of items) {
                const label = await item.getLabel();
                if (label.includes('tiny-model')) {
                    modelFound = true;
                    break;
                }
            }
            if (modelFound) {break;}
            await new Promise(res => setTimeout(res, 1000));
        }
        
        expect(modelFound).to.equal(true);
    });
});
