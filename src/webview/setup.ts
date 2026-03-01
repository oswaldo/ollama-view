interface WebviewMessage {
    command: string;
    [key: string]: unknown;
}

declare function acquireVsCodeApi(): {
    postMessage(message: WebviewMessage): void;
    getState(): unknown;
    setState(state: unknown): void;
};

const vscode = acquireVsCodeApi();

interface OllamaModel {
    name: string;
    size: number;
}

interface ModelInstance {
    id: string;
    name: string;
    modelName: string;
    ollamaModelName: string;
    systemMessage: string;
    config: {
        num_gpu?: number;
        num_thread?: number;
        use_mmap?: boolean;
        use_mlock?: boolean;
        num_ctx?: number;
        num_predict?: number;
        temperature?: number;
        top_p?: number;
        top_k?: number;
        repeat_penalty?: number;
        seed?: number;
        stop?: string[];
    };
}

const headerTitle = document.getElementById('header-title') as HTMLHeadingElement;
const modelNameSpan = document.getElementById('model-name') as HTMLSpanElement;
const modelSizeSpan = document.getElementById('model-size') as HTMLSpanElement;
const instanceStatus = document.getElementById('instance-status') as HTMLDivElement;

const instanceNameInput = document.getElementById('instance-name') as HTMLInputElement;
const systemMessageTextarea = document.getElementById('system-message') as HTMLTextAreaElement;

// Hardware Config
const numGpuInput = document.getElementById('num-gpu') as HTMLInputElement;
const numThreadInput = document.getElementById('num-thread') as HTMLInputElement;
const useMmapCheckbox = document.getElementById('use-mmap') as HTMLInputElement;
const useMlockCheckbox = document.getElementById('use-mlock') as HTMLInputElement;

// Inference Config
const numCtxInput = document.getElementById('num-ctx') as HTMLInputElement;
const numPredictInput = document.getElementById('num-predict') as HTMLInputElement;
const temperatureInput = document.getElementById('temperature') as HTMLInputElement;
const topPInput = document.getElementById('top-p') as HTMLInputElement;
const topKInput = document.getElementById('top-k') as HTMLInputElement;
const repeatPenaltyInput = document.getElementById('repeat-penalty') as HTMLInputElement;
const seedInput = document.getElementById('seed') as HTMLInputElement;
const stopInput = document.getElementById('stop') as HTMLInputElement;

const applyFramingBtn = document.getElementById('apply-framing-btn') as HTMLButtonElement;
const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;
const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;

const resetHardwareBtn = document.getElementById('reset-hardware') as HTMLButtonElement;
const resetInferenceBtn = document.getElementById('reset-inference') as HTMLButtonElement;

let currentInstance: ModelInstance;

window.addEventListener('message', (event) => {
    const message = event.data;
    switch (message.command) {
        case 'init': {
            const model = message.model as OllamaModel;
            const settings = message.settings as ModelInstance;
            currentInstance = settings;

            headerTitle.textContent = `Setup: ${settings.name}`;
            modelNameSpan.textContent = model.name;
            modelSizeSpan.textContent = (model.size / 1024 / 1024 / 1024).toFixed(2) + ' GB';

            if (message.isRunning) {
                instanceStatus.textContent = 'Running';
                instanceStatus.className = 'status-badge status-running';
            } else {
                instanceStatus.textContent = 'Stopped';
                instanceStatus.className = 'status-badge status-stopped';
            }

            instanceNameInput.value = settings.name;
            systemMessageTextarea.value = settings.systemMessage || (message.defaultMessage as string);

            const c = settings.config;
            numGpuInput.value = (c.num_gpu ?? '').toString();
            numThreadInput.value = (c.num_thread ?? '').toString();
            useMmapCheckbox.checked = !!c.use_mmap;
            useMlockCheckbox.checked = !!c.use_mlock;

            numCtxInput.value = (c.num_ctx ?? '').toString();
            numPredictInput.value = (c.num_predict ?? '').toString();
            temperatureInput.value = (c.temperature ?? '').toString();
            topPInput.value = (c.top_p ?? '').toString();
            topKInput.value = (c.top_k ?? '').toString();
            repeatPenaltyInput.value = (c.repeat_penalty ?? '').toString();
            seedInput.value = (c.seed ?? '').toString();
            stopInput.value = (c.stop || []).join(', ');
            break;
        }
        case 'updateFields': {
            const s = message.settings as Partial<ModelInstance>;
            if (s.systemMessage !== undefined) {
                systemMessageTextarea.value = s.systemMessage;
            }
            break;
        }
    }
});

applyFramingBtn.onclick = () => {
    vscode.postMessage({ command: 'applyFraming' });
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
    const config = currentInstance.config;

    // Helper to get numeric value or undefined
    const getNum = (input: HTMLInputElement) => {
        const val = input.value.trim();
        return val === '' ? undefined : Number(val);
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
            systemMessage: systemMessageTextarea.value,
            config,
        },
    });
};
