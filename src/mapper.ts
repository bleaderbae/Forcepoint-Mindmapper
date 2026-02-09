import * as fs from 'fs';
import * as path from 'path';

interface DocNode {
    url: string;
    title: string;
    breadcrumbs: string[];
    parentUrl?: string;
    nextUrl?: string;
}

function sanitize(text: string): string {
    // Remove characters that break Mermaid syntax: [ ] ( ) | " :
    return text.replace(/[\[\]\(\)\|":]/g, ' ').replace(/\s+/g, ' ').trim();
}

function run() {
    const dataPath = path.join(process.cwd(), 'full_site_data.json');
    if (!fs.existsSync(dataPath)) {
        console.error('Data file not found. Run the crawler first.');
        return;
    }

    const data: DocNode[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    console.log(`Mapping ${data.length} pages into a flowchart...`);

    let mermaid = `graph TD\n`;
    
    const urlToId = new Map<string, string>();
    data.forEach((page, i) => {
        urlToId.set(page.url, `page${i}`);
    });

    // Create Nodes and Flow
    data.forEach((page, i) => {
        const id = urlToId.get(page.url)!;
        const title = sanitize(page.title);
        
        // Add Node
        mermaid += `  ${id}["${title}"]\n`;

        // Add Flow (Next Step) - Solid line
        if (page.nextUrl && urlToId.has(page.nextUrl)) {
            const nextId = urlToId.get(page.nextUrl)!;
            mermaid += `  ${id} --> ${nextId}\n`;
        }

        // Add Hierarchy (Parent -> Child) - Dotted line
        if (page.parentUrl && urlToId.has(page.parentUrl)) {
            const parentId = urlToId.get(page.parentUrl)!;
            mermaid += `  ${parentId} -.-> ${id}\n`;
        }
    });

    // Write Mermaid file
    fs.writeFileSync(path.join(process.cwd(), 'flowchart.mmd'), mermaid);
    console.log('Flowchart saved to flowchart.mmd');

    // Update index.html
    const htmlPath = path.join(process.cwd(), 'index.html');
    if (fs.existsSync(htmlPath)) {
        let html = fs.readFileSync(htmlPath, 'utf-8');
        const startMarker = '<div class="mermaid">';
        const endMarker = '</div>';
        const startIdx = html.indexOf(startMarker) + startMarker.length;
        const endIdx = html.indexOf(endMarker, startIdx);
        
        if (startIdx !== -1 && endIdx !== -1) {
            const newHtml = html.substring(0, startIdx) + '\n' + mermaid + '\n' + html.substring(endIdx);
            fs.writeFileSync(htmlPath, newHtml);
            console.log('index.html updated with flowchart.');
        }
    }
}

run();