import { expect } from 'chai';
import { MockOllamaServer } from './mockOllamaServer';
import { setupE2E, cleanupE2E } from './helpers/e2eTestSetup';
import { SidebarHelpers } from './helpers/sidebarHelpers';

describe('Ollama View UI Tests', function () {
    this.timeout(60000);
    let mockServer: MockOllamaServer;

    before(async () => {
        const setup = await setupE2E();
        mockServer = setup.mockServer;
    });

    after(async () => {
        await cleanupE2E(mockServer);
    });

    it('should pull a model successfully', async () => {
        await SidebarHelpers.pullModel('tiny-model');
    });

    it('should show the pulled model in the tree view', async () => {
        await SidebarHelpers.refresh();
        const item = await SidebarHelpers.findModelItem('tiny-model');
        expect(item, 'Model tiny-model should be visible in the tree').to.not.be.undefined;
    });
});
