/**
 * Commands sent from the Welcome Webview to the WelcomePanel (VS Code extension side).
 */
export type WelcomeWebviewToExtensionCommand =
    | { command: 'configureOllama' }
    | { command: 'configureConnection' }
    | { command: 'startChat' }
    | { command: 'openExternal'; url: string };

/**
 * Commands sent from the WelcomePanel (VS Code extension side) to the Welcome Webview.
 */
export type WelcomeExtensionToWebviewCommand = {
    command: 'init';
    version: string;
    isFirstInstall: boolean;
};
