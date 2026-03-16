import { WelcomeExtensionToWebviewCommand, WelcomeWebviewToExtensionCommand } from '../contracts/IWelcomeWebviewMessages';
import { assertNever } from '../utils';

declare function acquireVsCodeApi(): {
    postMessage(message: WelcomeWebviewToExtensionCommand): void;
};

const vscode = acquireVsCodeApi();

// DOM Elements
const welcomeTitle = document.getElementById('welcome-title') as HTMLHeadingElement;
const startChatBtn = document.getElementById('start-chat-btn') as HTMLButtonElement;
const addModelBtn = document.getElementById('add-model-btn') as HTMLButtonElement;
const configureBtn = document.getElementById('configure-btn') as HTMLButtonElement;
const gettingStartedDetails = document.getElementById('getting-started-details') as HTMLDetailsElement;

const ollamaLink = document.getElementById('ollama-link') as HTMLAnchorElement;
const githubLink = document.getElementById('github-link') as HTMLAnchorElement;
const issuesLink = document.getElementById('issues-link') as HTMLAnchorElement;

// Handle messages from the extension
window.addEventListener('message', (event) => {
    const message = event.data as WelcomeExtensionToWebviewCommand;
    switch (message.command) {
        case 'init': {
            welcomeTitle.textContent = `Welcome to Ollama View ${message.version}`;
            
            // On first install, expand the getting started guide
            if (message.isFirstInstall) {
                gettingStartedDetails.open = true;
            } else {
                gettingStartedDetails.open = false;
            }
            break;
        }
        default:
            assertNever(message);
    }
});

// Button Actions
startChatBtn.onclick = () => {
    vscode.postMessage({ command: 'startChat' });
};

addModelBtn.onclick = () => {
    // Triggers the enhanced setup flow which handles no models by offering to pull
    vscode.postMessage({ command: 'configureOllama' });
};

configureBtn.onclick = () => {
    // Triggers opening the VS Code settings for ollama-view.apiUrl
    vscode.postMessage({ command: 'configureConnection' });
};

// External Links
const handleExternalLink = (link: HTMLAnchorElement) => {
    link.onclick = (e) => {
        e.preventDefault();
        vscode.postMessage({ command: 'openExternal', url: link.href });
    };
};

handleExternalLink(ollamaLink);
handleExternalLink(githubLink);
handleExternalLink(issuesLink);
