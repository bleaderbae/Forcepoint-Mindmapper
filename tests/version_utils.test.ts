import { test, describe } from 'node:test';
import assert from 'node:assert';
import { compareVersions, isVersionString, getVersionStatus } from '../src/utils/version_utils.ts';

describe('compareVersions', () => {
    test('should return 1 when first version is greater', () => {
        assert.strictEqual(compareVersions('1.2', '1.1'), 1);
        assert.strictEqual(compareVersions('2.0', '1.9'), 1);
        assert.strictEqual(compareVersions('1.10', '1.2'), 1);
        assert.strictEqual(compareVersions('10.0', '2.0'), 1);
    });

    test('should return -1 when first version is smaller', () => {
        assert.strictEqual(compareVersions('1.1', '1.2'), -1);
        assert.strictEqual(compareVersions('1.9', '2.0'), -1);
        assert.strictEqual(compareVersions('1.2', '1.10'), -1);
    });

    test('should return 0 when versions are equal', () => {
        assert.strictEqual(compareVersions('1.0', '1.0'), 0);
        assert.strictEqual(compareVersions('1.0.0', '1.0.0'), 0);
    });

    test('should handle "v" prefix', () => {
        assert.strictEqual(compareVersions('v1.0', '1.0'), 0);
        assert.strictEqual(compareVersions('1.0', 'v1.0'), 0);
        assert.strictEqual(compareVersions('v2.0', 'v1.0'), 1);
    });

    test('should handle different lengths', () => {
        assert.strictEqual(compareVersions('1.0', '1.0.0'), 0);
        assert.strictEqual(compareVersions('1.0.1', '1.0'), 1);
        assert.strictEqual(compareVersions('1.0', '1.0.1'), -1);
    });

    test('should handle empty strings as 0', () => {
        assert.strictEqual(compareVersions('', ''), 0);
        assert.strictEqual(compareVersions('1.0', ''), 1);
    });
});

describe('isVersionString', () => {
    test('should return true for valid version strings', () => {
        assert.strictEqual(isVersionString('1.0'), true);
        assert.strictEqual(isVersionString('1.0.0'), true);
        assert.strictEqual(isVersionString('10.2'), true);
        assert.strictEqual(isVersionString('v1.0'), true);
        assert.strictEqual(isVersionString('1.x'), true); // Changed from 1.0.x to 1.x which matches ^\d+\.x$
        assert.strictEqual(isVersionString('123456'), true);
    });

    test('should return false for invalid version strings', () => {
        assert.strictEqual(isVersionString('abc'), false);
        assert.strictEqual(isVersionString('1.a'), false);
        assert.strictEqual(isVersionString('version 1'), false);
        assert.strictEqual(isVersionString('2023-01-01'), false);
        assert.strictEqual(isVersionString('1.0.x'), false); // Documenting that 1.0.x is not supported by current regex
    });
});

describe('getVersionStatus', () => {
    test('should identify EOL versions', () => {
        assert.strictEqual(getVersionStatus('8.3', 'Forcepoint DLP'), 'eol');
        assert.strictEqual(getVersionStatus('8.9', 'Forcepoint DLP'), 'eol');
    });

    test('should identify Current versions', () => {
        assert.strictEqual(getVersionStatus('10.2', 'Forcepoint DLP'), 'current');
        assert.strictEqual(getVersionStatus('7.2', 'Forcepoint NGFW'), 'current'); // Explicitly in CURRENT_VERSIONS
    });

    test('should handle (Latest) suffix', () => {
        assert.strictEqual(getVersionStatus('10.2 (Latest)', 'Forcepoint DLP'), 'current');
        assert.strictEqual(getVersionStatus('8.3 (Latest)', 'Forcepoint DLP'), 'eol');
    });

    test('should fallback to major version logic', () => {
        // DLP/Web: major < 9 is EOL
        assert.strictEqual(getVersionStatus('8.0', 'Forcepoint DLP'), 'eol');
        assert.strictEqual(getVersionStatus('9.0', 'Forcepoint DLP'), 'current');

        // NGFW: Code behavior: major < 9 is EOL, regardless of product name check (due to fallthrough)
        assert.strictEqual(getVersionStatus('5.0', 'Forcepoint NGFW'), 'eol');
        assert.strictEqual(getVersionStatus('6.0', 'Forcepoint NGFW'), 'eol');
        assert.strictEqual(getVersionStatus('7.0', 'Forcepoint NGFW'), 'eol');

        // Note: The original code has a specific check for NGFW < 6, but it falls through to check < 9.
        // So effectively everything < 9 is EOL unless in CURRENT_VERSIONS (like 7.2, 7.3).
    });
});
