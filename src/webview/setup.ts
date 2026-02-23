declare function acquireVsCodeApi(): {
    postMessage(message: any): void;
    getState(): any;
    setState(state: any): void;
};

const vscode = acquireVsCodeApi();

const modelNameHeading = document.getElementById('model-name') as HTMLHeadingElement;
const modelDetailsDiv = document.getElementById('model-details') as HTMLDivElement;
const systemMessageTextarea = document.getElementById('system-message') as HTMLTextAreaElement;
const userPrefixTextarea = document.getElementById('user-prefix') as HTMLTextAreaElement;
const userSuffixTextarea = document.getElementById('user-suffix') as HTMLTextAreaElement;
const systemTurnPrefixTextarea = document.getElementById('system-turn-prefix') as HTMLTextAreaElement;
const systemTurnSuffixTextarea = document.getElementById('system-turn-suffix') as HTMLTextAreaElement;
const applyFramingBtn = document.getElementById('apply-template-btn') as HTMLButtonElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;
const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;

let defaultMessage = '';

window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
        case 'init': {
            modelNameHeading.textContent = `Setup: ${message.model.name}`;
            modelDetailsDiv.textContent = `Size: ${(message.model.size / 1024 / 1024 / 1024).toFixed(2)} GB | Tag: ${message.model.name}`;
            systemMessageTextarea.value = message.settings.systemMessage || '';
            userPrefixTextarea.value = message.settings.userMessagePrefix || '';
            userSuffixTextarea.value = message.settings.userMessageSuffix || '';
            systemTurnPrefixTextarea.value = message.settings.systemTurnPrefix || '';
            systemTurnSuffixTextarea.value = message.settings.systemTurnSuffix || '';
            defaultMessage = message.defaultMessage;
            break;
        }
        case 'updateFields': {
            const settings = message.settings;
            systemMessageTextarea.value = settings.systemMessage || '';
            userPrefixTextarea.value = settings.userMessagePrefix || '';
            userSuffixTextarea.value = settings.userMessageSuffix || '';
            systemTurnPrefixTextarea.value = settings.systemTurnPrefix || '';
            systemTurnSuffixTextarea.value = settings.systemTurnSuffix || '';
            break;
        }
    }
});

applyFramingBtn.onclick = () => {
    vscode.postMessage({ command: 'applyFraming' });
};

resetBtn.onclick = () => {
    systemMessageTextarea.value = defaultMessage;
};

cancelBtn.onclick = () => {
    vscode.postMessage({ command: 'cancel' });
};

saveBtn.onclick = () => {
    vscode.postMessage({
        command: 'save',
        settings: {
            systemMessage: systemMessageTextarea.value,
            userMessagePrefix: userPrefixTextarea.value,
            userMessageSuffix: userSuffixTextarea.value,
            systemTurnPrefix: systemTurnPrefixTextarea.value,
            systemTurnSuffix: systemTurnSuffixTextarea.value
        }
    });
};
