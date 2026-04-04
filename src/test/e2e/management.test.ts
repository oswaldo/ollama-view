import { expect } from 'chai';

import { cleanupE2E, setupE2E } from './helpers/e2eTestSetup';
import { SidebarHelpers } from './helpers/sidebarHelpers';
import { MockOllamaServer } from './mockOllamaServer';

describe('Sidebar & Model Management E2E Tests', function () {
    this.timeout(120000);
    let mockServer: MockOllamaServer;

    before(async () => {
        const setup = await setupE2E();
        mockServer = setup.mockServer;
    });

    after(async () => {
        await cleanupE2E(mockServer);
    });

    it('should pull a new model and show it in the list', async () => {
        const modelName = 'pull-test-model';
        await SidebarHelpers.pullModel(modelName);
        
        const item = await SidebarHelpers.waitForItem(
            () => SidebarHelpers.findModelItem(modelName),
            `pulled model '${modelName}' in tree`,
        );
        expect(item, `Model ${modelName} should be visible`).to.not.equal(undefined);
    });

    it('should start a model instance and update its status indicator', async () => {
        const modelName = 'start-test-model';
        mockServer.addModel(modelName);
        await SidebarHelpers.refresh(); // Initial load of mock-injected model

        const { instanceItem } = await SidebarHelpers.setupRunningInstance(modelName);
        
        const label = await instanceItem.getLabel();
        const tooltip = await instanceItem.getTooltip();
        const isRunning = label?.includes('Running') || tooltip?.includes('Running');
        expect(isRunning, 'Instance should show as Running').to.equal(true);
    });

    it('should stop a running model instance', async () => {
        const modelName = 'stop-test-model';
        mockServer.addModel(modelName);
        await SidebarHelpers.refresh(); // Initial load of mock-injected model

        const { instanceName, instanceItem } = await SidebarHelpers.setupRunningInstance(modelName);
        
        // Stop it
        await SidebarHelpers.stopModel(instanceItem);
        
        // Wait for it to no longer show as Running
        await SidebarHelpers.waitForItem(
            async () => {
                const item = await SidebarHelpers.findInstanceItem(modelName, instanceName);
                if (!item) { return undefined; }
                const label = await item.getLabel();
                const tooltip = await item.getTooltip();
                if (!label?.includes('Running') && !tooltip?.includes('Running')) {
                    return item;
                }
                return undefined;
            },
            `instance '${instanceName}' to show as Stopped`,
        );
    });

    it('should delete a model from the list', async () => {
        const modelName = 'delete-test-model';
        mockServer.addModel(modelName);
        await SidebarHelpers.refresh(); // Initial load of mock-injected model

        const item = await SidebarHelpers.waitForItem(
            () => SidebarHelpers.findModelItem(modelName),
            `model '${modelName}' in tree`,
        );

        await SidebarHelpers.deleteModel(item);

        // Wait for it to disappear from the tree
        await SidebarHelpers.waitForItemGone(
            () => SidebarHelpers.findModelItem(modelName, 2000),
            `model '${modelName}' to be removed`,
        );
    });
});
