declare function acquireVsCodeApi(): {
    postMessage(message: any): void;
    getState(): any;
    setState(state: any): void;
};

const vscode = acquireVsCodeApi();

interface ChatMessage {
    role: 'user' | 'assistant' | 'system' | 'error';
    content: string;
    timestamp: number;
    systemTurnPrefix?: string;
    userPrefix?: string;
    userSuffix?: string;
    systemTurnSuffix?: string;
    framingId?: string;
    framingName?: string;
}

const messagesDiv = document.getElementById('messages') as HTMLDivElement;
const input = document.getElementById('messageInput') as HTMLInputElement;
const sendBtn = document.getElementById('sendBtn') as HTMLButtonElement;
const cancelBtn = document.getElementById('cancelBtn') as HTMLButtonElement;
const moreActionsBtn = document.getElementById('moreActionsBtn') as HTMLButtonElement;
const inputArea = document.getElementById('inputArea') as HTMLDivElement;
const loadMoreContainer = document.getElementById('loadMoreContainer') as HTMLDivElement;
const loadMoreBtn = document.getElementById('loadMoreBtn') as HTMLButtonElement;
const showInjectionsToggle = document.getElementById('showInjections') as HTMLInputElement;

const framingNameSpan = document.getElementById('framingName') as HTMLSpanElement;
const revertFramingBtn = document.getElementById('revertFramingBtn') as HTMLDivElement;

let modelName = '';
let totalMessages = 0;
let messages: ChatMessage[] = [];

showInjectionsToggle.onchange = () => {
    renderMessages();
};

framingNameSpan.onclick = () => {
    vscode.postMessage({ command: 'requestFraming' });
};

revertFramingBtn.onclick = (e) => {
    e.stopPropagation();
    vscode.postMessage({ command: 'revertFraming' });
};

moreActionsBtn.onclick = () => {
    vscode.postMessage({ command: 'requestMoreActions' });
};

let editState: { mode: 'truncate' | 'fork', index: number } | null = null;
let activeDropdown: HTMLElement | null = null;
let truncatedMessagesBackup: ChatMessage[] | null = null;

const CopyIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
const MoreIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1.5"></circle><circle cx="19" cy="12" r="1.5"></circle><circle cx="5" cy="12" r="1.5"></circle></svg>';

function updateLoadMoreVisibility() {
    if (messages.length < totalMessages) {
        loadMoreContainer.style.display = 'block';
    } else {
        loadMoreContainer.style.display = 'none';
    }
}

