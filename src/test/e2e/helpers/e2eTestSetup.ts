import { 
    ActivityBar,
    VSBrowser,
    Workbench
} from 'vscode-extension-tester';

import { MockOllamaServer } from '../mockOllamaServer';

export async function setupE2E(): Promise<{ mockServer: MockOllamaServer, port: number }> {
    await VSBrowser.instance.waitForWorkbench();
    // Extra wait for workbench to stabilize
    await new Promise(res => setTimeout(res, 5000));
    
    const mockServer = new MockOllamaServer();
    const port = await mockServer.start();
    console.log(`Mock Ollama server started on port ${port}`);

    const workbench = new Workbench();
    
    // Retry openSettings as it can fail with ElementNotInteractableError if workbench is busy
    let settings;
    for (let i = 0; i < 3; i++) {
        try {
            settings = await workbench.openSettings();
            if (settings) {break;}
        } catch {
            console.log(`Retrying openSettings... (${i+1})`);
            await new Promise(res => setTimeout(res, 2000));
        }
    }
    
    if (!settings) {
        throw new Error('Failed to open settings after retries');
    }
    
    // Wait for settings to load
    await new Promise(res => setTimeout(res, 2000));
    
    // Wait for the setting to be available
    let setting;
    for (let i = 0; i < 5; i++) {
        try {
            setting = await settings.findSetting('apiUrl', 'Ollama View');
            if (setting) {break;}
        } catch {
            // Ignore and retry
        }
        await new Promise(res => setTimeout(res, 500));
    }

    if (!setting) {
        // Try without section name as fallback
        try {
            setting = await settings.findSetting('apiUrl');
        } catch {
            // Ignore
        }
    }

    if (!setting) {
        throw new Error('Could not find apiUrl setting');
    }

    await setting.setValue(`http://127.0.0.1:${port}`);
    
    // Ensure dialogStyle is custom
    const dialogSetting = await settings.findSetting('window.dialogStyle');
    if (dialogSetting) {
        await dialogSetting.setValue('custom');
    }
    
    // Close settings editor
    await workbench.getEditorView().closeAllEditors();
    
    // Open the Ollama View container
    const activityBar = new ActivityBar();
    const control = await activityBar.getViewControl('ollama-view');
    if (control) {
        await control.click();
    }

    return { mockServer, port };
}

export async function cleanupE2E(mockServer: MockOllamaServer): Promise<void> {
    if (mockServer) {
        await mockServer.stop();
    }
}
