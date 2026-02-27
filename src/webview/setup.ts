declare function acquireVsCodeApi(): {
    postMessage(message: any): void;
    getState(): any;
    setState(state: any): void;
};

const vscode = acquireVsCodeApi();

// Header & Info
const instanceNameInput = document.getElementById('instance-name') as HTMLInputElement;
const instanceDescriptionTextarea = document.getElementById('instance-description') as HTMLTextAreaElement;
const modelDetailsDiv = document.getElementById('model-details') as HTMLDivElement;
const statusBadge = document.getElementById('status-badge') as HTMLDivElement;

// Prompt Configuration
const systemMessageTextarea = document.getElementById('system-message') as HTMLTextAreaElement;
const userPrefixTextarea = document.getElementById('user-prefix') as HTMLTextAreaElement;
const userSuffixTextarea = document.getElementById('user-suffix') as HTMLTextAreaElement;
const systemTurnPrefixTextarea = document.getElementById('system-turn-prefix') as HTMLTextAreaElement;
const systemTurnSuffixTextarea = document.getElementById('system-turn-suffix') as HTMLTextAreaElement;

// Hardware & Performance
const numGpuInput = document.getElementById('num_gpu') as HTMLInputElement;
const numGpuSlider = document.getElementById('num_gpu-slider') as HTMLInputElement;
const numThreadInput = document.getElementById('num_thread') as HTMLInputElement;
const numThreadSlider = document.getElementById('num_thread-slider') as HTMLInputElement;
const useMmapCheckbox = document.getElementById('use_mmap') as HTMLInputElement;
const useMlockCheckbox = document.getElementById('use_mlock') as HTMLInputElement;
const resetHardwareBtn = document.getElementById('reset-hardware-btn') as HTMLButtonElement;

// Inference & Generation
const numCtxInput = document.getElementById('num_ctx') as HTMLInputElement;
const numCtxSlider = document.getElementById('num_ctx-slider') as HTMLInputElement;
const numPredictInput = document.getElementById('num_predict') as HTMLInputElement;
const numPredictSlider = document.getElementById('num_predict-slider') as HTMLInputElement;
const temperatureInput = document.getElementById('temperature') as HTMLInputElement;
const temperatureSlider = document.getElementById('temperature-slider') as HTMLInputElement;
const topPInput = document.getElementById('top_p') as HTMLInputElement;
const topKInput = document.getElementById('top_k') as HTMLInputElement;
const repeatPenaltyInput = document.getElementById('repeat_penalty') as HTMLInputElement;
const seedInput = document.getElementById('seed') as HTMLInputElement;
const stopInput = document.getElementById('stop') as HTMLInputElement;
const resetInferenceBtn = document.getElementById('reset-inference-btn') as HTMLButtonElement;

// Main Actions
const applyFramingBtn = document.getElementById('apply-template-btn') as HTMLButtonElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;
const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;

let defaultMessage = '';
let originalParams: any = null;

function syncSliderAndInput(slider: HTMLInputElement, input: HTMLInputElement) {
    slider.addEventListener('input', () => {
        input.value = slider.value;
    });
    input.addEventListener('input', () => {
        slider.value = input.value;
    });
}

syncSliderAndInput(numGpuSlider, numGpuInput);
syncSliderAndInput(numThreadSlider, numThreadInput);
syncSliderAndInput(numCtxSlider, numCtxInput);
syncSliderAndInput(numPredictSlider, numPredictInput);
syncSliderAndInput(temperatureSlider, temperatureInput);

function updateUI(settings: any, isRunning: boolean, model: any) {
    instanceNameInput.value = settings.name || model.name;
    instanceDescriptionTextarea.value = settings.description || '';
    modelDetailsDiv.textContent = `Model: ${model.name} | Size: ${(model.size / 1024 / 1024 / 1024).toFixed(2)} GB`;
    
    if (isRunning) {
        statusBadge.classList.remove('hidden');
        statusBadge.textContent = 'Running';
    } else {
        statusBadge.classList.add('hidden');
    }

    // Prompt Config
    systemMessageTextarea.value = settings.systemMessage || '';
    userPrefixTextarea.value = settings.userMessagePrefix || '';
    userSuffixTextarea.value = settings.userMessageSuffix || '';
    systemTurnPrefixTextarea.value = settings.systemTurnPrefix || '';
    systemTurnSuffixTextarea.value = settings.systemTurnSuffix || '';
    
    // Hardware Config
    const config = settings.config || {};
    
    const setVal = (input: HTMLInputElement, slider: HTMLInputElement | null, val: any, def: string) => {
        const finalVal = (val ?? '').toString();
        input.value = finalVal;
        if (slider) slider.value = finalVal || def;
    };

    setVal(numGpuInput, numGpuSlider, config.num_gpu, '0');
    setVal(numThreadInput, numThreadSlider, config.num_thread, '1');
    useMmapCheckbox.checked = config.use_mmap ?? originalParams?.use_mmap ?? true;
    useMlockCheckbox.checked = !!config.use_mlock;

    // Inference Config
    setVal(numCtxInput, numCtxSlider, config.num_ctx, '2048');
    setVal(numPredictInput, numPredictSlider, config.num_predict, '128');
    setVal(temperatureInput, temperatureSlider, config.temperature, '0.8');
    
    topPInput.value = (config.top_p ?? '').toString();
    topKInput.value = (config.top_k ?? '').toString();
    repeatPenaltyInput.value = (config.repeat_penalty ?? '').toString();
    seedInput.value = (config.seed ?? '').toString();
    stopInput.value = (config.stop || []).join(', ');
}