function renderMessages(preserveScroll = false) {
    const oldScrollHeight = messagesDiv.scrollHeight;
    const oldScrollTop = messagesDiv.scrollTop;

    const container = document.getElementById('loadMoreContainer') as HTMLElement;
    messagesDiv.innerHTML = '';
    messagesDiv.appendChild(container);

    messages.forEach((m, i) => {
        const absoluteIndex = (totalMessages - messages.length) + i;
        if (m.role === 'system' && !showInjectionsToggle.checked) {
            return;
        }
        addMessageToDom(m, absoluteIndex, false);
    });
    
    updateLoadMoreVisibility();

    if (preserveScroll) {
        messagesDiv.scrollTop = oldScrollTop + (messagesDiv.scrollHeight - oldScrollHeight);
    } else {
        if (oldScrollHeight === 0) {
             messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    }
}

loadMoreBtn.onclick = () => {
    vscode.postMessage({
        command: 'requestLoadMore',
        offset: messages.length
    });
};

let typingIndicator: HTMLElement | null = null;
function showTypingIndicator() {
    if (typingIndicator) return;
    typingIndicator = document.createElement('div');
    typingIndicator.className = 'message-wrapper assistant';
    typingIndicator.innerHTML = `
        <div class="message-header">${modelName}</div>
        <div class="message">
            <div class="typing-indicator">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
        </div>
    `;
    messagesDiv.appendChild(typingIndicator);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function hideTypingIndicator() {
    if (typingIndicator) {
        typingIndicator.remove();
        typingIndicator = null;
    }
}

function formatTime(ts: number) {
    if (!ts) return '';
    return new Date(ts).toLocaleString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function showTooltip(target: HTMLElement, text: string) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = text;
    document.body.appendChild(tooltip);

    const rect = target.getBoundingClientRect();
    tooltip.style.left = rect.left + 'px';
    tooltip.style.top = (rect.top - 30) + 'px';
    tooltip.classList.add('visible');

    setTimeout(() => {
        tooltip.classList.remove('visible');
        setTimeout(() => tooltip.remove(), 300);
    }, 1500);
}

function addMessageToDom(m: ChatMessage, index?: number, shouldScroll = true) {
    const { role, content, timestamp } = m;
    const showInjections = showInjectionsToggle.checked;

    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper ' + role;

    if (showInjections && m.systemTurnPrefix) {
        const inj = document.createElement('div');
        inj.className = 'injection';
        inj.innerHTML = `<span class="injection-label">System Prefix Turn:</span>${m.systemTurnPrefix}`;
        wrapper.appendChild(inj);
    }

    const header = document.createElement('div');
    header.className = 'message-header';
    header.textContent = role === 'user' ? 'You' : (role === 'error' ? 'Error' : (role === 'system' ? 'System' : modelName));
    wrapper.appendChild(header);

    const div = document.createElement('div');
    div.className = 'message';
    
    if (typeof index === 'number' && role !== 'error' && role !== 'system') {
        const btns = document.createElement('div');
        btns.className = 'buttons-container';
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'icon-btn';
        copyBtn.title = 'Copy';
        copyBtn.innerHTML = CopyIcon;
        copyBtn.onclick = (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(content);
            showTooltip(e.currentTarget as HTMLElement, 'Copied!');
        };
        btns.appendChild(copyBtn);

        const optsBtn = document.createElement('button');
        optsBtn.className = 'icon-btn';
        optsBtn.title = 'Options';
        optsBtn.innerHTML = MoreIcon;
        optsBtn.onclick = (e) => {
            e.stopPropagation();
            toggleDropdown(e, index, content, role);
        };
        btns.appendChild(optsBtn);

        wrapper.appendChild(btns);
    }

    if (showInjections && m.userPrefix) {
        const inj = document.createElement('div');
        inj.className = 'injection';
        inj.innerHTML = `<span class="injection-label">User Prefix:</span>${m.userPrefix}`;
        div.appendChild(inj);
    }

    const contentDiv = document.createElement('div');
    contentDiv.style.whiteSpace = 'pre-wrap';
    contentDiv.textContent = content;
    div.appendChild(contentDiv);

    if (showInjections && m.userSuffix) {
        const inj = document.createElement('div');
        inj.className = 'injection';
        inj.innerHTML = `<span class="injection-label">User Suffix:</span>${m.userSuffix}`;
        div.appendChild(inj);
    }

    if (timestamp) {
        const timeDiv = document.createElement('div');
        timeDiv.className = 'timestamp';
        timeDiv.textContent = formatTime(timestamp);
        div.appendChild(timeDiv);
    }

    wrapper.appendChild(div);

    if (showInjections && m.systemTurnSuffix) {
        const inj = document.createElement('div');
        inj.className = 'injection';
        inj.innerHTML = `<span class="injection-label">System Suffix Turn:</span>${m.systemTurnSuffix}`;
        wrapper.appendChild(inj);
    }

    messagesDiv.appendChild(wrapper);
    if (shouldScroll) {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    return div;
}

function toggleDropdown(e: MouseEvent, index: number, content: string, role: string) {
    closeDropdown();
    
    const btn = e.currentTarget as HTMLElement;
    const parent = btn.parentElement as HTMLElement; 
    
    const menu = document.createElement('div');
    menu.className = 'dropdown-menu';
    
    if (role === 'user') {
        const itemTruncate = document.createElement('div');
        itemTruncate.className = 'dropdown-item';
        itemTruncate.textContent = 'Edit / Truncate';
        itemTruncate.onclick = () => {
            enterEditMode('truncate', index, content);
            closeDropdown();
        };
        menu.appendChild(itemTruncate);
        
        const itemFork = document.createElement('div');
        itemFork.className = 'dropdown-item';
        itemFork.textContent = 'Edit / Fork';
        itemFork.onclick = () => {
             enterEditMode('fork', index, content);
             closeDropdown();
        };
        menu.appendChild(itemFork);
    } else if (role === 'assistant') {
        const itemRegen = document.createElement('div');
        itemRegen.className = 'dropdown-item';
        const isLast = index === (totalMessages - 1);
        itemRegen.textContent = isLast ? 'Regenerate' : 'Regenerate (Truncate)';
        
        itemRegen.onclick = () => {
             vscode.postMessage({
                 command: 'requestRegenerate',
                 index
             });
             closeDropdown();
        };
        menu.appendChild(itemRegen);

        const itemFork = document.createElement('div');
        itemFork.className = 'dropdown-item';
        itemFork.textContent = 'Fork';
        itemFork.onclick = () => {
             vscode.postMessage({
                 command: 'requestForkAssistant',
                 index
             });
             closeDropdown();
        };
        menu.appendChild(itemFork);
    }
    
    parent.appendChild(menu);
    menu.style.display = 'block';
    activeDropdown = menu;
    
    setTimeout(() => {
        document.addEventListener('click', closeDropdownOutside);
    }, 0);
}

function closeDropdown() {
    if (activeDropdown) {
        activeDropdown.remove();
        activeDropdown = null;
        document.removeEventListener('click', closeDropdownOutside);
    }
}

function closeDropdownOutside(e: MouseEvent) {
    if (activeDropdown && !activeDropdown.contains(e.target as Node)) {
        closeDropdown();
    }
}

function enterEditMode(mode: 'truncate' | 'fork', index: number, content: string) {
    editState = { mode, index };
    input.value = content;
    
    setTimeout(() => input.focus(), 0); 
    
    inputArea.classList.add('editing');
    cancelBtn.style.display = 'inline-block';
    sendBtn.textContent = mode === 'truncate' ? 'Edit & Send' : 'Fork & Send';

    const localIndex = index - (totalMessages - messages.length);

    if (mode === 'truncate' || mode === 'fork') {
        if (localIndex >= 0) {
            truncatedMessagesBackup = [...messages];
            messages = messages.slice(0, localIndex);
            renderMessages();
        }
    }
    validateInput();
}

function resetEditMode() {
    if (editState && (editState.mode === 'truncate' || editState.mode === 'fork') && truncatedMessagesBackup) {
         messages = truncatedMessagesBackup;
         truncatedMessagesBackup = null;
         renderMessages();
    }
    editState = null;
    inputArea.classList.remove('editing');
    cancelBtn.style.display = 'none';
    sendBtn.textContent = 'Send';
    validateInput();
}

function validateInput() {
    const trimmedText = input.value.trim();
    sendBtn.disabled = !trimmedText;
}

function sendMessage() {
    const text = input.value;
    const trimmedText = text.trim();

    if (!trimmedText) {
        return;
    }

    if (editState) {
        vscode.postMessage({ 
            command: 'sendMessage', 
            text: trimmedText, 
            editOptions: editState 
        });
        editState = null; 
        inputArea.classList.remove('editing');
        cancelBtn.style.display = 'none';
        sendBtn.textContent = 'Send';
    } else {
        vscode.postMessage({ command: 'sendMessage', text: trimmedText });
    }
    input.value = '';
    validateInput();
}

function updateFramingUI(framingName?: string) {
    if (framingName) {
        framingNameSpan.textContent = framingName;
        revertFramingBtn.style.display = 'flex';
    } else {
        framingNameSpan.textContent = 'Default Framing';
        revertFramingBtn.style.display = 'none';
    }
}

sendBtn.addEventListener('click', sendMessage);
cancelBtn.addEventListener('click', () => {
    input.value = '';
    resetEditMode();
});

input.addEventListener('input', validateInput);

input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && editState) {
        input.value = '';
        resetEditMode();
    }
});

