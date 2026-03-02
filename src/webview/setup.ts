import { SetupExtensionToWebviewCommand, SetupWebviewToExtensionCommand } from '../contracts/IWebviewMessages';
import { ModelInstance } from '../models/modelInstance';
import { assertNever } from '../utils';

declare function acquireVsCodeApi(): {
    postMessage(message: SetupWebviewToExtensionCommand): void;
    getState(): unknown;
    setState(state: unknown): void;
};

const vscode = acquireVsCodeApi();

// DOM Elements - Header & Details
const instanceNameInput = document.getElementById('instance-name') as HTMLInputElement;
const instanceDescriptionTextarea = document.getElementById('instance-description') as HTMLTextAreaElement;
const modelDetailsDiv = document.getElementById('model-details') as HTMLDivElement;
const statusBadge = document.getElementById('status-badge') as HTMLDivElement;

// DOM Elements - Prompt Configuration
const systemMessageTextarea = document.getElementById('system-message') as HTMLTextAreaElement;
const userPrefixTextarea = document.getElementById('user-prefix') as HTMLTextAreaElement;
const userSuffixTextarea = document.getElementById('user-suffix') as HTMLTextAreaElement;
const systemTurnPrefixTextarea = document.getElementById('system-turn-prefix') as HTMLTextAreaElement;
const systemTurnSuffixTextarea = document.getElementById('system-turn-suffix') as HTMLTextAreaElement;

// DOM Elements - Hardware
const numGpuInput = document.getElementById('num_gpu') as HTMLInputElement;
const numGpuSlider = document.getElementById('num_gpu-slider') as HTMLInputElement;
const numThreadInput = document.getElementById('num_thread') as HTMLInputElement;
const numThreadSlider = document.getElementById('num_thread-slider') as HTMLInputElement;
const useMmapCheckbox = document.getElementById('use_mmap') as HTMLInputElement;
const useMlockCheckbox = document.getElementById('use_mlock') as HTMLInputElement;

// DOM Elements - Inference
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

// Buttons
const applyTemplateBtn = document.getElementById('apply-template-btn') as HTMLButtonElement;
const resetToDefaultBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;
const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
const generateSeedBtn = document.getElementById('generate-seed-btn') as HTMLElement;
const resetHardwareBtn = document.getElementById('reset-hardware-btn') as HTMLButtonElement;
const resetInferenceBtn = document.getElementById('reset-inference-btn') as HTMLButtonElement;

let currentInstance: ModelInstance;

// Helper to sync slider and input
function syncSliderInput(slider: HTMLInputElement, input: HTMLInputElement) {
    if (!slider || !input) {
        return;
    }
    slider.addEventListener('input', () => {
        input.value = slider.value;
    });
    input.addEventListener('input', () => {
        slider.value = input.value;
    });
}

syncSliderInput(numGpuSlider, numGpuInput);
syncSliderInput(numThreadSlider, numThreadInput);
syncSliderInput(numCtxSlider, numCtxInput);
syncSliderInput(numPredictSlider, numPredictInput);
syncSliderInput(temperatureSlider, temperatureInput);

