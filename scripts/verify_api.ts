import { OllamaApi } from './ollamaApi';

async function main() {
    const api = new OllamaApi();

    console.log('--- Testing List Models ---');
    const models = await api.listModels();
    console.log(`Found ${models.length} models.`);
    models.forEach((m) => console.log(` - ${m.name} (${m.size})`));

    console.log('\n--- Testing List Running ---');
    const running = await api.listRunning();
    console.log(`Found ${running.length} running models.`);
    running.forEach((m) => console.log(` - ${m.model}`));

    if (models.length > 0) {
        const testModel = models[0].name;
        console.log(`\n--- Testing Start Model: ${testModel} ---`);
        try {
            await api.startModel(testModel);
            console.log('Start command sent (load).');
        } catch (e) {
            console.error('Start failed:', e);
        }

        console.log('\n--- Waiting 2s ---');
        await new Promise((r) => setTimeout(r, 2000));

        const runningAfter = await api.listRunning();
        console.log(
            'Running models after start:',
            runningAfter.map((m) => m.model),
        );

        console.log(`\n--- Testing Stop Model: ${testModel} ---`);
        try {
            await api.stopModel(testModel);
            console.log('Stop command sent (unload).');
        } catch (e) {
            console.error('Stop failed:', e);
        }
    } else {
        console.log('No models to test start/stop.');
    }
}

main().catch((err) => console.error(err));
