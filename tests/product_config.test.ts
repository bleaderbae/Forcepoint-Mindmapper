import { describe, test } from 'node:test';
import assert from 'node:assert';
import { PRODUCT_CONFIG } from '../src/product_config.ts';

describe('Product Configuration Validation', () => {
    test('should be a valid object', () => {
        assert.ok(PRODUCT_CONFIG);
        assert.strictEqual(typeof PRODUCT_CONFIG, 'object');
    });

    test('all products should have required fields', () => {
        for (const [key, config] of Object.entries(PRODUCT_CONFIG)) {
            assert.ok(config.name, `Product ${key} missing name`);
            assert.strictEqual(typeof config.name, 'string', `Product ${key} name is not a string`);

            assert.ok(Array.isArray(config.variants), `Product ${key} missing variants array`);

            if (config.defaultVariant) {
                assert.strictEqual(typeof config.defaultVariant, 'string', `Product ${key} defaultVariant is not a string`);
                assert.ok(config.defaultVariant.length > 0, `Product ${key} defaultVariant is empty`);
            }
        }
    });

    test('variants should be valid', () => {
        for (const [key, config] of Object.entries(PRODUCT_CONFIG)) {
            if (config.variants.length > 0) {
                config.variants.forEach((variant, index) => {
                    assert.ok(variant.pattern instanceof RegExp, `Product ${key} variant at index ${index} has invalid pattern`);
                    assert.ok(variant.name, `Product ${key} variant at index ${index} missing name`);
                    assert.strictEqual(typeof variant.name, 'string', `Product ${key} variant at index ${index} name is not a string`);
                    assert.ok(variant.name.length > 0, `Product ${key} variant at index ${index} name is empty`);
                });
            }
        }
    });

    test('should contain key products', () => {
        assert.ok(PRODUCT_CONFIG['dlp'], 'DLP configuration missing');
        assert.ok(PRODUCT_CONFIG['dlp'].variants.some(v => v.name === 'Cloud'), 'DLP should have Cloud variant');

        assert.ok(PRODUCT_CONFIG['fpone'], 'Forcepoint ONE configuration missing');
        assert.ok(PRODUCT_CONFIG['fpone'].variants.some(v => v.name === 'GovCloud'), 'Forcepoint ONE should have GovCloud variant');
    });
});