// Handle messages from the extension
window.addEventListener('message', (event) => {
    const message = event.data as SetupExtensionToWebviewCommand;
    switch (message.command) {
        case 'init': {
            const model = message.model;
            const settings = message.settings;
            currentInstance = settings;

            instanceNameInput.value = settings.name || '';
            instanceDescriptionTextarea.value = settings.description || '';
            modelDetailsDiv.textContent = `${model.name} • ${(model.size / 1024 / 1024 / 1024).toFixed(2)} GB`;

            if (message.isRunning) {
                statusBadge.textContent = 'Running';
                statusBadge.className = 'badge status-running';
                statusBadge.classList.remove('hidden');
            } else {
                statusBadge.textContent = 'Stopped';
                statusBadge.className = 'badge status-stopped';
                statusBadge.classList.remove('hidden');
            }

            // Prompt Config
            systemMessageTextarea.value = settings.systemMessage || message.defaultMessage;
            userPrefixTextarea.value = settings.userMessagePrefix || '';
            userSuffixTextarea.value = settings.userMessageSuffix || '';
            systemTurnPrefixTextarea.value = settings.systemTurnPrefix || '';
            systemTurnSuffixTextarea.value = settings.systemTurnSuffix || '';

            // Hardware Config
            const c = settings.config || {};
            const setVal = (
                input: HTMLInputElement,
                slider: HTMLInputElement,
                val: string | number | boolean | string[] | undefined,
            ) => {
                const v = val !== undefined && val !== null ? val.toString() : '';
                input.value = v;
                if (slider) {
                    slider.value = v;
                }
            };

            setVal(numGpuInput, numGpuSlider, c.num_gpu);
            setVal(numThreadInput, numThreadSlider, c.num_thread);
            useMmapCheckbox.checked = !!c.use_mmap;
            useMlockCheckbox.checked = !!c.use_mlock;

            // Inference Config
            setVal(numCtxInput, numCtxSlider, c.num_ctx);
            setVal(numPredictInput, numPredictSlider, c.num_predict);
            setVal(temperatureInput, temperatureSlider, c.temperature);

            topPInput.value = (c.top_p ?? '').toString();
            topKInput.value = (c.top_k ?? '').toString();
            repeatPenaltyInput.value = (c.repeat_penalty ?? '').toString();
            seedInput.value = (c.seed ?? '').toString();
            stopInput.value = (c.stop || []).join(', ');

            // Setup Individual Reset Icons
            document.querySelectorAll('.reset-icon').forEach((icon) => {
                (icon as HTMLElement).onclick = () => {
                    const field = (icon as HTMLElement).dataset.field;
                    if (!field) {
                        return;
                    }
                    const originalParams = message.originalParams || {};
                    const originalVal = originalParams[field];

                    const input = document.getElementById(field) as HTMLInputElement;
                    const slider = document.getElementById(`${field}-slider`) as HTMLInputElement;

                    if (input) {
                        if (input.type === 'checkbox') {
                            input.checked = !!originalVal;
                        } else {
                            const v = originalVal !== undefined && originalVal !== null ? originalVal.toString() : '';
                            input.value = v;
                            if (slider) {
                                slider.value = v;
                            }
                        }
                    }
                };
            });

            break;
        }
        case 'updateFields': {
            const s = message.settings;
            if (s.systemMessage !== undefined) {
                systemMessageTextarea.value = s.systemMessage;
            }
            if (s.userMessagePrefix !== undefined) {
                userPrefixTextarea.value = s.userMessagePrefix;
            }
            if (s.userMessageSuffix !== undefined) {
                userSuffixTextarea.value = s.userMessageSuffix;
            }
            if (s.systemTurnPrefix !== undefined) {
                systemTurnPrefixTextarea.value = s.systemTurnPrefix;
            }
            if (s.systemTurnSuffix !== undefined) {
                systemTurnSuffixTextarea.value = s.systemTurnSuffix;
            }
            break;
        }
        default:
            assertNever(message);
    }
});

// Button Actions
applyTemplateBtn.onclick = () => {
    vscode.postMessage({ command: 'applyFraming' });
};

resetHardwareBtn.onclick = () => {
    vscode.postMessage({ command: 'resetGroup', group: 'hardware' });
};

resetInferenceBtn.onclick = () => {
    vscode.postMessage({ command: 'resetGroup', group: 'inference' });
};

resetToDefaultBtn.onclick = () => {
    // This is a full reset to extension defaults
    vscode.postMessage({ command: 'resetGroup', group: 'hardware' });
    vscode.postMessage({ command: 'resetGroup', group: 'inference' });
    systemMessageTextarea.value = 'You are a helpful AI assistant.';
    userPrefixTextarea.value = '';
    userSuffixTextarea.value = '';
    systemTurnPrefixTextarea.value = '';
    systemTurnSuffixTextarea.value = '';
};

cancelBtn.onclick = () => {
    vscode.postMessage({ command: 'cancel' });
};

generateSeedBtn.onclick = () => {
    const randomSeed = Math.floor(Math.random() * 1000000);
    seedInput.value = randomSeed.toString();
};

saveBtn.onclick = () => {
    const config = { ...currentInstance.config };

    const getNum = (input: HTMLInputElement) => {
        const val = input.value.trim();
        if (val === '') {
            return undefined;
        }
        const num = Number(val);
        return isNaN(num) ? undefined : num;
    };

    config.num_gpu = getNum(numGpuInput);
    config.num_thread = getNum(numThreadInput);
    config.use_mmap = useMmapCheckbox.checked;
    config.use_mlock = useMlockCheckbox.checked;

    config.num_ctx = getNum(numCtxInput);
    config.num_predict = getNum(numPredictInput);
    config.temperature = getNum(temperatureInput);
    config.top_p = getNum(topPInput);
    config.top_k = getNum(topKInput);
    config.repeat_penalty = getNum(repeatPenaltyInput);
    config.seed = getNum(seedInput);

    const stopStr = stopInput.value.trim();
    config.stop =
        stopStr === ''
            ? undefined
            : stopStr
                  .split(',')
                  .map((s) => s.trim())
                  .filter((s) => s.length > 0);

    vscode.postMessage({
        command: 'save',
        instance: {
            ...currentInstance,
            name: instanceNameInput.value,
            description: instanceDescriptionTextarea.value,
            systemMessage: systemMessageTextarea.value,
            userMessagePrefix: userPrefixTextarea.value,
            userMessageSuffix: userSuffixTextarea.value,
            systemTurnPrefix: systemTurnPrefixTextarea.value,
            systemTurnSuffix: systemTurnSuffixTextarea.value,
            config,
        },
    });
};
