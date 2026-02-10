import { describe, test } from 'node:test';
import assert from 'node:assert';
import { normalizeUrl } from '../src/utils/url_utils.ts';

describe('normalizeUrl', () => {
    test('should normalize a standard URL', () => {
        const input = 'https://example.com/page';
        const expected = 'https://example.com/page';
        assert.strictEqual(normalizeUrl(input), expected);
    });

    test('should remove query parameters', () => {
        const input = 'https://example.com/page?query=param';
        const expected = 'https://example.com/page';
        assert.strictEqual(normalizeUrl(input), expected);
    });

    test('should remove hash fragment', () => {
        const input = 'https://example.com/page#section';
        const expected = 'https://example.com/page';
        assert.strictEqual(normalizeUrl(input), expected);
    });

    test('should remove both query parameters and hash fragment', () => {
        const input = 'https://example.com/page?query=param#section';
        const expected = 'https://example.com/page';
        assert.strictEqual(normalizeUrl(input), expected);
    });

    test('should return original string for invalid URL', () => {
        const input = 'invalid-url';
        assert.strictEqual(normalizeUrl(input), input);
    });

    test('should handle trailing slash', () => {
         const input = 'https://example.com/page/';
         const expected = 'https://example.com/page/';
         assert.strictEqual(normalizeUrl(input), expected);
    });

    test('should normalize scheme and host to lowercase but preserve path case', () => {
        const input = 'HTTP://EXAMPLE.COM/Page/SubPage';
        const expected = 'http://example.com/Page/SubPage';
        assert.strictEqual(normalizeUrl(input), expected);
    });

    test('should preserve port number', () => {
        const input = 'https://example.com:8080/page';
        const expected = 'https://example.com:8080/page';
        assert.strictEqual(normalizeUrl(input), expected);
    });

    test('should preserve authentication credentials', () => {
        const input = 'https://user:pass@example.com/page';
        const expected = 'https://user:pass@example.com/page';
        assert.strictEqual(normalizeUrl(input), expected);
    });

    test('should trim whitespace from URL', () => {
        const input = '   https://example.com/page   ';
        const expected = 'https://example.com/page';
        assert.strictEqual(normalizeUrl(input), expected);
    });

    test('should handle mailto links (stripping query/hash)', () => {
        const input = 'mailto:user@example.com?subject=Hello';
        // URL API for mailto might treat ?subject=Hello as search params?
        // Let's verify standard URL behavior first.
        // new URL('mailto:u@e.c?s=h').search is '?s=h'.
        // So normalizeUrl will strip it.
        const expected = 'mailto:user@example.com';
        assert.strictEqual(normalizeUrl(input), expected);
    });

    test('should handle file URLs', () => {
        const input = 'file:///path/to/file.txt';
        const expected = 'file:///path/to/file.txt';
        assert.strictEqual(normalizeUrl(input), expected);
    });

    test('should return original string for relative paths', () => {
        const inputs = ['/page', 'page', '../page', '//example.com/page'];
        inputs.forEach(input => {
             assert.strictEqual(normalizeUrl(input), input);
        });
    });

    test('should handle empty string', () => {
        assert.strictEqual(normalizeUrl(''), '');
    });
});
