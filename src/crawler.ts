import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { URL } from 'url';

interface DocNode {
    url: string;
    title: string;
    content?: string;
    breadcrumbs: string[];
    parentUrl?: string;
    nextUrl?: string | undefined;
    prevUrl?: string | undefined;
    relatedUrls: string[];
    lastScraped?: string;
}

const START_URL = 'https://help.forcepoint.com/dlp/10.4.0/dlphelp/index.html';
const BASE_DOMAIN = 'help.forcepoint.com';
// We allow crawling anything under the same path prefix to avoid escaping to other products/versions unexpectedly,
// but we can relax this if needed. For now, strict to avoid massive crawl.
const ALLOWED_PATH_PREFIX = '/dlp/10.4.0/dlphelp/';
const MAX_CONCURRENCY = 5;
const DATA_FILE = path.join(process.cwd(), 'full_site_data.json');

let results: DocNode[] = [];
// Load existing data if available to resume
if (fs.existsSync(DATA_FILE)) {
    try {
        results = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    } catch (e) {
        results = [];
    }
}

const visited = new Set<string>(results.map(r => r.url));
const queue: string[] = [];

if (!visited.has(START_URL)) {
    queue.push(START_URL);
}

let activeRequests = 0;

function isAllowedUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.hostname === BASE_DOMAIN && parsed.pathname.startsWith(ALLOWED_PATH_PREFIX);
    } catch (e) {
        return false;
    }
}

async function processUrl(url: string) {
    if (visited.has(url)) return;
    visited.add(url);

    try {
        console.log(`[Active: ${activeRequests} | Queue: ${queue.length} | Saved: ${results.length}] Crawling: ${url}`);
        const response = await axios.get(url, {
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0 ForcepointMindMapper/1.0' }
        });

        const $ = cheerio.load(response.data);
        const title = $('h1.title').first().text().trim() || $('title').text().trim();

        const breadcrumbs: string[] = [];
        $('.wh_breadcrumb a').each((_, el) => {
            const text = $(el).text().trim();
            if (text && text !== 'Home') breadcrumbs.push(text);
        });

        const content = $('article').text().replace(/\s+/g, ' ').trim();

        // Extract semantic flow
        const nextHref = $('.wh_next_topic a').attr('href') || $('a[rel="next"]').attr('href');
        const nextUrl = nextHref ? new URL(nextHref, url).toString() : undefined;

        const prevHref = $('.wh_previous_topic a').attr('href') || $('a[rel="prev"]').attr('href');
        const prevUrl = prevHref ? new URL(prevHref, url).toString() : undefined;

        const relatedUrls: string[] = [];
        $('.related-links a, .wh_related_links a').each((_, el) => {
            const href = $(el).attr('href');
            if (href) {
                try {
                    const fullUrl = new URL(href, url).toString();
                    if (isAllowedUrl(fullUrl)) {
                        relatedUrls.push(fullUrl);
                    }
                } catch (e) {}
            }
        });

        // TOC Links (Structure)
        const structuralLinks: string[] = [];
        // Add more selectors for main page TOC and side TOC
        $('.wh_side_toc a, .wh_main_page_toc a, .wh_main_page_toc_entry a, .wh_main_page_toc_accordion_header a, .wh_tile a').each((_, el) => {
            const href = $(el).attr('href');
            if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                try {
                    const fullUrl = new URL(href, url).toString();
                    if (isAllowedUrl(fullUrl) && !visited.has(fullUrl) && !queue.includes(fullUrl)) {
                        structuralLinks.push(fullUrl);
                    }
                } catch (e) {}
            }
        });

        // Add to results
        results.push({
            url,
            title,
            breadcrumbs,
            content: content.substring(0, 500), // truncate for size
            nextUrl,
            prevUrl,
            relatedUrls,
            lastScraped: new Date().toISOString()
        });

        // Enqueue new links
        if (nextUrl && isAllowedUrl(nextUrl) && !visited.has(nextUrl) && !queue.includes(nextUrl)) {
            queue.push(nextUrl);
        }

        for (const link of structuralLinks) {
            if (!visited.has(link) && !queue.includes(link)) {
                queue.push(link);
            }
        }

    } catch (error: any) {
        console.error(`Failed ${url}: ${error.message}`);
    }
}

function save() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(results, null, 2));
    console.log(`Saved ${results.length} pages to ${DATA_FILE}`);
}

async function run() {
    const processQueue = async () => {
        while (queue.length > 0 || activeRequests > 0) {
            if (queue.length > 0 && activeRequests < MAX_CONCURRENCY) {
                const url = queue.shift();
                if (url) {
                    activeRequests++;
                    processUrl(url).then(() => {
                        activeRequests--;
                        if (results.length % 20 === 0) save();
                    }).catch(() => {
                        activeRequests--;
                    });
                }
            } else {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    };

    await processQueue();
    save();
    console.log(`Crawl finished. Total pages: ${results.length}`);
}

// Handle interrupts
process.on('SIGINT', () => {
    console.log('\nCrawler interrupted. Saving progress...');
    save();
    process.exit();
});

run();
