import * as assert from 'assert';
import { v4 as uuidv4 } from 'uuid';

import { OllamaApi } from '../ollamaApi';

suite('OllamaApi Integration', function () {
    // Integration tests might take longer
    this.timeout(120000);

    let api: OllamaApi;
    const testModelName = `test-instance-${uuidv4()}`;
    const baseModel = 'tinyllama';

    suiteSetup(async function () {
        api = new OllamaApi();
        // Check if ollama is running
        try {
            await api.listModels();
        } catch (e) {
            console.error('Ollama not running. Skipping integration tests.');
            this.skip(); // Skip if Ollama is not available
        }

        // Ensure base model exists
        const models = await api.listModels();
        if (!models.some((m) => m.name.startsWith(baseModel))) {
            console.log(`Pulling ${baseModel} for integration tests...`);
            await api.pullModel(baseModel, (status) => console.log(`Pulling: ${status}`));
        }
    });

    test('should create, start, chat, stop, and delete a model instance', async () => {
        // 1. Create model
        console.log(`Creating test model: ${testModelName} from ${baseModel}`);
        await api.createModel({
            model: testModelName,
            from: baseModel,
            system: 'You are a test assistant. Answer with "ACK" if you understand.',
        });

        // 2. Verify it was created
        const modelsAfterCreate = await api.listModels();
        const createdModel = modelsAfterCreate.find((m) => m.name.startsWith(testModelName));
        assert.ok(createdModel, `Model ${testModelName} should be created`);

        // 3. Start model
        console.log(`Starting test model: ${testModelName}`);
        await api.startModel(testModelName);

        // Wait for it to appear in running list (with retries)
        let isRunning = false;
        for (let i = 0; i < 10; i++) {
            const running = await api.listRunning();
            isRunning = running.some((m) => m.name.startsWith(testModelName) || m.model.startsWith(testModelName));
            if (isRunning) {
                break;
            }
            await new Promise((r) => setTimeout(r, 1000));
        }
        assert.ok(isRunning, `Model ${testModelName} should be running`);

        // 4. Chat with model
        console.log(`Chatting with test model: ${testModelName}`);
        let fullResponse = '';
        await api.chat(
            testModelName,
            [{ role: 'user', content: 'Say ACK.' }],
            (token) => {
                fullResponse += token;
            },
            { num_predict: 10 },
        );
        console.log(`Response from model: ${fullResponse}`);
        assert.ok(fullResponse.length > 0, 'Should receive a response from chat');

        // 5. Stop model
        console.log(`Stopping test model: ${testModelName}`);
        await api.stopModel(testModelName);

        // Wait for it to disappear from running list (with retries)
        let isStopped = false;
        for (let i = 0; i < 10; i++) {
            const running = await api.listRunning();
            const stillRunning = running.some(
                (m) => m.name.startsWith(testModelName) || m.model.startsWith(testModelName),
            );
            if (!stillRunning) {
                isStopped = true;
                break;
            }
            await new Promise((r) => setTimeout(r, 1000));
        }
        assert.ok(isStopped, `Model ${testModelName} should not be running after stop`);

        // 6. Delete model
        console.log(`Deleting test model: ${testModelName}`);
        await api.deleteModel(testModelName);

        // 7. Verify it was deleted
        const modelsAfterDelete = await api.listModels();
        const deletedModel = modelsAfterDelete.find((m) => m.name.startsWith(testModelName));
        assert.ok(!deletedModel, `Model ${testModelName} should be deleted`);
    });
});
