import * as fs from 'fs';
import * as path from 'path';

interface D3Node {
    name: string;
    url?: string;
    children?: D3Node[];
    _children?: D3Node[];
}

// Map product codes to friendly names
const PRODUCT_MAP: Record<string, string> = {
    'dlp': 'DLP',
    'endpoint': 'Endpoint',
    'fpone': 'Forcepoint ONE',
    'fponefirewall': 'Forcepoint ONE Firewall',
    'F1E': 'F1E',
    'fpdsc': 'Data Security Cloud',
    'emailsec': 'Email Security',
    'websec': 'Web Security',
    'appliance': 'Appliances',
    'datasecurity': 'Data Security',
    'dspm': 'DSPM',
    'frbi': 'RBI',
    'docs': 'Documentation',
    'insights': 'Insights',
    'dup': 'DUP',
    'ap-data': 'AP-Data'
};

function run() {
    const dataPath = path.join(process.cwd(), 'full_site_data.json');
    if (!fs.existsSync(dataPath)) {
        console.error('Data file not found!');
        return;
    }

    const data: any[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    console.log(`Processing ${data.length} nodes for D3...`);

    const root: D3Node = { name: "Forcepoint Documentation", children: [] };

    const findChild = (parent: D3Node, name: string): D3Node | undefined => {
        return parent.children?.find(c => c.name === name);
    };

    const addChild = (parent: D3Node, child: D3Node) => {
        if (!parent.children) parent.children = [];
        parent.children.push(child);
    };

    for (const page of data) {
        if (!page.title) continue;
        if (!page.url) continue;

        let current = root;

        // --- Step 1: Extract Hierarchy from URL ---
        let urlPath = '';
        try {
            const urlObj = new URL(page.url);
            urlPath = urlObj.pathname;
        } catch (e) {
            continue;
        }

        const segments = urlPath.split('/').filter(s => s && !s.endsWith('.html'));

        // Skip first segment if empty (leading slash)
        if (segments.length > 0) {
            // Segment 0: Product
            const prodCode = segments[0] || '';
            if (!prodCode) continue;

            const prodName = PRODUCT_MAP[prodCode] || prodCode.toUpperCase();

            let prodNode = findChild(current, prodName);
            if (!prodNode) {
                prodNode = { name: prodName, children: [] };
                addChild(current, prodNode);
            }
            current = prodNode;

            // Segment 1+: Version / Category
            // Heuristic: Skip locale if present
            let nextIndex = 1;
            if (segments.length > nextIndex) {
                const seg = segments[nextIndex];
                if (seg && /^[a-z]{2}-[a-z]{2}$/i.test(seg)) {
                    nextIndex++;
                }
            }

            // Identify Version or major Category
            if (segments.length > nextIndex) {
                let verSeg = segments[nextIndex];
                if (verSeg) {
                    // Map common internal names to nicer ones
                    if (verSeg === 'RN') verSeg = 'Release Notes';
                    else if (verSeg === 'howto') verSeg = 'How To';
                    else if (verSeg === 'dlphelp') verSeg = 'DLP Help';
                    else if (verSeg === 'fsmhelp') verSeg = 'FSM Help';
                    else if (verSeg === 'deployctr') verSeg = 'Deployment Center';
                    else if (verSeg === 'onlinehelp') verSeg = 'Online Help';

                    let verNode = findChild(current, verSeg);
                    if (!verNode) {
                        verNode = { name: verSeg, children: [] };
                        addChild(current, verNode);
                    }
                    current = verNode;
                }
            }
        }

        // --- Step 2: Merge Breadcrumbs ---
        // Clean up breadcrumbs to remove redundancy with what we just built
        const crumbs = (page.breadcrumbs || []).filter((b: string) => b !== 'Home');

        for (const crumb of crumbs) {
             // Skip if crumb duplicates current node name
             if (crumb === current.name) continue;

             let child = findChild(current, crumb);
             if (!child) {
                 child = { name: crumb, children: [] };
                 addChild(current, child);
             }
             current = child;
        }

        // --- Step 3: Add Leaf Node (The Page) ---
        if (current.name === page.title) {
            current.url = page.url;
        } else {
            let child = findChild(current, page.title);
            if (child) {
                child.url = page.url;
            } else {
                child = { name: page.title, url: page.url, children: [] };
                addChild(current, child);
            }
        }
    }

    const outputPath = path.join(process.cwd(), 'd3-data.json');
    fs.writeFileSync(outputPath, JSON.stringify(root, null, 2));
    console.log(`D3 data saved to ${outputPath}`);
}

run();
