import { Logger } from './logger';

/**
 * Represents a local Ollama model.
 */
export interface OllamaModel {
    name: string;
    size: number;
    digest: string;
    modified_at: string;
}

/**
 * Represents a running Ollama process.
 */
export interface OllamaProcess {
    name: string;
    model: string;
    size: number;
    digest: string;
    details: {
        parent_model: string;
        format: string;
        family: string;
        families: string[];
        parameter_size: string;
        quantization_level: string;
    };
    expires_at: string;
    size_vram: number;
}

/**
 * Response from /api/show
 */
export interface OllamaShowResponse {
    modelfile: string;
    parameters: string;
    template: string;
    details: {
        parent_model: string;
        format: string;
        family: string;
        families: string[];
        parameter_size: string;
        quantization_level: string;
    };
    messages?: { role: string; content: string }[];
}

/**
 * Error response from Ollama API
 */
interface OllamaErrorResponse {
    error: string;
}

/**
 * Options for model generation/chat
 */
export interface OllamaOptions {
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
    [key: string]: string | number | boolean | string[] | undefined;
}

/**
 * Base structure for streaming responses
 */
interface BaseStreamResponse {
    error?: string;
    status?: string;
}

export interface OllamaChatResponse extends BaseStreamResponse {
    model: string;
    created_at: string;
    message?: {
        role: string;
        content: string;
    };
    done: boolean;
}

export interface OllamaPullResponse extends BaseStreamResponse {
    completed?: number;
    total?: number;
}

export interface OllamaCreateResponse extends BaseStreamResponse {
    status?: string;
}

/**
 * Robust Ollama API Client.
 * Uses native fetch (Node 18+) and AsyncGenerators for streaming.
 */
export class OllamaApi {
    private readonly baseUrl: string;

    constructor(baseUrl: string = 'http://localhost:11434') {
        this.baseUrl = baseUrl;
    }

    /**
     * Lists all models available locally.
     */
    async listModels(): Promise<OllamaModel[]> {
        const response = await this._request<{ models: OllamaModel[] }>('/api/tags');
        return response.models || [];
    }

    /**
     * Lists all models currently loaded in memory.
     */
    async listRunning(): Promise<OllamaProcess[]> {
        const response = await this._request<{ models: OllamaProcess[] }>('/api/ps');
        return response.models || [];
    }

    /**
     * Fetches detailed information about a model.
     */
    async showModel(model: string): Promise<OllamaShowResponse> {
        return this._request<OllamaShowResponse>('/api/show', {
            method: 'POST',
            body: JSON.stringify({ model }),
        });
    }

    /**
     * Deletes a model from the local system.
     */
    async deleteModel(model: string): Promise<void> {
        await this._request('/api/delete', {
            method: 'DELETE',
            body: JSON.stringify({ name: model }),
        });
    }

    /**
     * Unloads a model from memory.
     */
    async stopModel(model: string): Promise<void> {
        await this._request('/api/generate', {
            method: 'POST',
            body: JSON.stringify({ model, prompt: '', stream: false, keep_alive: 0 }),
        });
    }

    /**
     * Loads a model into memory.
     */
    async startModel(model: string): Promise<void> {
        await this._request('/api/generate', {
            method: 'POST',
            body: JSON.stringify({ model, prompt: '', stream: false }),
        });
    }

    /**
     * Downloads a model from the Ollama library.
     */
    async pullModel(
        model: string,
        onProgress: (status: string, completed?: number, total?: number) => void,
    ): Promise<void> {
        for await (const part of this._requestStream<OllamaPullResponse>('/api/pull', {
            method: 'POST',
            body: JSON.stringify({ model }),
        })) {
            if (part.status) {
                onProgress(part.status, part.completed, part.total);
            }
        }
    }

    /**
     * Creates a new model instance from a base model.
     */
    async createModel(options: {
        model: string;
        from?: string;
        parameters?: OllamaOptions;
        system?: string;
        template?: string;
    }): Promise<void> {
        for await (const part of this._requestStream<OllamaCreateResponse>('/api/create', {
            method: 'POST',
            body: JSON.stringify(options),
        })) {
            if (part.error) {
                throw new Error(part.error);
            }
        }
    }

    /**
     * Initiates a chat session with a model.
     */
    async chat(
        model: string,
        messages: { role: string; content: string }[],
        onToken: (token: string) => void,
        options?: OllamaOptions,
    ): Promise<void> {
        for await (const part of this._requestStream<OllamaChatResponse>('/api/chat', {
            method: 'POST',
            body: JSON.stringify({ model, messages, options, stream: true }),
        })) {
            if (part.message?.content) {
                onToken(part.message.content);
            }
        }
    }

    /**
     * Unified request handler for standard JSON endpoints.
     */
    private async _request<T>(path: string, options: RequestInit = {}): Promise<T> {
        const url = `${this.baseUrl}${path}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            let errorMsg = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const body = (await response.json()) as OllamaErrorResponse;
                if (body && typeof body === 'object' && body.error) {
                    errorMsg = body.error;
                }
            } catch {
                // Ignore parse errors for error bodies
            }
            Logger.error(`Ollama API error at ${path}: ${errorMsg}`);
            throw new Error(errorMsg);
        }

        // Some endpoints return 200 but no body (like delete)
        if (response.status === 200 && (options.method === 'DELETE' || path === '/api/delete')) {
            return {} as T;
        }

        return (await response.json()) as T;
    }

    /**
     * Unified request handler for streaming newline-delimited JSON endpoints.
     */
    private async *_requestStream<T extends BaseStreamResponse>(
        path: string,
        options: RequestInit = {},
    ): AsyncGenerator<T> {
        const url = `${this.baseUrl}${path}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            let errorMsg = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const body = (await response.json()) as OllamaErrorResponse;
                if (body && typeof body === 'object' && body.error) {
                    errorMsg = body.error;
                }
            } catch {
                // Ignore
            }
            throw new Error(errorMsg);
        }

        if (!response.body) {
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');

                // Keep the last partial line in the buffer
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) {
                        continue;
                    }
                    try {
                        const json = JSON.parse(line) as T;
                        if (json.error) {
                            throw new Error(json.error);
                        }
                        yield json;
                    } catch (e: unknown) {
                        if (e instanceof SyntaxError) {
                            // Ignore partial JSON
                            continue;
                        }
                        throw e;
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }
}
