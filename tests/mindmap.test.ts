import { test, describe } from 'node:test';
import assert from 'node:assert';
import { buildTree } from '../src/generate_mindmap.ts';
import type { DocNode } from './../src/types.ts';

describe('buildTree (Legacy Logic)', () => {
    test('should return root for empty data', () => {
        const data: DocNode[] = [];
        const result = buildTree(data);
        assert.strictEqual(result.title, 'Forcepoint Help');
        assert.strictEqual(result.children.length, 0);
    });

    test('should build tree with single node', () => {
        const data: DocNode[] = [{
            url: 'http://example.com/page1',
            title: 'Page 1',
            breadcrumbs: ['Section A']
        }];
        const root = buildTree(data);

        assert.ok(root.childrenMap?.has('Section A'), 'Should have Section A');
        const sectionA = root.childrenMap?.get('Section A')!;
        assert.strictEqual(sectionA.title, 'Section A');
        assert.ok(sectionA.childrenMap?.has('Page 1'), 'Should have Page 1');
    });

    test('should build nested breadcrumbs', () => {
        const data: DocNode[] = [{
            url: 'http://example.com/page2',
            title: 'Page 2',
            breadcrumbs: ['Section A', 'Subsection B']
        }];
        const root = buildTree(data);

        const sectionA = root.childrenMap?.get('Section A')!;
        assert.ok(sectionA.childrenMap?.has('Subsection B'), 'Should have Subsection B');

        const subB = sectionA.childrenMap?.get('Subsection B')!;
        assert.strictEqual(subB.title, 'Subsection B');
        assert.ok(subB.childrenMap?.has('Page 2'), 'Should have Page 2');
    });

    test('should sanitize special characters', () => {
        const data: DocNode[] = [{
            url: 'http://example.com/page3',
            title: 'Page (3)',
            breadcrumbs: ['Section: C']
        }];
        const root = buildTree(data);

        // "Section: C" -> "Section  C"
        // "Page (3)" -> "Page  3"
        
        const sectionName = 'Section C';
        assert.ok(root.childrenMap?.has(sectionName), `Expected sanitized key "${sectionName}" but keys are ${Array.from(root.childrenMap?.keys() || [])}`);

        const sectionC = root.childrenMap?.get(sectionName)!;
        const pageName = 'Page 3';
        assert.ok(sectionC.childrenMap?.has(pageName), `Expected sanitized key "${pageName}" but keys are ${Array.from(sectionC.childrenMap?.keys() || [])}`);
    });

    test('should deduplicate nodes', () => {
        const data: DocNode[] = [
            {
                url: 'http://example.com/p1',
                title: 'Page 1',
                breadcrumbs: ['Section A']
            },
            {
                url: 'http://example.com/p2',
                title: 'Page 2',
                breadcrumbs: ['Section A']
            }
        ];
        const root = buildTree(data);

        assert.strictEqual(root.children.length, 1);
        const sectionA = root.childrenMap?.get('Section A')!;
        assert.strictEqual(sectionA.children.length, 2);
    });

    test('should handle undefined or empty breadcrumbs', () => {
         const data: DocNode[] = [
            {
                url: 'http://example.com/p1',
                title: 'Page 1',
                breadcrumbs: []
            }
        ];
        const root = buildTree(data);
        // Current implementation: if breadcrumbs empty, Page 1 is direct child of root
        assert.ok(root.childrenMap?.has('Page 1'), 'Page 1 should be direct child of root if no breadcrumbs');
    });

    test('should deduplicate identical titles under same parent', () => {
        const data: DocNode[] = [
            {
                url: 'http://example.com/p1',
                title: 'Page 1',
                breadcrumbs: ['Section A']
            },
            {
                url: 'http://example.com/p2', // Different URL
                title: 'Page 1',           // Same Title
                breadcrumbs: ['Section A']
            }
        ];
        const root = buildTree(data);

        const sectionA = root.childrenMap?.get('Section A')!;
        assert.strictEqual(sectionA.children.length, 1, 'Should have only 1 child due to title deduplication');
    });
});
