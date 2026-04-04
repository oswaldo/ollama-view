import { expect } from 'chai';

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
        await SidebarHelpers.refresh(); // Initial load of mock-injected model

        // Setup a running instance using the composable helper
        const { instanceName, instanceItem } = await SidebarHelpers.setupRunningInstance(modelName);
        expect(instanceItem, 'Running instance should exist').to.not.equal(undefined);

        // "New Chat" is an inline button — click it to create a chat
        await SidebarHelpers.clickInlineAction(instanceItem, 'New Chat');

        // Wait for the chat node to appear under the instance
        const chatItem = await SidebarHelpers.waitForItem(
            async () => {
                const freshInst = await SidebarHelpers.findInstanceItem(modelName, instanceName);
                if (!freshInst) { return undefined; }
                if (!(await freshInst.isExpanded())) {
                    await freshInst.expand();
                    await new Promise(res => setTimeout(res, 1000));
                }
                const children = await freshInst.getChildren();
                for (const child of children) {
                    const label = await child.getLabel();
                    if (label.includes('New Chat')) {
                        return child;
                    }
                }
                return undefined;
            },
            'chat node under instance',
        );

        // Open context menu and verify Export Chat is available
        const menu = await chatItem.openContextMenu();
        await new Promise(res => setTimeout(res, 500));
        
        const action = await menu.getItem('Export Chat...');
        expect(action, 'Export Chat... should be in the context menu').to.not.equal(undefined);
        
        await menu.close();
    });
});
