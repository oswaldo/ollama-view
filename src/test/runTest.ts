import * as fg from 'fast-glob';
import * as Mocha from 'mocha';
import * as path from 'path';

import * as vscodeMock from './vscodeMock';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const moduleAlias = require('module');
const originalRequire = moduleAlias.prototype.require;
moduleAlias.prototype.require = function (this: unknown, name: string, ...args: unknown[]) {
    if (name === 'vscode') {
        return vscodeMock;
    }
    return originalRequire.apply(this, [name, ...args]);
};

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

run()
    .then(() => {
        console.log('Tests completed successfully.');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Failed to run tests', err);
        process.exit(1);
    });
