import { test, describe } from 'node:test';
import assert from 'node:assert';
import { getVariant } from '../src/utils/product_utils.ts';

describe('getVariant', () => {
    test('should return null for unknown product', () => {
        assert.strictEqual(getVariant('unknown', 'title', 'url'), null);
    });

    test('should identify DLP variants', () => {
        assert.strictEqual(getVariant('dlp', 'DLP Cloud', 'url'), 'Cloud');
        assert.strictEqual(getVariant('dlp', 'On-prem DLP', 'url'), 'On-prem');
    });

    test('should return default variant if no pattern matches', () => {
        // DLP default is On-prem
        assert.strictEqual(getVariant('dlp', 'Unknown Variant', 'url'), 'On-prem');
    });

    test('should return default variant for product with no variants', () => {
        // Endpoint has no variants, default is General
        assert.strictEqual(getVariant('endpoint', 'Some Title', 'url'), 'General');
    });

    test('should identify F1E variants', () => {
        assert.strictEqual(getVariant('F1E', 'Agent for macOS', 'url'), 'macOS');
        assert.strictEqual(getVariant('F1E', 'Agent for Windows', 'url'), 'Windows');
    });

    test('should handle Appliance special logic', () => {
        assert.strictEqual(getVariant('appliance', 'title', 'https://docs.forcepoint.com/appliance/2.0/index.html'), 'Security Appliance Manager (FSAM)');
        assert.strictEqual(getVariant('appliance', 'title', 'https://docs.forcepoint.com/appliance/3.0/index.html'), 'Forcepoint Appliances (V-Series)');
    });

    test('should handle Appliance special logic with wildcard version', () => {
        assert.strictEqual(getVariant('appliance', 'title', 'https://docs.forcepoint.com/appliance/2.x/index.html'), 'Security Appliance Manager (FSAM)');
    });
});
