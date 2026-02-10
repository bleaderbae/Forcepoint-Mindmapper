import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { DocNode, TreeNode } from './types.ts';
import { sanitize } from './utils/string_utils.ts';

const DATA_FILE = path.join(process.cwd(), 'full_site_data.json');
const OUTPUT_FILE = path.join(process.cwd(), 'mindmap.mmd');

export function buildTree(data: DocNode[]): TreeNode {
    const root: TreeNode = { title: 'Forcepoint Help', children: [], childrenMap: new Map() };

    // Map URL to DocNode for quick lookup
    const urlToDoc = new Map<string, DocNode>();
    data.forEach(d => urlToDoc.set(d.url, d));

    // Helper to find or create a child node
    const findOrCreateChild = (parent: TreeNode, title: string): TreeNode => {
        if (!parent.childrenMap) {
            parent.childrenMap = new Map();
            parent.children.forEach(c => parent.childrenMap!.set(c.title, c));
        }

        let child = parent.childrenMap.get(title);
        if (!child) {
            child = { title, children: [], childrenMap: new Map() };
            parent.children.push(child);
            parent.childrenMap.set(title, child);
        }
        return child;
    };

    data.forEach(doc => {
        let current = root;

        // Traverse breadcrumbs
        for (const crumb of doc.breadcrumbs) {
            if (crumb === 'Home') continue; // Skip Home as it's root
            current = findOrCreateChild(current, crumb);
        }

        // Add the document itself as a child of the last breadcrumb
        // But check if it already exists (sometimes breadcrumbs include the page itself or it was created as a parent for someone else)

        // If current node title matches doc title (e.g. self-referencing breadcrumb), update current node directly
        if (current.title === doc.title) {
            current.url = doc.url;
            current.nextUrl = doc.nextUrl;
        } else {
            if (!current.childrenMap) {
                current.childrenMap = new Map();
                current.children.forEach(c => current.childrenMap!.set(c.title, c));
            }

            let docNode = current.childrenMap.get(doc.title);
            if (!docNode) {
                docNode = { title: doc.title, children: [], childrenMap: new Map() };
                current.children.push(docNode);
                current.childrenMap.set(doc.title, docNode);
            }

            // Update node with doc info
            docNode.url = doc.url;
            docNode.nextUrl = doc.nextUrl;
        }
    });

    return root;
}

export function sortChildren(node: TreeNode, urlToDoc: Map<string, DocNode>) {
    if (!node.children || node.children.length === 0) return;

    // Create a map of URL -> node for accurate lookup
    const urlToNode = new Map<string, TreeNode>();
    node.children.forEach(c => {
        if (c.url) {
            urlToNode.set(c.url, c);
        }
    });

    // Build a graph of next pointers among siblings
    const nextMap = new Map<TreeNode, TreeNode>(); // node -> nextNode
    const prevMap = new Map<TreeNode, TreeNode>(); // nextNode -> node

    node.children.forEach(child => {
        if (child.url && child.nextUrl) {
            const sibling = urlToNode.get(child.nextUrl);
            if (sibling && sibling !== child) {
                nextMap.set(child, sibling);
                prevMap.set(sibling, child);
            }
        }
    });

    // Find nodes that are not anyone's 'next' (potential starts of chains)
    const starts = node.children.filter(c => !prevMap.has(c));

    // Sort logic:
    // Follow the chain from each start node.
    // If multiple starts, just concat chains.
    // If cycles, visited set prevents infinite loops.

    const sorted: TreeNode[] = [];
    const visited = new Set<TreeNode>();

    const traverse = (n: TreeNode) => {
        if (visited.has(n)) return;
        visited.add(n);
        sorted.push(n);

        const nextNode = nextMap.get(n);
        if (nextNode) traverse(nextNode);
    };

    starts.forEach(start => traverse(start));

    // Add any unvisited nodes (disconnected components or cycles)
    node.children.forEach(c => {
        if (!visited.has(c)) {
            traverse(c);
        }
    });

    node.children = sorted;

    // Recurse
    node.children.forEach(c => sortChildren(c, urlToDoc));
}

export function generateMermaid(node: TreeNode, depth: number = 0): string {
    const indent = '  '.repeat(depth);
    let output = `${indent}${sanitize(node.title)}\n`;

    // Limit depth to avoid too large mindmap
    if (depth > 5) return output;

    for (const child of node.children) {
        output += generateMermaid(child, depth + 1);
    }
    return output;
}

function main() {
    if (!fs.existsSync(DATA_FILE)) {
        console.error('Data file not found!');
        process.exit(1);
    }

    const data: DocNode[] = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    const urlToDoc = new Map<string, DocNode>();
    data.forEach(d => urlToDoc.set(d.url, d));

    const root = buildTree(data);
    sortChildren(root, urlToDoc);

    const mermaidContent = 'mindmap\n' + generateMermaid(root);
    fs.writeFileSync(OUTPUT_FILE, mermaidContent);
    console.log(`Generated mindmap to ${OUTPUT_FILE}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
}
