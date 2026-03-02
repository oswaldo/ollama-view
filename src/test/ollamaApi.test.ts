import * as assert from 'assert';
import * as sinon from 'sinon';

import { OllamaApi } from '../ollamaApi';

suite('OllamaApi Unit Tests', () => {
    let api: OllamaApi;
    let fetchStub: sinon.SinonStub;

    setup(() => {
        api = new OllamaApi();
        // Mock global fetch
        fetchStub = sinon.stub(global, 'fetch');
    });

    teardown(() => {
        sinon.restore();
    });

    test('listModels should return models on success', async () => {
        const mockModels = { models: [{ name: 'test-model', size: 100 }] };
        fetchStub.resolves({
            ok: true,
            status: 200,
            json: async () => mockModels,
        });

        const models = await api.listModels();
        assert.strictEqual(models.length, 1);
        assert.strictEqual(models[0].name, 'test-model');
        assert.ok(fetchStub.calledWith(sinon.match('/api/tags')));
    });

    test('deleteModel should resolve on 200', async () => {
        fetchStub.resolves({
            ok: true,
            status: 200,
            json: async () => ({}),
        });

        await api.deleteModel('test-model');
        assert.ok(fetchStub.calledWith(sinon.match('/api/delete'), sinon.match({ method: 'DELETE' })));
    });

    test('deleteModel should reject on 400', async () => {
        fetchStub.resolves({
            ok: false,
            status: 400,
            statusText: 'Bad Request',
            json: async () => ({ error: 'invalid name' }),
        });

        try {
            await api.deleteModel('test-model');
            assert.fail('Should have rejected');
        } catch (err: unknown) {
            const error = err as Error;
            assert.strictEqual(error.message, 'invalid name');
        }
    });

    test('chat should handle streaming tokens', async () => {
        const mockChunks = [
            JSON.stringify({ message: { content: 'Hello' }, done: false }) + '\n',
            JSON.stringify({ message: { content: ' world' }, done: true }) + '\n',
        ];

        const readableStream = {
            getReader: () => {
                let chunkIndex = 0;
                return {
                    read: async () => {
                        if (chunkIndex < mockChunks.length) {
                            return { value: Buffer.from(mockChunks[chunkIndex++]), done: false };
                        }
                        return { done: true };
                    },
                    releaseLock: () => {},
                };
            },
        };

        fetchStub.resolves({
            ok: true,
            status: 200,
            body: readableStream,
        });

        let fullText = '';
        await api.chat('model', [], (token) => {
            fullText += token;
        });

        assert.strictEqual(fullText, 'Hello world');
    });

    test('chat should reject on API error', async () => {
        fetchStub.resolves({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: async () => ({ error: 'server crash' }),
        });

        try {
            await api.chat('model', [], () => {});
            assert.fail('Should have rejected');
        } catch (err: unknown) {
            const error = err as Error;
            assert.strictEqual(error.message, 'server crash');
        }
    });

    test('showModel should return model details', async () => {
        const mockDetails = {
            modelfile: '# Modelfile',
            details: { parameter_size: '3B' },
        };
        fetchStub.resolves({
            ok: true,
            status: 200,
            json: async () => mockDetails,
        });

        const details = await api.showModel('test-model');
        assert.strictEqual(details.modelfile, '# Modelfile');
        assert.strictEqual(details.details.parameter_size, '3B');
    });
});
