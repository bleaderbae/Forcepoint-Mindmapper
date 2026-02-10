import * as fs from 'fs';
import * as path from 'path';
import { normalizeUrl } from './utils/url_utils.ts';
import type { DocNode } from './types.ts';

const DATA_FILE = path.join(process.cwd(), 'full_site_data.json');

function run() {
    if (!fs.existsSync(DATA_FILE)) {
        console.error('Data file not found!');
        process.exit(1);
    }

    const rawData: DocNode[] = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    console.log(`Original data size: ${rawData.length} nodes.`);

    const nonHtmlRegex = /\.(pdf|png|jpg|jpeg|gif|css|js|json|xml|txt|zip|tar|gz|bmp|ico)$/i;

    const uniqueMap = new Map<string, DocNode>();

    for (const node of rawData) {
        if (!node.url) continue;
        if (nonHtmlRegex.test(node.url)) continue;

        const url = normalizeUrl(node.url);
        const cleanedNode: DocNode = { ...node, url };

        if (uniqueMap.has(url)) {
            const existing = uniqueMap.get(url)!;
            const existingTitle = existing.title ? existing.title.trim() : '';
            const newTitle = cleanedNode.title ? cleanedNode.title.trim() : '';

            // Prefer nodes with titles
            if (existingTitle === '' && newTitle !== '') {
                uniqueMap.set(url, cleanedNode);
            }
        } else {
            uniqueMap.set(url, cleanedNode);
        }
    }

    let filteredData = Array.from(uniqueMap.values());
    console.log(`After deduplication: ${filteredData.length} nodes.`);

    for (const node of filteredData) {
        let title = node.title ? node.title.trim() : '';

        if (!title) {
            if (node.breadcrumbs && node.breadcrumbs.length > 0) {
                const lastCrumb = node.breadcrumbs[node.breadcrumbs.length - 1];
                if (lastCrumb) {
                    title = lastCrumb;
                }
            }

            if (!title && node.url) {
                const parts = node.url.split('/');
                let filename = parts[parts.length - 1];
                if (!filename || filename === 'index.html') {
                    filename = parts[parts.length - 2] || 'Home';
                }
                if (filename) {
                     let newTitle = filename.replace(/[-_]/g, ' ').replace('.html', '');
                     if (newTitle.length > 0) {
                         newTitle = newTitle.charAt(0).toUpperCase() + newTitle.slice(1);
                     }
                     title = newTitle;
                }
            }
        }

        node.title = title || 'Untitled Page';
    }

    filteredData = filteredData.filter(node => node.title && node.title.trim().length > 0);
    console.log(`Final count: ${filteredData.length} nodes.`);

    fs.writeFileSync(DATA_FILE, JSON.stringify(filteredData, null, 2));
    console.log(`Cleaned data saved to ${DATA_FILE}`);
}

run();