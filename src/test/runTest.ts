import * as path from 'path';
import * as Mocha from 'mocha';
import * as fg from 'fast-glob';

export function run(): Promise<void> {
    // Create the mocha test
    const mocha = new Mocha({
        ui: 'tdd',
        color: true,
    });

    const testsRoot = path.resolve(__dirname, '..');

    return new Promise((resolve, reject) => {
        // glob patterns are relative to cwd usually, fast-glob supports absolute too but let's be careful
        // pattern: **/*.test.js inside testsRoot
        const pattern = '**/*.test.js';

        fg(pattern, { cwd: testsRoot, absolute: false })
            .then((files) => {
                // Add files to the test suite
                files.forEach((f: string) => mocha.addFile(path.resolve(testsRoot, f)));

                try {
                    // Run the mocha test
                    mocha.run((failures) => {
                        if (failures > 0) {
                            reject(new Error(`${failures} tests failed.`));
                        } else {
                            resolve();
                        }
                    });
                } catch (err) {
                    console.error(err);
                    reject(err);
                }
            })
            .catch((err) => reject(err));
    });
}
