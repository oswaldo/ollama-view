import * as http from 'http';
import { Logger } from './logger';

export interface OllamaModel {
    name: string;
    size: number;
    digest: string;
    modified_at: string;
}

export interface OllamaProcess {
    name: string;
    model: string;
    size: number;
    digest: string;
    expires_at: string;
}

export class OllamaApi {
    private readonly baseUrl = 'http://127.0.0.1:11434';

    async listModels(): Promise<OllamaModel[]> {
        try {
            const response = await this.get('/api/tags');
            return response.models || [];
        } catch (error) {
            Logger.error('Failed to list models', error);
            return [];
        }
    }

    async listRunning(): Promise<OllamaProcess[]> {
        try {
            const response = await this.get('/api/ps');
            return response.models || [];
        } catch (error) {
            Logger.error('Failed to list running models', error);
            return [];
        }
    }

    async pullModel(
        name: string,
        progressCallback?: (status: string, completed?: number, total?: number) => void,
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = http.request(
                `${this.baseUrl}/api/pull`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                },
                (res) => {
                    if (res.statusCode !== 200) {
                        let data = '';
                        res.on('data', (chunk) => (data += chunk));
                        res.on('end', () => {
                            try {
                                const json = JSON.parse(data);
                                reject(new Error(json.error || `Status: ${res.statusCode} - ${data}`));
                            } catch {
                                reject(new Error(`Status: ${res.statusCode} - ${data}`));
                            }
                        });
                        return;
                    }

                    res.setEncoding('utf8');
                    res.on('data', (chunk) => {
                        try {
                            const lines = chunk.split('\n').filter((l: string) => l.trim() !== '');
                            for (const line of lines) {
                                const json = JSON.parse(line);
                                if (json.status) {
                                    if (progressCallback) {
                                        progressCallback(json.status, json.completed, json.total);
                                    }
                                }
                                if (json.error) {
                                    reject(new Error(json.error));
                                }
                            }
                        } catch {
                            // partial chunk?
                        }
                    });
                    res.on('end', () => resolve());
                },
            );

            request.on('error', (err) => reject(err));
            request.write(JSON.stringify({ name, stream: true }));
            request.end();
        });
    }

    async deleteModel(name: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const body = JSON.stringify({ name });
            const request = http.request(
                `${this.baseUrl}/api/delete`,
                {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(body),
                    },
                },
                (res) => {
                    let data = '';
                    res.on('data', (c) => (data += c));
                    res.on('end', () => {
                        if (res.statusCode === 200) {
                            resolve();
                        } else {
                            try {
                                const json = JSON.parse(data);
                                reject(new Error(json.error || `Status: ${res.statusCode} - ${data}`));
                            } catch {
                                reject(new Error(`Status: ${res.statusCode} - ${data}`));
                            }
                        }
                    });
                },
            );
            request.on('error', reject);
            request.write(body);
            request.end();
        });
    }

    async startModel(name: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = http.request(
                `${this.baseUrl}/api/generate`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                },
                (res) => {
                    if (res.statusCode !== 200) {
                        let data = '';
                        res.on('data', (chunk) => (data += chunk));
                        res.on('end', () => {
                            try {
                                const json = JSON.parse(data);
                                reject(new Error(json.error || `Status: ${res.statusCode} - ${data}`));
                            } catch {
                                reject(new Error(`Status: ${res.statusCode} - ${data}`));
                            }
                        });
                        return;
                    }
                    res.resume(); // consume
                    res.on('end', resolve);
                },
            );
            request.on('error', reject);
            request.write(JSON.stringify({ model: name, keep_alive: '5m' }));
            request.end();
        });
    }

    async stopModel(name: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = http.request(
                `${this.baseUrl}/api/generate`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                },
                (res) => {
                    if (res.statusCode !== 200) {
                        let data = '';
                        res.on('data', (chunk) => (data += chunk));
                        res.on('end', () => {
                            try {
                                const json = JSON.parse(data);
                                reject(new Error(json.error || `Status: ${res.statusCode} - ${data}`));
                            } catch {
                                reject(new Error(`Status: ${res.statusCode} - ${data}`));
                            }
                        });
                        return;
                    }
                    res.resume();
                    res.on('end', resolve);
                },
            );
            request.on('error', reject);
            request.write(JSON.stringify({ model: name, keep_alive: 0 }));
            request.end();
        });
    }

    async chat(
        model: string,
        messages: { role: string; content: string }[],
        onToken: (token: string) => void,
        options?: any,
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = http.request(
                `${this.baseUrl}/api/chat`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                },
                (res) => {
                    if (res.statusCode !== 200) {
                        let data = '';
                        res.on('data', (chunk) => (data += chunk));
                        res.on('end', () => {
                            try {
                                const json = JSON.parse(data);
                                reject(new Error(json.error || `Status: ${res.statusCode} - ${data}`));
                            } catch {
                                reject(new Error(`Status: ${res.statusCode} - ${data}`));
                            }
                        });
                        return;
                    }

                    res.setEncoding('utf8');
                    res.on('data', (chunk) => {
                        try {
                            const lines = chunk.split('\n').filter((l: string) => l.trim() !== '');
                            for (const line of lines) {
                                const json = JSON.parse(line);
                                if (json.message && json.message.content) {
                                    onToken(json.message.content);
                                }
                                if (json.error) {
                                    reject(new Error(json.error));
                                }
                                if (json.done) {
                                    // done
                                }
                            }
                        } catch (e) {
                            // ignore partial
                        }
                    });
                    res.on('end', resolve);
                },
            );
            request.on('error', reject);
            request.write(JSON.stringify({ model, messages, options, stream: true }));
            request.end();
        });
    }

    async showModel(name: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const body = JSON.stringify({ name });
            const request = http.request(
                `${this.baseUrl}/api/show`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(body),
                    },
                },
                (res) => {
                    let data = '';
                    res.on('data', (chunk) => (data += chunk));
                    res.on('end', () => {
                        if (res.statusCode === 200) {
                            try {
                                resolve(JSON.parse(data));
                            } catch (e) {
                                reject(e);
                            }
                        } else {
                            try {
                                const json = JSON.parse(data);
                                reject(new Error(json.error || `Status: ${res.statusCode} - ${data}`));
                            } catch {
                                reject(new Error(`Status: ${res.statusCode} - ${data}`));
                            }
                        }
                    });
                },
            );
            request.on('error', reject);
            request.write(body);
            request.end();
        });
    }

    private get(path: string): Promise<any> {
        return new Promise((resolve, reject) => {
            http.get(`${this.baseUrl}${path}`, (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(e);
                    }
                });
            }).on('error', reject);
        });
    }
}
