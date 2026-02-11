import { test, describe } from 'node:test';
import assert from 'node:assert';
import { buildTree, sortChildren } from '../src/generate_mindmap.ts';
import type { DocNode, TreeNode } from '../src/types.ts';

describe('buildTree', () => {
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

        assert.ok(root.childrenMap?.has('Section A'));
        const sectionA = root.childrenMap?.get('Section A')!;
        assert.strictEqual(sectionA.title, 'Section A');
        assert.ok(sectionA.childrenMap?.has('Page 1'));
    });

    test('should build nested breadcrumbs', () => {
        const data: DocNode[] = [{
            url: 'http://example.com/page2',
            title: 'Page 2',
            breadcrumbs: ['Section A', 'Subsection B']
        }];
        const root = buildTree(data);

        const sectionA = root.childrenMap?.get('Section A')!;
        assert.ok(sectionA.childrenMap?.has('Subsection B'));

        const subB = sectionA.childrenMap?.get('Subsection B')!;
        assert.strictEqual(subB.title, 'Subsection B');
        assert.ok(subB.childrenMap?.has('Page 2'));
    });

    test('should sanitize special characters in breadcrumbs and titles', () => {
        const data: DocNode[] = [{
            url: 'http://example.com/page3',
            title: 'Page (3)',
            breadcrumbs: ['Section: C']
        }];
        const root = buildTree(data);

        // Expect sanitization: "Section: C" -> "Section C", "Page (3)" -> "Page 3"
        const expectedSection = 'Section C';
        const expectedPage = 'Page 3';

        assert.ok(root.childrenMap?.has(expectedSection), `Should have sanitized section "${expectedSection}"`);
        const sectionC = root.childrenMap?.get(expectedSection)!;
        assert.ok(sectionC.childrenMap?.has(expectedPage), `Should have sanitized page "${expectedPage}"`);
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
        assert.ok(sectionA.childrenMap?.has('Page 1'));
        assert.ok(sectionA.childrenMap?.has('Page 2'));
    });

    test('should handle undefined, empty, or skipped breadcrumbs', () => {
         const data: DocNode[] = [
            {
                url: 'http://example.com/p1',
                title: 'Direct Child',
                breadcrumbs: [] // Empty
            },
            {
                url: 'http://example.com/p2',
                title: 'Skipped Breadcrumb',
                breadcrumbs: ['Home', 'Untitled', 'Real Section'] // 'Home' and 'Untitled' should be skipped
            }
        ];
        const root = buildTree(data);

        // Direct Child should be under root
        assert.ok(root.childrenMap?.has('Direct Child'));

        // Skipped Breadcrumb should be under Real Section, which is under root
        assert.ok(root.childrenMap?.has('Real Section'));
        const realSection = root.childrenMap?.get('Real Section')!;
        assert.ok(realSection.childrenMap?.has('Skipped Breadcrumb'));

        // Ensure Home/Untitled are NOT children of root
        assert.strictEqual(root.childrenMap?.has('Home'), false);
        assert.strictEqual(root.childrenMap?.has('Untitled'), false);
    });

    test('should skip documents with Untitled title', () => {
        const data: DocNode[] = [{
            url: 'http://example.com/untitled',
            title: 'Untitled',
            breadcrumbs: ['Section A']
        }];
        const root = buildTree(data);

        // Section A might be created as a breadcrumb path, but the document itself (Untitled) should not be added as a child
        assert.ok(root.childrenMap?.has('Section A'));
        const sectionA = root.childrenMap?.get('Section A')!;
        assert.strictEqual(sectionA.children.length, 0);
    });

    test('should handle self-referencing breadcrumbs', () => {
        // Case: Breadcrumb ends with the document title
        const data: DocNode[] = [{
            url: 'http://example.com/section-a',
            title: 'Section A',
            breadcrumbs: ['Section A']
        }];
        const root = buildTree(data);

        // Should create Section A under root.
        // Then identifying that doc title matches current node (Section A),
        // it should update Section A with url, not create a child Section A.

        assert.ok(root.childrenMap?.has('Section A'));
        const sectionA = root.childrenMap?.get('Section A')!;

        assert.strictEqual(sectionA.url, 'http://example.com/section-a');
        assert.strictEqual(sectionA.children.length, 0); // No child named "Section A"
    });

    test('should deduplicate identical titles under same parent (last wins)', () => {
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
        assert.strictEqual(sectionA.children.length, 1);

        const page1 = sectionA.childrenMap?.get('Page 1')!;
        // The last one (p2) should have overwritten the first one's URL
        assert.strictEqual(page1.url, 'http://example.com/p2');
    });
});

describe('sortChildren', () => {
    test('should sort siblings based on nextUrl chain', () => {
        const urlToDoc = new Map<string, DocNode>();
        const n1: TreeNode = { title: 'Node 1', url: 'u1', nextUrl: 'u2', children: [] };
        const n2: TreeNode = { title: 'Node 2', url: 'u2', nextUrl: 'u3', children: [] };
        const n3: TreeNode = { title: 'Node 3', url: 'u3', children: [] };

        urlToDoc.set('u1', { title: 'Node 1', url: 'u1', breadcrumbs: [] });
        urlToDoc.set('u2', { title: 'Node 2', url: 'u2', breadcrumbs: [] });
        urlToDoc.set('u3', { title: 'Node 3', url: 'u3', breadcrumbs: [] });

        const parent: TreeNode = {
            title: 'Parent',
            children: [n3, n1, n2],
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
        const a1: TreeNode = { title: 'A1', url: 'a1', nextUrl: 'a2', children: [] };
        const a2: TreeNode = { title: 'A2', url: 'a2', children: [] };
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

   test('should sort siblings based on title when URL matching fails', () => {
        const urlToDoc = new Map<string, DocNode>();
        // n1 -> n2 via nextUrl, but n2's URL in tree is different from n1's nextUrl
        // However, n2's title matches the doc retrieved by n1's nextUrl

        const n1: TreeNode = { title: 'Node 1', url: 'u1', nextUrl: 'u2-alias', children: [] };
        // n2 has url 'u2-real', but n1 points to 'u2-alias'
        const n2: TreeNode = { title: 'Node 2', url: 'u2-real', children: [] };

        // urlToDoc must have entry for 'u2-alias' which has title 'Node 2'
        urlToDoc.set('u2-alias', { title: 'Node 2', url: 'u2-alias', breadcrumbs: [] });

        const parent: TreeNode = {
            title: 'Parent',
            children: [n2, n1],
            childrenMap: new Map()
        };

        sortChildren(parent, urlToDoc);

        assert.strictEqual(parent.children[0].title, 'Node 1');
        assert.strictEqual(parent.children[1].title, 'Node 2');
    });
});
