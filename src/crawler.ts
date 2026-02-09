import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

interface DocNode {
    title: string;
    url: string;
    children: DocNode[];
}

const BASE_URL = 'https://help.forcepoint.com';
const START_URL = 'https://help.forcepoint.com/docs/Tech_Pubs/index.html';

async function crawl(url: string, depth: number = 0, maxDepth: number = 1): Promise<DocNode | null> {
    if (depth > maxDepth) return null;

    console.log(`Crawling: ${url} (Depth: ${depth})`);
    try {
        const response = await axios.get(url, { 
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const $ = cheerio.load(response.data);
        
        const title = $('title').text().trim() || url;
        const node: DocNode = { title, url, children: [] };

        // Specific selector for the cards/links on the index page
        const links: string[] = [];
        $('a').each((_, el) => {
            const href = $(el).attr('href');
            if (href) {
                try {
                    const absoluteUrl = new URL(href, url).toString();
                    // Filter for docs paths to avoid legal/cookie links
                    if (absoluteUrl.includes('/docs/Tech_Pubs/') || absoluteUrl.includes('/online-help/')) {
                        if (absoluteUrl.startsWith(BASE_URL) && !links.includes(absoluteUrl) && absoluteUrl !== url) {
                            links.push(absoluteUrl);
                        }
                    }
                } catch (e) {}
            }
        });

        console.log(`Found ${links.length} links on ${url}`);

        if (depth < maxDepth) {
            // Limit links for the brainstorm
            const linksToCrawl = links.slice(0, 10);
            for (const link of linksToCrawl) {
                const child = await crawl(link, depth + 1, maxDepth);
                if (child) node.children.push(child);
            }
        }

        return node;
    } catch (error: any) {
        console.error(`Failed to crawl ${url}:`, error.message);
        return null;
    }
}

async function run() {
    const root = await crawl(START_URL);
    if (root) {
        fs.writeFileSync(path.join(process.cwd(), 'docs-structure.json'), JSON.stringify(root, null, 2));
        console.log('Crawl complete. Data saved to docs-structure.json');
    }
}

run();