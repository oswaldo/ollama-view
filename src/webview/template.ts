declare function acquireVsCodeApi(): {
    postMessage(message: any): void;
    getState(): any;
    setState(state: any): void;
};

const vscode = acquireVsCodeApi();

const headerTitle = document.getElementById('header-title') as HTMLHeadingElement;
const templateSourceBadge = document.getElementById('template-source') as HTMLDivElement;
const nameInput = document.getElementById('template-name') as HTMLInputElement;
const descriptionTextarea = document.getElementById('template-description') as HTMLTextAreaElement;
const tagsInput = document.getElementById('template-tags') as HTMLInputElement;

// Prompt Config fields
const systemMessageTextarea = document.getElementById('system-message') as HTMLTextAreaElement;
const userPrefixTextarea = document.getElementById('user-prefix') as HTMLTextAreaElement;
const userSuffixTextarea = document.getElementById('user-suffix') as HTMLTextAreaElement;
const systemTurnPrefixTextarea = document.getElementById('system-turn-prefix') as HTMLTextAreaElement;
const systemTurnSuffixTextarea = document.getElementById('system-turn-suffix') as HTMLTextAreaElement;

const readonlyWarning = document.getElementById('readonly-warning') as HTMLParagraphElement;

const duplicateBtn = document.getElementById('duplicate-btn') as HTMLButtonElement;
const deleteBtn = document.getElementById('delete-btn') as HTMLButtonElement;
const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;
const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;

let isBuiltIn = false;

window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
        case 'init': {
            const template = message.template;
            isBuiltIn = template.source === 'builtin';

            headerTitle.textContent = isBuiltIn ? `View: ${template.name}` : `Edit: ${template.name}`;
            templateSourceBadge.textContent = template.source === 'builtin' ? 'Built-in' : 'User';
            templateSourceBadge.style.backgroundColor = isBuiltIn ? 'var(--vscode-badge-background)' : 'var(--vscode-charts-green)';
            
            nameInput.value = template.name;
            descriptionTextarea.value = template.description || '';
            tagsInput.value = (template.tags || []).join(', ');
            
            systemMessageTextarea.value = template.systemMessage || '';
            userPrefixTextarea.value = template.userMessagePrefix || '';
            userSuffixTextarea.value = template.userMessageSuffix || '';
            systemTurnPrefixTextarea.value = template.systemTurnPrefix || '';
            systemTurnSuffixTextarea.value = template.systemTurnSuffix || '';

            const inputs = [nameInput, descriptionTextarea, tagsInput, systemMessageTextarea, userPrefixTextarea, userSuffixTextarea, systemTurnPrefixTextarea, systemTurnSuffixTextarea];
            
            if (isBuiltIn) {
                inputs.forEach(i => (i as any).disabled = true);
                saveBtn.disabled = true;
                deleteBtn.classList.add('hidden');
                readonlyWarning.classList.remove('hidden');
            } else {
                inputs.forEach(i => (i as any).disabled = false);
                saveBtn.disabled = false;
                deleteBtn.classList.remove('hidden');
                readonlyWarning.classList.add('hidden');
            }
            break;
        }
    }
});

duplicateBtn.onclick = () => {
    vscode.postMessage({ command: 'duplicate' });
};

deleteBtn.onclick = () => {
    vscode.postMessage({ command: 'delete' });
};

cancelBtn.onclick = () => {
    vscode.postMessage({ command: 'cancel' });
};

saveBtn.onclick = () => {
    if (isBuiltIn) return;

    const tags = tagsInput.value.split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

    vscode.postMessage({
        command: 'save',
        template: {
            name: nameInput.value,
            description: descriptionTextarea.value,
            tags: tags,
            systemMessage: systemMessageTextarea.value,
            userMessagePrefix: userPrefixTextarea.value,
            userMessageSuffix: userSuffixTextarea.value,
            systemTurnPrefix: systemTurnPrefixTextarea.value,
            systemTurnSuffix: systemTurnSuffixTextarea.value
        }
    });
};
