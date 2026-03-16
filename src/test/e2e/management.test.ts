import { expect } from 'chai';
import { TreeItem } from 'vscode-extension-tester';

import { cleanupE2E,setupE2E } from './helpers/e2eTestSetup';
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

    after(() => {
        console.log('Final cleanup...');
        setTimeout(() => process.exit(0), 1000);
    });

    it('should pull a new model and show it in the list', async () => {
        const modelName = 'pull-test-model';
        await SidebarHelpers.pullModel(modelName);
        await SidebarHelpers.refresh();
        
        let item;
        for (let i = 0; i < 10; i++) {
            item = await SidebarHelpers.findModelItem(modelName);
            if (item) {break;}
            await SidebarHelpers.refresh();
            await new Promise(res => setTimeout(res, 2000));
        }
        expect(item, `Model ${modelName} should be visible`).to.not.equal(undefined);
    });

    it('should start a model instance and update its status indicator', async () => {
        const modelName = 'start-test-model';
        mockServer.addModel(modelName);
        await SidebarHelpers.refresh();

        const instanceName = await SidebarHelpers.createInstance(modelName);
        await SidebarHelpers.refresh();

        let instItem;
        for (let i = 0; i < 5; i++) {
            instItem = await SidebarHelpers.findInstanceItem(modelName, instanceName);
            if (instItem) {break;}
            await new Promise(res => setTimeout(res, 1000));
        }
        expect(instItem, 'Instance should exist before starting').to.not.equal(undefined);

        await SidebarHelpers.startModel(instItem as TreeItem);
        
        let isRunning = false;
        for (let i = 0; i < 15; i++) {
            const updatedItem = await SidebarHelpers.findInstanceItem(modelName, instanceName);
            const label = await updatedItem?.getLabel();
            const tooltip = await updatedItem?.getTooltip();
            if (label?.includes('Running') || tooltip?.includes('Running')) {
                isRunning = true;
                break;
            }
            await new Promise(res => setTimeout(res, 1000));
        }
        expect(isRunning, 'Instance should show as Running').to.equal(true);
    });

    it('should stop a running model instance', async () => {
        const modelName = 'stop-test-model';
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
        expect(instItem, 'Instance should exist before stopping').to.not.equal(undefined);

        // Start it via UI to ensure it's running
        await SidebarHelpers.startModel(instItem as TreeItem);
        
        // Wait until it shows as running in the UI
        let isRunning = false;
        for (let i = 0; i < 15; i++) {
            await SidebarHelpers.refresh();
            const updatedItem = await SidebarHelpers.findInstanceItem(modelName, instanceName);
            const label = await updatedItem?.getLabel();
            const tooltip = await updatedItem?.getTooltip();
            if (label?.includes('Running') || tooltip?.includes('Running')) {
                isRunning = true;
                instItem = updatedItem;
                break;
            }
            await new Promise(res => setTimeout(res, 500));
        }
        expect(isRunning, 'Instance should show as Running before we try to stop it').to.equal(true);

        await SidebarHelpers.stopModel(instItem as TreeItem);

        let isStopped = false;
        for (let i = 0; i < 15; i++) {
            const updatedItem = await SidebarHelpers.findInstanceItem(modelName, instanceName);
            const label = await updatedItem?.getLabel();
            const tooltip = await updatedItem?.getTooltip();
            if (!label?.includes('Running') && !tooltip?.includes('Running')) {
                isStopped = true;
                break;
            }
            await new Promise(res => setTimeout(res, 500));
        }
        expect(isStopped, 'Instance should no longer show as Running').to.equal(true);
    });

    it('should delete a model from the list', async () => {
        console.log('--- STARTING DELETE TEST ---');
        const modelName = 'delete-test-model';
        mockServer.addModel(modelName);
        await SidebarHelpers.refresh();

        let item;
        for (let i = 0; i < 5; i++) {
            item = await SidebarHelpers.findModelItem(modelName);
            if (item) {break;}
            await new Promise(res => setTimeout(res, 1000));
        }
        expect(item, 'Model should exist before deletion').to.not.equal(undefined);

        await SidebarHelpers.deleteModel(item as TreeItem);
        await SidebarHelpers.refresh();

        let deleted = false;
        for (let i = 0; i < 5; i++) {
            const deletedItem = await SidebarHelpers.findModelItem(modelName, 2000);
            if (!deletedItem) {
                deleted = true;
                break;
            }
            await SidebarHelpers.refresh();
        }
        expect(deleted, 'Model should be removed').to.equal(true);
    });
});
