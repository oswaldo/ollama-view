import * as http from 'http';

const modelToDelete = 'tinyllama:latest'; // or just 'tinyllama' depending on how it was pulled

function testDelete(name: string) {
    console.log(`Attempting to delete: ${name}`);
    const request = http.request(
        'http://127.0.0.1:11434/api/delete',
        {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
        },
        (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => {
                console.log(`Status: ${res.statusCode}`);
                console.log(`Body: ${data}`);
            });
        },
    );

    request.on('error', (e) => console.error(e));
    request.write(JSON.stringify({ name }));
    request.end();
}

testDelete('tinyllama');
setTimeout(() => testDelete('tinyllama:latest'), 1000);