// Handle messages from extension
window.addEventListener('message', event => {
    const message = event.data;
    switch(message.command) {
        case 'initState': {
            modelName = message.modelName;
            messages = message.messages;
            totalMessages = message.total;
            updateFramingUI(message.activeFramingName);
            renderMessages();
            validateInput();
            break;
        }
        case 'setMessages': {
            messages = message.messages;
            totalMessages = messages.length;
            renderMessages();
            break;
        }
        case 'updateFraming': {
            updateFramingUI(message.framingName);
            break;
        }
        case 'addMessage': {
            const newMessage: ChatMessage = { 
                role: message.role, 
                content: message.content, 
                timestamp: Date.now(),
                systemTurnPrefix: message.systemTurnPrefix,
                userPrefix: message.userPrefix,
                userSuffix: message.userSuffix,
                systemTurnSuffix: message.systemTurnSuffix,
                framingId: message.framingId,
                framingName: message.framingName
            };
            messages.push(newMessage);
            totalMessages++;
            if (newMessage.role !== 'system' || showInjectionsToggle.checked) {
                addMessageToDom(newMessage, totalMessages - 1);
            }
            break;
        }
        case 'startAssistantMessage': {
            hideTypingIndicator();
            const wrapper = document.createElement('div');
            wrapper.className = 'message-wrapper assistant';
            wrapper.innerHTML = `
                <div class="message-header">${modelName}</div>
                <div class="message assistant">
                    <div style="white-space: pre-wrap;" id="current-streaming-response"></div>
                </div>
            `;
            messagesDiv.appendChild(wrapper);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            break;
        }
        case 'appendToken': {
            const current = document.getElementById('current-streaming-response');
            if (current) {
                current.textContent += message.content;
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
            break;
        }
        case 'endAssistantMessage': {
            const done = document.getElementById('current-streaming-response');
            if (done) {
                const wrapper = done.parentElement!.parentElement!;
                const fullContent = done.textContent || '';
                const timestamp = Date.now();
                
                if (!fullContent) {
                    wrapper.remove();
                } else {
                    const assistantMsg: ChatMessage = { role: 'assistant', content: fullContent, timestamp: timestamp };
                    messages.push(assistantMsg);
                    totalMessages++;
                    addMessageToDom(assistantMsg, totalMessages - 1, true);
                    wrapper.remove();
                }
            }
            break;
        }
        case 'enterEditMode': {
            enterEditMode(message.mode, message.index, message.content);
            break;
        }
        case 'addErrorMessage': {
            hideTypingIndicator();
            addMessageToDom({ role: 'error', content: message.content, timestamp: Date.now() });
            break;
        }
        case 'setLoading': {
            if (message.loading) {
                showTypingIndicator();
            } else {
                hideTypingIndicator();
            }
            break;
        }
        case 'moreMessagesLoaded': {
            messages = [...message.messages, ...messages];
            totalMessages = message.total;
            renderMessages(true);
            break;
        }
    }
});
