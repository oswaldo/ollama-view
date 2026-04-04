import {
    ActivityBar,
    ViewControl,
    VSBrowser,
} from 'vscode-extension-tester';

import { MockOllamaServer } from '../mockOllamaServer';

/**
 * Fixed port for the E2E mock Ollama server.
 * This must match the value in `src/test/e2e/fixtures/e2e-settings.json`.
 */
export const MOCK_OLLAMA_PORT = 18398;

export async function setupE2E(): Promise<{ mockServer: MockOllamaServer; port: number }> {
    await VSBrowser.instance.waitForWorkbench();

    const mockServer = new MockOllamaServer();
    const port = await mockServer.start(MOCK_OLLAMA_PORT);
    console.log(`Mock Ollama server started on port ${port}`);

    // The apiUrl setting is pre-configured via e2e-settings.json passed to
    // `extest run-tests -o`, so no need to modify settings at runtime.

    // ── Open the Ollama View sidebar ──
    const activityBar = new ActivityBar();
    let control = await activityBar.getViewControl('ollama-view');
    if (!control) {
        control = await activityBar.getViewControl('Ollama View');
    }

    if (control) {
        await control.openView();
    } else {
        const controls = await activityBar.getViewControls();
        const titles = await Promise.all(controls.map(async (c: ViewControl) => await c.getTitle()));
        throw new Error(`Could not find ollama-view in ActivityBar. Available: ${titles.join(', ')}`);
    }

    // Wait for the sidebar to initialize with mock data
    await new Promise(res => setTimeout(res, 2000));

    return { mockServer, port };
}

export async function cleanupE2E(mockServer: MockOllamaServer): Promise<void> {
    if (mockServer) {
        await mockServer.stop();
    }
}

