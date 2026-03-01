import { OllamaModel, OllamaOptions, OllamaShowResponse } from '../ollamaApi';

export interface IOllamaClient {
    listModels(): Promise<OllamaModel[]>;
    listRunning(): Promise<{ model: string }[]>;
    showModel(model: string): Promise<OllamaShowResponse>;
    startModel(model: string): Promise<void>;
    stopModel(model: string): Promise<void>;
    deleteModel(model: string): Promise<void>;
    pullModel(model: string, onProgress: (status: string, completed?: number, total?: number) => void): Promise<void>;
    createModel(options: {
        model: string;
        from?: string;
        parameters?: OllamaOptions;
        system?: string;
        template?: string;
    }): Promise<void>;
    chat(
        model: string,
        messages: { role: string; content: string }[],
        onToken: (token: string) => void,
        options?: OllamaOptions,
    ): Promise<void>;
}
