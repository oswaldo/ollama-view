import { OllamaApi } from './ollamaApi';

async function main() {
    const api = new OllamaApi();
    try {
        console.log('Attemping delete of tinyllama using patched API...');
        // We can't know for sure if tinyllama exists, but we can try.
        // Or pull it first properly if we want a 100% reproduction.
        // Assuming user has it or doesn't, we just want to see if we get 400 or 404 (if not found) or 200.
        // 400 is the bad one. 404 is fine (means request was understood but model missing).
        await api.deleteModel('tinyllama:latest');
        console.log('Delete successful (200 OK)');
    } catch (e: any) {
        console.log('Delete failed:', e.message);
    }
}
main();
