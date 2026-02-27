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
let originalValues: any = null;

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

window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
        case 'init': {
            const instance = message.settings;
            instanceNameInput.value = instance.name || message.model.name;
            instanceDescriptionTextarea.value = instance.description || '';
            modelDetailsDiv.textContent = `Model: ${message.model.name} | Size: ${(message.model.size / 1024 / 1024 / 1024).toFixed(2)} GB`;
            
            // Set Status Badge
            if (message.isRunning) {
                statusBadge.classList.remove('hidden');
                statusBadge.textContent = 'Running';
            } else {
                statusBadge.classList.add('hidden');
            }

            // Prompt Config
            systemMessageTextarea.value = instance.systemMessage || '';
            userPrefixTextarea.value = instance.userMessagePrefix || '';
            userSuffixTextarea.value = instance.userMessageSuffix || '';
            systemTurnPrefixTextarea.value = instance.systemTurnPrefix || '';
            systemTurnSuffixTextarea.value = instance.systemTurnSuffix || '';
            
            // Hardware Config
            const config = instance.config || {};
            numGpuInput.value = (config.num_gpu ?? '').toString();
            numGpuSlider.value = numGpuInput.value || '0';
            numThreadInput.value = (config.num_thread ?? '').toString();
            numThreadSlider.value = numThreadInput.value || '1';
            useMmapCheckbox.checked = !!config.use_mmap;
            useMlockCheckbox.checked = !!config.use_mlock;

            // Inference Config
            numCtxInput.value = (config.num_ctx ?? '').toString();
            numCtxSlider.value = numCtxInput.value || '2048';
            numPredictInput.value = (config.num_predict ?? '').toString();
            numPredictSlider.value = numPredictInput.value || '128';
            temperatureInput.value = (config.temperature ?? '').toString();
            temperatureSlider.value = temperatureInput.value || '0.8';
            topPInput.value = (config.top_p ?? '').toString();
            topKInput.value = (config.top_k ?? '').toString();
            repeatPenaltyInput.value = (config.repeat_penalty ?? '').toString();
            seedInput.value = (config.seed ?? '').toString();
            stopInput.value = (config.stop || []).join(', ');

            defaultMessage = message.defaultMessage;
            originalValues = message.originalValues;
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

resetHardwareBtn.onclick = () => {
    if (originalValues && originalValues.modelfile) {
        vscode.postMessage({ command: 'resetGroup', group: 'hardware' });
    }
};

resetInferenceBtn.onclick = () => {
    if (originalValues && originalValues.modelfile) {
        vscode.postMessage({ command: 'resetGroup', group: 'inference' });
    }
};

cancelBtn.onclick = () => {
    vscode.postMessage({ command: 'cancel' });
};

saveBtn.onclick = () => {
    const config: any = {};
    if (numGpuInput.value) config.num_gpu = parseInt(numGpuInput.value);
    if (numThreadInput.value) config.num_thread = parseInt(numThreadInput.value);
    config.use_mmap = useMmapCheckbox.checked;
    config.use_mlock = useMlockCheckbox.checked;

    if (numCtxInput.value) config.num_ctx = parseInt(numCtxInput.value);
    if (numPredictInput.value) config.num_predict = parseInt(numPredictInput.value);
    if (temperatureInput.value) config.temperature = parseFloat(temperatureInput.value);
    if (topPInput.value) config.top_p = parseFloat(topPInput.value);
    if (topKInput.value) config.top_k = parseInt(topKInput.value);
    if (repeatPenaltyInput.value) config.repeat_penalty = parseFloat(repeatPenaltyInput.value);
    if (seedInput.value) config.seed = parseInt(seedInput.value);
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
