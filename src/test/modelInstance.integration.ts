import * as assert from 'assert';
import { v4 as uuidv4 } from 'uuid';

import { OllamaApi } from '../ollamaApi';

/**
 * Integration test to verify that custom model instances created with parameters
 * actually use those parameters when chatting.
 */
suite('Model Instance Parameter Integration', function () {
    this.timeout(30000); // 30s timeout for model creation/chat

    const api = new OllamaApi();
    const BASE_MODEL = 'tinyllama';
    const TEST_INSTANCE = `test-params-${uuidv4().substring(0, 8)}`;

    suiteSetup(async function () {
        // Ensure base model exists
        try {
            await api.showModel(BASE_MODEL);
        } catch {
            console.log(`Pulling ${BASE_MODEL} for integration test...`);
            await api.pullModel(BASE_MODEL, () => {});
        }
    });

    suiteTeardown(async function () {
        // Cleanup
        try {
            await api.stopModel(TEST_INSTANCE);
            await api.deleteModel(TEST_INSTANCE);
        } catch {
            // Ignore cleanup errors
        }
    });

    test('should apply instance-level parameters (num_predict) during creation', async () => {
        console.log(`Creating instance ${TEST_INSTANCE} with num_predict: 1`);

        // Create model with extreme constraint
        await api.createModel({
            model: TEST_INSTANCE,
            from: BASE_MODEL,
            parameters: {
                num_predict: 1,
            },
        });

        console.log(`Chatting with ${TEST_INSTANCE}...`);
        let tokenCount = 0;
        await api.chat(TEST_INSTANCE, [{ role: 'user', content: 'Say a long sentence.' }], () => {
            tokenCount++;
        });

        console.log(`Response token count: ${tokenCount}`);

        // num_predict: 1 should result in exactly 1 token (or very few if Ollama behaves slightly differently per version)
        // Usually it's exactly 1.
        assert.ok(tokenCount <= 2, `Expected at most 2 tokens with num_predict: 1, but got ${tokenCount}`);
    });
});
