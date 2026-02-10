import * as fs from 'fs';
import * as path from 'path';

interface DocNode {
    url: string;
    title: string;
    breadcrumbs: string[];
    nextUrl?: string;
    relatedLinks?: { text: string; href: string }[];
}

function sanitize(text: string): string {
    return text.replace(/[\(\)\[\]\{\}"'#;:]/g, '')
               .replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/\s+/g, ' ')
               .trim();
}

function run() {
    const dataPath = path.join(process.cwd(), 'full_site_data.json');
    if (!fs.existsSync(dataPath)) {
        console.error('Data file not found. Run the crawler first.');
        return;
    }

    const data: DocNode[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    console.log(`Processing ${data.length} nodes into a flowchart...`);

    let mermaid = `graph TD\n`;

    // Grouping nodes into logical "Phases"
    const clusters: Record<string, string[]> = {
        'Setup': [],
        'Configuration': [],
        'Administration': [],
        'Troubleshooting': [],
        'Other': []
    };

    const urlToId = new Map<string, string>();
    data.forEach((node, i) => {
        const id = `node${i}`;
        urlToId.set(node.url, id);

        const title = sanitize(node.title);
        const lowerTitle = title.toLowerCase();

        if (lowerTitle.includes('setup') || lowerTitle.includes('install')) clusters['Setup']!.push(`${id}["${title}"]`);
        else if (lowerTitle.includes('config')) clusters['Configuration']!.push(`${id}["${title}"]`);
        else if (lowerTitle.includes('admin')) clusters['Administration']!.push(`${id}["${title}"]`);
        else if (lowerTitle.includes('trouble')) clusters['Troubleshooting']!.push(`${id}["${title}"]`);
        else clusters['Other']!.push(`${id}["${title}"]`);
    });

    // Add Clusters to Mermaid
    for (const [name, nodes] of Object.entries(clusters)) {
        if (nodes.length > 0) {
            mermaid += `  subgraph ${name}\n`;
            nodes.forEach(nodeLine => {
                mermaid += `    ${nodeLine}\n`;
            });
            mermaid += `  end\n`;
        }
    }

    // Add Flow Connections (Next links)
    data.forEach((node, i) => {
        const currentId = `node${i}`;
        if (node.nextUrl && urlToId.has(node.nextUrl)) {
            mermaid += `  ${currentId} --> ${urlToId.get(node.nextUrl)}\n`;
        }
        
        // Add Related Connections (dashed lines)
        if (node.relatedLinks) {
            node.relatedLinks.forEach(link => {
                if (urlToId.has(link.href)) {
                    mermaid += `  ${currentId} -.-> ${urlToId.get(link.href)}\n`;
                }
            });
        }
    });

    fs.writeFileSync(path.join(process.cwd(), 'flowchart.mmd'), mermaid);
    console.log('Flowchart generated: flowchart.mmd');
}

run();