window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
        case 'init': {
            originalParams = message.originalParams;
            defaultMessage = message.defaultMessage;
            updateUI(message.settings, message.isRunning, message.model);
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

// Individual Reset logic
document.querySelectorAll('.reset-icon').forEach(icon => {
    icon.addEventListener('click', () => {
        const field = icon.getAttribute('data-field');
        if (!field || !originalParams) return;

        const val = originalParams[field];
        switch (field) {
            case 'num_gpu': numGpuInput.value = (val ?? '').toString(); numGpuSlider.value = numGpuInput.value || '0'; break;
            case 'num_thread': numThreadInput.value = (val ?? '').toString(); numThreadSlider.value = numThreadInput.value || '1'; break;
            case 'use_mmap': useMmapCheckbox.checked = !!val; break;
            case 'use_mlock': useMlockCheckbox.checked = !!val; break;
            case 'num_ctx': numCtxInput.value = (val ?? '').toString(); numCtxSlider.value = numCtxInput.value || '2048'; break;
            case 'num_predict': numPredictInput.value = (val ?? '').toString(); numPredictSlider.value = numPredictInput.value || '128'; break;
            case 'temperature': temperatureInput.value = (val ?? '').toString(); temperatureSlider.value = temperatureInput.value || '0.8'; break;
            case 'top_p': topPInput.value = (val ?? '').toString(); break;
            case 'top_k': topKInput.value = (val ?? '').toString(); break;
            case 'repeat_penalty': repeatPenaltyInput.value = (val ?? '').toString(); break;
            case 'seed': seedInput.value = (val ?? '').toString(); break;
            case 'stop': stopInput.value = (Array.isArray(val) ? val : (val ? [val] : [])).join(', '); break;
        }
    });
});

applyFramingBtn.onclick = () => {
    vscode.postMessage({ command: 'applyFraming' });
};

resetBtn.onclick = () => {
    systemMessageTextarea.value = defaultMessage;
};

resetHardwareBtn.onclick = () => {
    vscode.postMessage({ command: 'resetGroup', group: 'hardware' });
};

resetInferenceBtn.onclick = () => {
    vscode.postMessage({ command: 'resetGroup', group: 'inference' });
};

cancelBtn.onclick = () => {
    vscode.postMessage({ command: 'cancel' });
};

saveBtn.onclick = () => {
    const config: any = {};
    const parse = (val: string, isFloat = false) => {
        if (val === '') return undefined;
        return isFloat ? parseFloat(val) : parseInt(val);
    };

    config.num_gpu = parse(numGpuInput.value);
    config.num_thread = parse(numThreadInput.value);
    config.use_mmap = useMmapCheckbox.checked;
    config.use_mlock = useMlockCheckbox.checked;

    config.num_ctx = parse(numCtxInput.value);
    config.num_predict = parse(numPredictInput.value);
    config.temperature = parse(temperatureInput.value, true);
    config.top_p = parse(topPInput.value, true);
    config.top_k = parse(topKInput.value);
    config.repeat_penalty = parse(repeatPenaltyInput.value, true);
    config.seed = parse(seedInput.value);
    if (stopInput.value) {
        config.stop = stopInput.value.split(',').map(s => s.trim()).filter(s => s !== '');
    }

    vscode.postMessage({
        command: 'save',
        instance: {
            name: instanceNameInput.value,
            description: instanceDescriptionTextarea.value,
            systemMessage: systemMessageTextarea.value,
            userMessagePrefix: userPrefixTextarea.value,
            userMessageSuffix: userSuffixTextarea.value,
            systemTurnPrefix: systemTurnPrefixTextarea.value,
            systemTurnSuffix: systemTurnSuffixTextarea.value,
            config: config
        }
    });
};
