import { 
    Workbench,
    WebView,
    By
} from 'vscode-extension-tester';
import { SidebarHelpers } from './sidebarHelpers';

export class ChatHelpers {
    /**
     * Opens a chat panel for a specific model instance via sidebar context menu.
     */
    public static async openChat(modelLabel: string): Promise<WebView> {
        await SidebarHelpers.executeAction(modelLabel, 'New Chat');
        
        // Wait for the webview to appear
        const workbench = new Workbench();
        const editorView = workbench.getEditorView();
        
        // It might take a moment for the new editor to open
        let chatEditor = await editorView.openEditor(`Chat: ${modelLabel}`);
        if (!chatEditor) {
            // Retry once if not found immediately
            await new Promise(res => setTimeout(res, 2000));
            chatEditor = await editorView.openEditor(`Chat: ${modelLabel}`);
        }
        
        if (!chatEditor) {
            throw new Error(`Could not find chat editor for model: ${modelLabel}`);
        }

        const webview = new WebView();
        await webview.switchToFrame();
        return webview;
    }

    /**
     * Sends a message in the chat webview.
     * Assumes the webview frame is already switched to.
     */
    public static async sendMessage(webview: WebView, text: string): Promise<void> {
        const input = await webview.findWebElement(By.id('messageInput'));
        await input.sendKeys(text);
        
        const sendBtn = await webview.findWebElement(By.id('sendBtn'));
        await sendBtn.click();
    }

    /**
     * Waits for the last assistant message to finish streaming.
     */
    public static async waitForResponse(webview: WebView, timeout: number = 30000): Promise<string> {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            const messages = await webview.findWebElements(By.className('message'));
            if (messages.length > 0) {
                const lastMessage = messages[messages.length - 1];
                const role = await lastMessage.getAttribute('data-role');
                
                if (role === 'assistant') {
                    // Check if it's still "typing" (if we have such indicator)
                    // Or just wait for the text to stop changing or for a specific marker
                    const content = await lastMessage.getText();
                    if (content.length > 0 && !content.includes('...')) {
                        // This is a naive check, might need better logic if there's a specific 'done' state in UI
                        await new Promise(res => setTimeout(res, 1000)); // Brief wait to ensure stable
                        return content;
                    }
                }
            }
            await new Promise(res => setTimeout(res, 500));
        }
        throw new Error('Timeout waiting for assistant response');
    }

    /**
     * Gets all messages currently visible in the chat.
     */
    public static async getMessages(webview: WebView): Promise<{role: string, content: string}[]> {
        const elements = await webview.findWebElements(By.className('message'));
        const result = [];
        for (const element of elements) {
            const role = await element.getAttribute('data-role');
            const content = await element.findElement(By.className('message-content')).getText();
            result.push({ role, content });
        }
        return result;
    }

    /**
     * Switches back from the webview frame to the main workbench.
     */
    public static async switchToWorkbench(webview: WebView): Promise<void> {
        await webview.switchBack();
    }
}
