import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { InputBox, VSBrowser, Key } from 'vscode-extension-tester';
import { expect } from 'chai';

import { cleanupE2E, setupE2E } from './helpers/e2eTestSetup';
import { SidebarHelpers } from './helpers/sidebarHelpers';
import { MockOllamaServer } from './mockOllamaServer';

describe('Import Chat E2E Tests', function () {
    this.timeout(120000);
    let mockServer: MockOllamaServer;
    const tempDir = os.tmpdir();
    const chatFilePath = path.join(tempDir, 'e2e-import-test.json');
    const warningChatFilePath = path.join(tempDir, 'e2e-warning-test.json');
    const collisionChatFilePath = path.join(tempDir, 'e2e-collision-test.json');

    before(async () => {
        const setup = await setupE2E();
        mockServer = setup.mockServer;

        // Create a valid chat JSON file
        const validChat = {
            id: 'e2e-import-id',
            modelName: 'import-test-model',
            name: 'E2E Imported Chat',
            messages: [{ role: 'user', content: 'E2E Test Message', timestamp: Date.now() }],
            createdAt: Date.now()
        };
        fs.writeFileSync(chatFilePath, JSON.stringify(validChat), 'utf8');

        // Create a chat JSON file with missing timestamp (warning)
        const warningChat = {
            id: 'e2e-warning-id',
            modelName: 'import-test-model',
            name: 'E2E Warning Chat',
            messages: [{ role: 'user', content: 'E2E Warning Message' }], // no timestamp
            createdAt: Date.now()
        };
        fs.writeFileSync(warningChatFilePath, JSON.stringify(warningChat), 'utf8');

        // Create a chat JSON file for collision (same ID as valid chat)
        const collisionChat = {
            id: 'e2e-import-id',
            modelName: 'import-test-model',
            name: 'E2E Imported Chat',
            messages: [{ role: 'user', content: 'E2E Collision Message', timestamp: Date.now() }],
            createdAt: Date.now()
        };
        fs.writeFileSync(collisionChatFilePath, JSON.stringify(collisionChat), 'utf8');

        mockServer.addModel('import-test-model');
        await SidebarHelpers.refresh();
    });

    after(async () => {
        await cleanupE2E(mockServer);
        if (fs.existsSync(chatFilePath)) fs.unlinkSync(chatFilePath);
        if (fs.existsSync(warningChatFilePath)) fs.unlinkSync(warningChatFilePath);
        if (fs.existsSync(collisionChatFilePath)) fs.unlinkSync(collisionChatFilePath);
    });

    it('should import a chat via Command Palette', async () => {
        await SidebarHelpers.safeExecuteCommand('Ollama View: Import Chat...');
        
        await new Promise(res => setTimeout(res, 1000));
        await InputBox.create();
        await SidebarHelpers.safeSetInputText(chatFilePath);
        const driver = VSBrowser.instance.driver;
        await driver.actions().sendKeys(Key.ENTER).perform();
        // Wait another 500ms to allow the confirm to process
        await new Promise(res => setTimeout(res, 500));

        // Check if the chat appears in the sidebar
        const chatItem = await SidebarHelpers.waitForItem(
            async () => {
                const freshInst = await SidebarHelpers.findModelItem('import-test-model', 1000);
                if (!freshInst) { return undefined; }
                if (!(await freshInst.isExpanded())) {
                    await freshInst.expand();
                    await new Promise(res => setTimeout(res, 1000));
                }
                const children = await freshInst.getChildren();
                for (const child of children) {
                    const label = await child.getLabel();
                    if (label.includes('E2E Imported Chat')) {
                        return child;
                    }
                }
                return undefined;
            },
            'imported chat node',
        );

        expect(chatItem, 'Imported chat node should be visible in the sidebar').to.not.be.undefined;
    });

    it('should handle collision by asking user to Import as New', async () => {
        await SidebarHelpers.safeExecuteCommand('Ollama View: Import Chat...');
        
        await new Promise(res => setTimeout(res, 1000));
        await InputBox.create();
        await SidebarHelpers.safeSetInputText(collisionChatFilePath);
        const driver = VSBrowser.instance.driver;
        await driver.actions().sendKeys(Key.ENTER).perform();
        await new Promise(res => setTimeout(res, 500));

        // Wait for the collision notification
        await SidebarHelpers.confirmDialog('Import as New');

        // Check if the new chat "(2)" appears
        const chatItem = await SidebarHelpers.waitForItem(
            async () => {
                const freshInst = await SidebarHelpers.findModelItem('import-test-model', 1000);
                if (!freshInst) { return undefined; }
                if (!(await freshInst.isExpanded())) {
                    await freshInst.expand();
                    await new Promise(res => setTimeout(res, 1000));
                }
                const children = await freshInst.getChildren();
                for (const child of children) {
                    const label = await child.getLabel();
                    if (label.includes('E2E Imported Chat (2)')) {
                        return child;
                    }
                }
                return undefined;
            },
            'collision chat node with (2)',
        );

        expect(chatItem, 'Imported chat with new ID should be visible').to.not.be.undefined;
    });

    it('should show best-effort warning for malformed chat', async () => {
        await SidebarHelpers.safeExecuteCommand('Ollama View: Import Chat...');
        
        await new Promise(res => setTimeout(res, 1000));
        await InputBox.create();
        await SidebarHelpers.safeSetInputText(warningChatFilePath);
        const driver = VSBrowser.instance.driver;
        await driver.actions().sendKeys(Key.ENTER).perform();
        await new Promise(res => setTimeout(res, 500));

        // Wait for the warning notification and click Proceed (Best Effort)
        await SidebarHelpers.confirmDialog('Proceed (Best Effort)');

        // Check if the chat appears in the sidebar
        const chatItem = await SidebarHelpers.waitForItem(
            async () => {
                const freshInst = await SidebarHelpers.findModelItem('import-test-model', 1000);
                if (!freshInst) { return undefined; }
                if (!(await freshInst.isExpanded())) {
                    await freshInst.expand();
                    await new Promise(res => setTimeout(res, 1000));
                }
                const children = await freshInst.getChildren();
                for (const child of children) {
                    const label = await child.getLabel();
                    if (label.includes('E2E Warning Chat')) {
                        return child;
                    }
                }
                return undefined;
            },
            'warning chat node',
        );

        expect(chatItem, 'Imported chat with warning should be visible').to.not.be.undefined;
    });
});