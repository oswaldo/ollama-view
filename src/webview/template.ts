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
const contentTextarea = document.getElementById('template-content') as HTMLTextAreaElement;
const readonlyWarning = document.getElementById('readonly-warning') as HTMLParagraphElement;

const duplicateBtn = document.getElementById('duplicate-btn') as HTMLButtonElement;
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
            contentTextarea.value = template.content || '';

            if (isBuiltIn) {
                nameInput.disabled = true;
                descriptionTextarea.disabled = true;
                tagsInput.disabled = true;
                contentTextarea.disabled = true;
                saveBtn.disabled = true;
                readonlyWarning.classList.remove('hidden');
            } else {
                nameInput.disabled = false;
                descriptionTextarea.disabled = false;
                tagsInput.disabled = false;
                contentTextarea.disabled = false;
                saveBtn.disabled = false;
                readonlyWarning.classList.add('hidden');
            }
            break;
        }
    }
});

duplicateBtn.onclick = () => {
    vscode.postMessage({ command: 'duplicate' });
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
            content: contentTextarea.value
        }
    });
};
