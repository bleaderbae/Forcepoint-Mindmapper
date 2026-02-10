import { test, describe } from 'node:test';
import assert from 'node:assert';
import { buildTree } from '../src/mindmap.ts';
import type { DocNode } from '../src/mindmap.ts';

describe('buildTree', () => {
    test('should return root for empty data', () => {
        const data: DocNode[] = [];
        const result = buildTree(data);
        assert.strictEqual(result.name, 'Forcepoint Help');
        assert.strictEqual(result.children.size, 0);
    });

    test('should build tree with single node', () => {
        const data: DocNode[] = [{
            url: 'http://example.com/page1',
            title: 'Page 1',
            breadcrumbs: ['Section A']
        }];
        const root = buildTree(data);

        assert.strictEqual(root.children.has('Section A'), true);
        const sectionA = root.children.get('Section A')!;
        assert.strictEqual(sectionA.name, 'Section A');
        assert.strictEqual(sectionA.children.has('Page 1'), true);
    });

    test('should build nested breadcrumbs', () => {
        const data: DocNode[] = [{
            url: 'http://example.com/page2',
            title: 'Page 2',
            breadcrumbs: ['Section A', 'Subsection B']
        }];
        const root = buildTree(data);

        const sectionA = root.children.get('Section A')!;
        assert.strictEqual(sectionA.children.has('Subsection B'), true);

        const subB = sectionA.children.get('Subsection B')!;
        assert.strictEqual(subB.name, 'Subsection B');
        assert.strictEqual(subB.children.has('Page 2'), true);
    });

    test('should sanitize special characters', () => {
        const data: DocNode[] = [{
            url: 'http://example.com/page3',
            title: 'Page (3)',
            breadcrumbs: ['Section: C']
        }];
        const root = buildTree(data);

        // "Section: C" -> "Section  C" (colon replaced by space)
        // "Page (3)" -> "Page  3 " -> trimmed "Page  3"

        const sectionName = 'Section  C';
        assert.strictEqual(root.children.has(sectionName), true, `Expected child "${sectionName}" but keys are ${Array.from(root.children.keys())}`);

        const sectionC = root.children.get(sectionName)!;
        const pageName = 'Page  3';
        assert.strictEqual(sectionC.children.has(pageName), true, `Expected child "${pageName}" but keys are ${Array.from(sectionC.children.keys())}`);
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

        assert.strictEqual(root.children.size, 1);
        const sectionA = root.children.get('Section A')!;
        assert.strictEqual(sectionA.children.size, 2);
        assert.strictEqual(sectionA.children.has('Page 1'), true);
        assert.strictEqual(sectionA.children.has('Page 2'), true);
    });

    test('should use Uncategorized if breadcrumbs empty', () => {
         const data: DocNode[] = [
            {
                url: 'http://example.com/p1',
                title: 'Page 1',
                breadcrumbs: []
            }
        ];
        const root = buildTree(data);
        assert.strictEqual(root.children.has('Uncategorized'), true);
        const uncat = root.children.get('Uncategorized')!;
        assert.strictEqual(uncat.children.has('Page 1'), true);
    });
});
