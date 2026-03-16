import * as assert from 'assert';

import { getVersionChangeType, VersionChangeType } from '../services/welcomeService';

suite('Welcome Version Logic', () => {
    test('should detect first install when lastSeen is undefined', () => {
        const result = getVersionChangeType('0.1.0', undefined);
        assert.strictEqual(result, VersionChangeType.FirstInstall);
    });

    test('should detect upgrade on major version change', () => {
        const result = getVersionChangeType('1.0.0', '0.1.0');
        assert.strictEqual(result, VersionChangeType.Upgrade);
    });

    test('should detect upgrade on minor version change', () => {
        const result = getVersionChangeType('0.2.0', '0.1.5');
        assert.strictEqual(result, VersionChangeType.Upgrade);
    });

    test('should detect no change on same major and minor version', () => {
        const result = getVersionChangeType('0.1.1', '0.1.0');
        assert.strictEqual(result, VersionChangeType.None);
    });

    test('should detect no change on identical version strings', () => {
        const result = getVersionChangeType('0.1.0', '0.1.0');
        assert.strictEqual(result, VersionChangeType.None);
    });

    test('should detect no change when current is older (should not happen but handled)', () => {
        const result = getVersionChangeType('0.1.0', '0.2.0');
        assert.strictEqual(result, VersionChangeType.None);
    });
});
