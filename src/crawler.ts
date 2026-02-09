import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { URL } from 'url';

interface DocNode {
    url: string;
    title: string;
    content?: string;
    breadcrumbs?: string[];
    links: string[];
}

const START_URL = 'https://help.forcepoint.com/dlp/10.4.0/dlphelp/index.html';
const BASE_DOMAIN = 'help.forcepoint.com';
const MAX_CONCURRENCY = 5;
const MAX_PAGES = 10000; // Safety limit for "full" crawl

const visited = new Set<string>();
const queue: string[] = [START_URL];
const results: DocNode[] = [];

let processing = 0;

async function processUrl(url: string) {
    if (visited.has(url)) return;
    visited.add(url);

    try {
        console.log(`[Queue: ${queue.length}] Crawling: ${url}`);
        const response = await axios.get(url, { timeout: 10000 });
        const $ = cheerio.load(response.data);

        // Extract Title
        const title = $('h1.title').first().text().trim() || $('title').text().trim();

        // Extract Breadcrumbs
        const breadcrumbs: string[] = [];
        $('.wh_breadcrumb a').each((_, el) => {
            breadcrumbs.push($(el).text().trim());
        });

        // Extract Content (simplified)
        const content = $('.wh_topic_content, .body, article').text().replace(/\s+/g, ' ').trim();

        // Extract Links
        const links: string[] = [];
        $('a[href]').each((_, el) => {
            const href = $(el).attr('href');
            if (href && !href.startsWith('javascript:') && !href.startsWith('#') && !href.startsWith('mailto:')) {
                try {
                    const absoluteUrl = new URL(href, url).toString();
                    // Stay within domain
                    if (new URL(absoluteUrl).hostname === BASE_DOMAIN) {
                         // Optional: Filter to stay within specific product/version if desired
                         // For now, full site or subtree
                         if (!visited.has(absoluteUrl)) {
                             links.push(absoluteUrl);
                         }
                    }
                } catch (e) {
                    // ignore invalid URLs
                }
            }
        });

        results.push({
            url,
            title,
            breadcrumbs,
            content: content.substring(0, 500) + '...', // Truncate for summary
            links
        });

        // Add new links to queue
        for (const link of links) {
            if (!visited.has(link) && !queue.includes(link)) {
                queue.push(link);
            }
        }

    } catch (error: any) {
        console.error(`Failed ${url}: ${error.message}`);
    }
}

function save() {
    console.log(`Saving ${results.length} pages to full_site_data.json...`);
    fs.writeFileSync(path.join(process.cwd(), 'full_site_data.json'), JSON.stringify(results, null, 2));
}

process.on('SIGINT', () => {
    console.log('\nCaught interrupt signal, saving data...');
    save();
    process.exit();
});

async function run() {
    console.log(`Starting crawl of ${START_URL}`);
    
    let pagesProcessed = 0;

    while ((queue.length > 0 || processing > 0) && visited.size < MAX_PAGES) {
        if (queue.length > 0 && processing < MAX_CONCURRENCY) {
            const url = queue.shift();
            if (url) {
                processing++;
                processUrl(url).then(() => {
                    pagesProcessed++;
                    if (pagesProcessed % 20 === 0) save();
                }).finally(() => {
                    processing--;
                });
            }
        } else {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    save();
    console.log(`Crawl complete. Visited ${visited.size} pages. Saved to full_site_data.json`);
}

run();
