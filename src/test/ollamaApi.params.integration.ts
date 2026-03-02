import * as assert from 'assert';

import { OllamaApi } from '../ollamaApi';

suite('OllamaApi Parameter Change Integration', function () {
    this.timeout(120000);

    let api: OllamaApi;
    const testModelName = 'tinyllama';

    suiteSetup(async function () {
        api = new OllamaApi();
        try {
            await api.listModels();
        } catch {
            this.skip();
        }
    });

    test('should apply different options in consecutive chat calls', async () => {
        // 1. Chat with num_predict = 1
        console.log('Chatting with num_predict: 1');
        let response1 = '';
        await api.chat(
            testModelName,
            [{ role: 'user', content: 'Say hello world' }],
            (token) => {
                response1 += token;
            },
            { num_predict: 1 },
        );
        console.log(`Response 1: "${response1}"`);

        // num_predict 1 should be very short (likely 1-2 tokens depending on how Ollama counts)
        // Usually it's just one word or part of it.

        // 2. Chat with num_predict = 20
        console.log('Chatting with num_predict: 20');
        let response2 = '';
        await api.chat(
            testModelName,
            [{ role: 'user', content: 'Say hello world' }],
            (token) => {
                response2 += token;
            },
            { num_predict: 20 },
        );
        console.log(`Response 2: "${response2}"`);

        assert.ok(response2.length > response1.length, 'Second response should be longer than first with more tokens');
    });

    test('should handle hardware parameter changes (num_thread)', async () => {
        // Note: It's hard to verify num_thread effect without timing,
        // but we can check if it still works and doesn't error out.
        console.log('Chatting with num_thread: 1');
        let response1 = '';
        await api.chat(
            testModelName,
            [{ role: 'user', content: 'Tell me a short joke.' }],
            (token) => {
                response1 += token;
            },
            { num_thread: 1, num_predict: 20 },
        );
        assert.ok(response1.length > 0);

        console.log('Chatting with num_thread: 4');
        let response2 = '';
        await api.chat(
            testModelName,
            [{ role: 'user', content: 'Tell me a short joke.' }],
            (token) => {
                response2 += token;
            },
            { num_thread: 4, num_predict: 20 },
        );
        assert.ok(response2.length > 0);
    });
});
