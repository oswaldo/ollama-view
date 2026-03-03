import { expect } from 'chai';

import { MockOllamaServer } from './e2e/mockOllamaServer';

interface MockResponse {
    models?: { name: string }[];
    error?: string;
}

suite('MockOllamaServer Unit Tests', () => {
    let mockServer: MockOllamaServer;
    let port: number;
    let baseUrl: string;

    setup(async () => {
        mockServer = new MockOllamaServer();
        port = await mockServer.start();
        baseUrl = `http://127.0.0.1:${port}`;
    });

    teardown(async () => {
        await mockServer.stop();
    });

    test('should list empty models by default', async () => {
        const response = await fetch(`${baseUrl}/api/tags`);
        const data = (await response.json()) as MockResponse;
        expect(data.models).to.be.an('array').and.have.lengthOf(0);
    });

    test('should allow adding models dynamically', async () => {
        mockServer.addModel('test-model');
        const response = await fetch(`${baseUrl}/api/tags`);
        const data = (await response.json()) as MockResponse;
        expect(data.models).to.have.lengthOf(1);
        expect(data.models?.[0]?.name).to.equal('test-model');
    });

    test('should allow clearing models', async () => {
        mockServer.addModel('test-model');
        mockServer.clearModels();
        const response = await fetch(`${baseUrl}/api/tags`);
        const data = (await response.json()) as MockResponse;
        expect(data.models).to.have.lengthOf(0);
    });

    test('should simulate errors when configured', async () => {
        mockServer.setError('/api/tags', 500, 'Internal Server Error');
        const response = await fetch(`${baseUrl}/api/tags`);
        expect(response.status).to.equal(500);
        const data = (await response.json()) as MockResponse;
        expect(data.error).to.equal('Internal Server Error');
        mockServer.clearError('/api/tags');
    });

    test('should return to normal after clearing error', async () => {
        mockServer.setError('/api/tags', 500, 'Internal Server Error');
        mockServer.clearError('/api/tags');
        const response = await fetch(`${baseUrl}/api/tags`);
        expect(response.status).to.equal(200);
    });

    test('should allow creating a model via /api/create', async () => {
        const response = await fetch(`${baseUrl}/api/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'created-model' })
        });
        expect(response.status).to.equal(200);
        const data = (await response.json()) as { status: string };
        expect(data.status).to.equal('success');

        const tagsResponse = await fetch(`${baseUrl}/api/tags`);
        const tagsData = (await tagsResponse.json()) as MockResponse;
        expect(tagsData.models?.some(m => m.name === 'created-model')).to.equal(true);
    });

    test('should handle chat completion', async () => {
        mockServer.addModel('chat-model');
        const response = await fetch(`${baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'chat-model', stream: false })
        });
        expect(response.status).to.equal(200);
        const data = (await response.json()) as { message: { content: string } };
        expect(data.message.content).to.equal('This is a mock response from Ollama.');
    });

    test('should handle streaming chat completion', async () => {
        mockServer.addModel('chat-model');
        const response = await fetch(`${baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'chat-model', stream: true })
        });
        expect(response.status).to.equal(200);
        const reader = response.body?.getReader();
        let content = '';
        while (true) {
            const result = await reader?.read();
            if (result?.done) {break;}
            const chunk = new TextDecoder().decode(result?.value);
            const lines = chunk.split('\n').filter(l => l.trim());
            for (const line of lines) {
                const data = JSON.parse(line) as { message?: { content: string } };
                if (data.message) {
                    content += data.message.content;
                }
            }
        }
        expect(content).to.equal('This is a mock response from Ollama.');
    });

    test('should show running models in /api/ps after chat', async () => {
        mockServer.addModel('running-model');
        await fetch(`${baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'running-model', stream: false })
        });

        const response = await fetch(`${baseUrl}/api/ps`);
        const data = (await response.json()) as MockResponse;
        expect(data.models?.some(m => m.name === 'running-model')).to.equal(true);
    });

    test('should allow custom chat responses', async () => {
        mockServer.addModel('chat-model');
        mockServer.setChatResponse('Custom response');
        const response = await fetch(`${baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'chat-model', stream: false })
        });
        const data = (await response.json()) as { message: { content: string } };
        expect(data.message.content).to.equal('Custom response');
    });
});
