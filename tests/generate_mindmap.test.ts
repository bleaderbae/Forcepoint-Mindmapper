import { test, describe } from 'node:test';
import assert from 'node:assert';
import { buildTree, sortChildren } from '../src/generate_mindmap.ts';
import type { DocNode, TreeNode } from '../src/generate_mindmap.ts';

describe('buildTree (generate_mindmap)', () => {
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

        assert.strictEqual(root.childrenMap?.has('Section A'), true);
        const sectionA = root.childrenMap?.get('Section A')!;
        assert.strictEqual(sectionA.title, 'Section A');
        assert.strictEqual(sectionA.childrenMap?.has('Page 1'), true);

        // Also check array
        assert.ok(root.children.find(c => c.title === 'Section A'));
    });

    test('should build nested breadcrumbs', () => {
        const data: DocNode[] = [{
            url: 'http://example.com/page2',
            title: 'Page 2',
            breadcrumbs: ['Section A', 'Subsection B']
        }];
        const root = buildTree(data);

        const sectionA = root.childrenMap?.get('Section A')!;
        assert.strictEqual(sectionA.childrenMap?.has('Subsection B'), true);

        const subB = sectionA.childrenMap?.get('Subsection B')!;
        assert.strictEqual(subB.title, 'Subsection B');
        assert.strictEqual(subB.childrenMap?.has('Page 2'), true);
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
        assert.strictEqual(sectionA.childrenMap?.has('Page 1'), true);
        assert.strictEqual(sectionA.childrenMap?.has('Page 2'), true);
    });
});

describe('sortChildren (generate_mindmap)', () => {
    test('should sort siblings based on nextUrl chain', () => {
        const urlToDoc = new Map<string, DocNode>();
        const n1: TreeNode = { title: 'Node 1', url: 'u1', nextUrl: 'u2', children: [] };
        const n2: TreeNode = { title: 'Node 2', url: 'u2', nextUrl: 'u3', children: [] };
        const n3: TreeNode = { title: 'Node 3', url: 'u3', children: [] }; // Last one

        // Setup DocNodes for lookup
        urlToDoc.set('u1', { title: 'Node 1', url: 'u1', breadcrumbs: [] });
        urlToDoc.set('u2', { title: 'Node 2', url: 'u2', breadcrumbs: [] });
        urlToDoc.set('u3', { title: 'Node 3', url: 'u3', breadcrumbs: [] });

        const parent: TreeNode = {
            title: 'Parent',
            children: [n3, n1, n2], // Shuffled
            childrenMap: new Map()
        };

        sortChildren(parent, urlToDoc);

        assert.strictEqual(parent.children.length, 3);
        assert.strictEqual(parent.children[0].title, 'Node 1');
        assert.strictEqual(parent.children[1].title, 'Node 2');
        assert.strictEqual(parent.children[2].title, 'Node 3');
    });

    test('should handle disjoint chains', () => {
        const urlToDoc = new Map<string, DocNode>();
        // Chain A: 1->2
        const a1: TreeNode = { title: 'A1', url: 'a1', nextUrl: 'a2', children: [] };
        const a2: TreeNode = { title: 'A2', url: 'a2', children: [] };

        // Chain B: 3->4
        const b1: TreeNode = { title: 'B1', url: 'b1', nextUrl: 'b2', children: [] };
        const b2: TreeNode = { title: 'B2', url: 'b2', children: [] };

        urlToDoc.set('a2', { title: 'A2', url: 'a2', breadcrumbs: [] });
        urlToDoc.set('b2', { title: 'B2', url: 'b2', breadcrumbs: [] });

        const parent: TreeNode = {
            title: 'Parent',
            children: [a2, b2, a1, b1],
            childrenMap: new Map()
        };

        sortChildren(parent, urlToDoc);

        assert.strictEqual(parent.children[0].title, 'A1');
        assert.strictEqual(parent.children[1].title, 'A2');
        assert.strictEqual(parent.children[2].title, 'B1');
        assert.strictEqual(parent.children[3].title, 'B2');
    });

    test('should handle duplicate titles', () => {
        const urlToDoc = new Map<string, DocNode>();
        const n1: TreeNode = { title: 'Start', url: 's', nextUrl: 'd', children: [] };
        const d1: TreeNode = { title: 'Dup', url: 'd1', children: [] };
        const d2: TreeNode = { title: 'Dup', url: 'd2', children: [] };

        urlToDoc.set('d', { title: 'Dup', url: 'd1', breadcrumbs: [] });

        const parent: TreeNode = {
            title: 'Parent',
            children: [n1, d1, d2],
            childrenMap: new Map()
        };

        sortChildren(parent, urlToDoc);

        assert.strictEqual(parent.children[0].title, 'Start');
        assert.strictEqual(parent.children[1], d1);
        assert.strictEqual(parent.children[2], d2);
   });
});
