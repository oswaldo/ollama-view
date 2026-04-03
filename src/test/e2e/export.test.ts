import { expect } from 'chai';
import { TreeItem } from 'vscode-extension-tester';

import { cleanupE2E, setupE2E } from './helpers/e2eTestSetup';
import { SidebarHelpers } from './helpers/sidebarHelpers';
import { MockOllamaServer } from './mockOllamaServer';

describe('Export Chat E2E Tests', function () {
    this.timeout(120000);
    let mockServer: MockOllamaServer;

    before(async () => {
        const setup = await setupE2E();
        mockServer = setup.mockServer;
    });

    after(async () => {
        await cleanupE2E(mockServer);
    });

    it('should show Export Chat in the context menu of a chat node', async () => {
        const modelName = 'export-test-model';
        mockServer.addModel(modelName);
        await SidebarHelpers.refresh();

        const instanceName = await SidebarHelpers.createInstance(modelName);
        await SidebarHelpers.refresh();

        let instItem;
        for (let i = 0; i < 5; i++) {
            instItem = await SidebarHelpers.findInstanceItem(modelName, instanceName);
            if (instItem) {break;}
            await new Promise(res => setTimeout(res, 500));
        }
        expect(instItem, 'Instance should exist').to.not.equal(undefined);
        if (!instItem) {return;}

        // Create a chat by executing "Start Chat" via command palette or "Create Chat" context menu
        await SidebarHelpers.executeAction(instItem as TreeItem, 'Start');
        
        // I will use the actual context menu UI action 'New Chat' to prevent executeCommand errors
        await SidebarHelpers.executeAction(instItem as TreeItem, 'New Chat');
        
        // Wait for chat to appear in the tree
        await SidebarHelpers.refresh();
        await new Promise(res => setTimeout(res, 2000));
        
        // Find the chat node under the instance
        if (!(await instItem.isExpanded())) {
            await instItem.expand();
            await new Promise(res => setTimeout(res, 1000));
        }

        let chatItem: TreeItem | undefined;
        const children = await instItem.getChildren();
        for (const child of children) {
            const label = await child.getLabel();
            if (label.includes('New Chat')) {
                chatItem = child as TreeItem;
                break;
            }
        }
        
        expect(chatItem, 'Chat item should be visible in the tree').to.not.equal(undefined);
        if (!chatItem) {return;}

        // Open context menu and look for Export Chat
        const menu = await chatItem.openContextMenu();
        await new Promise(res => setTimeout(res, 500));
        
        const action = await menu.getItem('Export Chat...');
        expect(action, 'Export Chat... should be in the context menu').to.not.equal(undefined);
        
        // We close the menu because clicking it might open a native dialog that blocks the test
        await menu.close();
    });
});
