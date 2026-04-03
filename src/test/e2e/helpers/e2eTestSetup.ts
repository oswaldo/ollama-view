import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { 
    ActivityBar,
    VSBrowser
} from 'vscode-extension-tester';

import { MockOllamaServer } from '../mockOllamaServer';

export async function setupE2E(): Promise<{ mockServer: MockOllamaServer, port: number }> {
    await VSBrowser.instance.waitForWorkbench();
    // Extra wait for workbench to stabilize
    await new Promise(res => setTimeout(res, 500));
    
    const mockServer = new MockOllamaServer();
    const port = await mockServer.start();
    console.log(`Mock Ollama server started on port ${port}`);

    // Robustly set settings via modifying settings.json on disk directly
    const testResourcesDir = process.env.TEST_RESOURCES || path.join(os.tmpdir(), 'test-resources');
    const settingsPath = path.join(testResourcesDir, 'settings', 'User', 'settings.json');
    
    let settings: Record<string, unknown> = {};
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
    await new Promise(res => setTimeout(res, 500));
    
    // Open the Ollama View container
    const activityBar = new ActivityBar();
    let control = await activityBar.getViewControl('ollama-view');
    if (!control) {
        control = await activityBar.getViewControl('Ollama View');
    }
    
    if (control) {
        await control.openView();
    } else {
        const controls = await activityBar.getViewControls();
        const titles = await Promise.all(controls.map(c => c.getTitle()));
        throw new Error(`Could not find ollama-view in ActivityBar. Available: ${titles.join(', ')}`);
    }

    // Wait for the side bar to initialize
    await new Promise(res => setTimeout(res, 2000));

    return { mockServer, port };
}

export async function cleanupE2E(mockServer: MockOllamaServer): Promise<void> {
    if (mockServer) {
        await mockServer.stop();
    }
}
