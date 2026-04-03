import { 
    ActivityBar,
    VSBrowser
} from 'vscode-extension-tester';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import { MockOllamaServer } from '../mockOllamaServer';

export async function setupE2E(): Promise<{ mockServer: MockOllamaServer, port: number }> {
    await VSBrowser.instance.waitForWorkbench();
    // Extra wait for workbench to stabilize
    await new Promise(res => setTimeout(res, 5000));
    
    const mockServer = new MockOllamaServer();
    const port = await mockServer.start();
    console.log(`Mock Ollama server started on port ${port}`);

    // Robustly set settings via modifying settings.json on disk directly
    const testResourcesDir = process.env.TEST_RESOURCES || path.join(os.tmpdir(), 'test-resources');
    const settingsPath = path.join(testResourcesDir, 'settings', 'User', 'settings.json');
    
    let settings: any = {};
    if (fs.existsSync(settingsPath)) {
        try {
            settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        } catch {
            // Ignore
        }
    }
    
    settings['ollamaView.apiUrl'] = `http://127.0.0.1:${port}`;
    settings['window.dialogStyle'] = 'custom';
    
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    
    // Give VS Code a moment to pick up the file changes
    await new Promise(res => setTimeout(res, 2000));
    
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
