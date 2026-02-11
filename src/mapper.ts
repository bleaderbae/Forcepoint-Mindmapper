import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { sanitize } from './utils/string_utils.ts';
import type { DocNode } from './types.ts';

function run() {
    const dataPath = path.join(process.cwd(), 'full_site_data.json');
    if (!fs.existsSync(dataPath)) {
        console.error('Data file not found. Run the crawler first.');
        return;
    }

    const data: any[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    console.log(`Mapping ${data.length} pages into a flowchart...`);

    const mermaidLines: string[] = ['graph TD'];
    
    // 1. Assign unique IDs to each unique URL
    const urlToId = new Map<string, string>();
    const uniqueNodes = new Map<string, any>();

    let counter = 0;
    for (const page of data) {
        if (!page.url || typeof page.url !== 'string') continue;

        // Normalize URL
        const url = page.url.split('#')[0];
        
        if (!urlToId.has(url)) {
            const id = `page${counter++}`;
            urlToId.set(url, id);
            uniqueNodes.set(url, page);
        }
    }

    // 2. Output Nodes
    for (const [url, page] of uniqueNodes) {
        const id = urlToId.get(url)!;
        const title = sanitize(page.title);
        mermaidLines.push(`  ${id}["${title}"]`);
    }

    // 3. Output Edges
    for (const [url, page] of uniqueNodes) {
        const id = urlToId.get(url)!;

        // Next Step (Solid Line)
        if (page.nextUrl && typeof page.nextUrl === 'string') {
            const nextUrl = page.nextUrl.split('#')[0];
            if (urlToId.has(nextUrl)) {
                const nextId = urlToId.get(nextUrl)!;
                if (id !== nextId) {
                    mermaidLines.push(`  ${id} --> ${nextId}`);
                }
            }
        }

        // Parent (Dotted Line)
        if (page.parentUrl && typeof page.parentUrl === 'string') {
            const parentUrl = page.parentUrl.split('#')[0];
            if (urlToId.has(parentUrl)) {
                const parentId = urlToId.get(parentUrl)!;
                if (id !== parentId) {
                     mermaidLines.push(`  ${parentId} -.-> ${id}`);
                }
            }
        }
    }

    // Combine lines
    const mermaid = mermaidLines.join('\n') + '\n';

    // Write Mermaid file
    fs.writeFileSync(path.join(process.cwd(), 'flowchart.mmd'), mermaid);
    console.log('Flowchart saved to flowchart.mmd');

    // Update mermaid.html
    const htmlPath = path.join(process.cwd(), 'mermaid.html');
    if (fs.existsSync(htmlPath)) {
        let html = fs.readFileSync(htmlPath, 'utf-8');
        const startMarker = '<div class="mermaid">';
        const endMarker = '</div>';
        const startIdx = html.indexOf(startMarker);
        
        if (startIdx !== -1) {
            const endIdx = html.indexOf(endMarker, startIdx);
            if (endIdx !== -1) {
                const before = html.substring(0, startIdx + startMarker.length);
                const after = html.substring(endIdx);
                const newHtml = before + '\n' + mermaid + '\n' + after;
                fs.writeFileSync(htmlPath, newHtml);
                console.log('mermaid.html updated with flowchart.');
            } else {
                 console.error('Could not find end marker </div> in mermaid.html');
            }
        } else {
            console.error('Could not find start marker <div class="mermaid"> in mermaid.html');
        }
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    run();
}
