import * as express from 'express';
import { Server } from 'http';

export class MockOllamaServer {
    private app = express();
    private server: Server | null = null;
    private port: number = 0;

    // In-memory state of mock models
    private models = new Set<string>();

    // Mock running models
    private runningModels = new Set<string>();

    // Error simulation state
    private errors = new Map<string, { status: number, message: string }>();

    // Mock responses for chat/generate
    private chatResponse: string = "This is a mock response from Ollama.";

    constructor() {
        this.app.use(express.json());

        // Error simulation middleware
        this.app.use((req, res, next) => {
            const error = this.errors.get(req.path);
            if (error) {
                res.status(error.status).json({ error: error.message });
                return;
            }
            next();
        });

        // /api/tags - Lists all models
        this.app.get('/api/tags', (_req: express.Request, res: express.Response) => {
            const modelsList = Array.from(this.models).map((name) => ({
                name,
                model: name,
                modified_at: new Date().toISOString(),
                size: 1000000,
                digest: 'mockdigest',
                details: {
                    format: 'gguf',
                    family: 'llama',
                    families: ['llama'],
                    parameter_size: '135m',
                    quantization_level: 'Q4_0'
                }
            }));
            res.json({ models: modelsList });
        });

        // /api/pull - Mocks pulling a model (streaming JSON response)
        this.app.post('/api/pull', (req: express.Request, res: express.Response) => {
            const { name } = req.body;
            const modelName = name || req.body.model;

            if (!modelName) {
                res.status(400).json({ error: 'model name is required' });
                return;
            }

            res.setHeader('Content-Type', 'application/json');

            // Send multiple chunks to simulate progress
            const chunks = [
                JSON.stringify({ status: "pulling manifest" }) + '\n',
                JSON.stringify({ status: "downloading model", completed: 50, total: 100 }) + '\n',
                JSON.stringify({ status: "verifying sha256 digest" }) + '\n',
                JSON.stringify({ status: "writing manifest" }) + '\n',
                JSON.stringify({ status: "success" }) + '\n'
            ];

            let i = 0;
            const interval = setInterval(() => {
                if (i < chunks.length) {
                    res.write(chunks[i]);
                    if (chunks[i].includes('success')) {
                        this.models.add(modelName);
                    }
                    i++;
                } else {
                    clearInterval(interval);
                    res.end();
                }
            }, 100);
        });

        // /api/delete - Mocks deleting a model
        this.app.delete('/api/delete', (req: express.Request, res: express.Response) => {
            const { name } = req.body;
            if (!name) {
                res.status(400).json({ error: 'name is required' });
                return;
            }
            if (this.models.has(name)) {
                this.models.delete(name);
                this.runningModels.delete(name);
                res.status(200).send();
            } else {
                res.status(404).json({ error: 'model not found' });
            }
        });

        // /api/ps - Lists running processes
        this.app.get('/api/ps', (_req: express.Request, res: express.Response) => {
            const runningList = Array.from(this.runningModels).map((name) => ({
                name,
                model: name,
                size: 1000000,
                digest: 'mockdigest',
                details: {
                    format: 'gguf',
                    family: 'llama',
                    families: ['llama'],
                    parameter_size: '135m',
                    quantization_level: 'Q4_0'
                },
                expires_at: new Date(Date.now() + 1000000).toISOString(),
                size_vram: 1000000
            }));
            res.json({ models: runningList });
        });

        // /api/show - Mocks showing model details
        this.app.post('/api/show', (req: express.Request, res: express.Response) => {
            const { name } = req.body;
            const modelName = name || req.body.model;
            if (this.models.has(modelName)) {
                res.json({
                    modelfile: `FROM ${modelName}\n`,
                    parameters: '',
                    template: '{{ .Prompt }}\n',
                    details: {}
                });
            } else {
                res.status(404).json({ error: 'model not found' });
            }
        });

        // /api/chat - Mocks chat completions (streaming)
        this.app.post('/api/chat', (req: express.Request, res: express.Response) => {
            const { model, stream } = req.body;
            if (!this.models.has(model)) {
                res.status(404).json({ error: 'model not found' });
                return;
            }

            this.runningModels.add(model);

            if (stream === false) {
                res.json({
                    model,
                    created_at: new Date().toISOString(),
                    message: {
                        role: 'assistant',
                        content: this.chatResponse
                    },
                    done: true
                });
                return;
            }

            res.setHeader('Content-Type', 'application/json');
            const words = this.chatResponse.split(' ');
            let i = 0;
            const interval = setInterval(() => {
                if (i < words.length) {
                    const chunk = words[i] + (i === words.length - 1 ? '' : ' ');
                    res.write(JSON.stringify({
                        model,
                        created_at: new Date().toISOString(),
                        message: {
                            role: 'assistant',
                            content: chunk
                        },
                        done: false
                    }) + '\n');
                    i++;
                } else {
                    res.write(JSON.stringify({
                        model,
                        created_at: new Date().toISOString(),
                        done: true
                    }) + '\n');
                    clearInterval(interval);
                    res.end();
                }
            }, 50);
        });

        // /api/generate - Mocks generation (streaming)
        this.app.post('/api/generate', (req: express.Request, res: express.Response) => {
            const { model, stream } = req.body;
            if (!this.models.has(model)) {
                res.status(404).json({ error: 'model not found' });
                return;
            }

            this.runningModels.add(model);

            if (stream === false) {
                res.json({
                    model,
                    created_at: new Date().toISOString(),
                    response: this.chatResponse,
                    done: true
                });
                return;
            }

            res.setHeader('Content-Type', 'application/json');
            const words = this.chatResponse.split(' ');
            let i = 0;
            const interval = setInterval(() => {
                if (i < words.length) {
                    const chunk = words[i] + (i === words.length - 1 ? '' : ' ');
                    res.write(JSON.stringify({
                        model,
                        created_at: new Date().toISOString(),
                        response: chunk,
                        done: false
                    }) + '\n');
                    i++;
                } else {
                    res.write(JSON.stringify({
                        model,
                        created_at: new Date().toISOString(),
                        done: true
                    }) + '\n');
                    clearInterval(interval);
                    res.end();
                }
            }, 50);
        });

        // /api/create - Mocks creating a model
        this.app.post('/api/create', (req: express.Request, res: express.Response) => {
            const { name } = req.body;
            if (!name) {
                res.status(400).json({ error: 'name is required' });
                return;
            }
            this.models.add(name);
            res.json({ status: 'success' });
        });
    }

    public start(): Promise<number> {
        return new Promise((resolve, reject) => {
            // port 0 means the OS assigns a random available port
            this.server = this.app.listen(0, '127.0.0.1', () => {
                const address = this.server?.address();
                if (address && typeof address !== 'string') {
                    this.port = address.port;
                    resolve(this.port);
                } else {
                    reject(new Error('Failed to get server port'));
                }
            });
            if (this.server) {
                this.server.on('error', reject);
            }
        });
    }

    public stop(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.server) {
                this.server.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    public getPort(): number {
        return this.port;
    }

    public addModel(name: string): void {
        this.models.add(name);
    }

    public clearModels(): void {
        this.models.clear();
    }

    public setError(path: string, status: number, message: string): void {
        this.errors.set(path, { status, message });
    }

    public clearError(path: string): void {
        this.errors.delete(path);
    }

    public setChatResponse(response: string): void {
        this.chatResponse = response;
    }
}
