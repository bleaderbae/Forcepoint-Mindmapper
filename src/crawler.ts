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
    parentUrl?: string | undefined;
    nextUrl?: string | undefined;
    prevUrl?: string | undefined;
    relatedUrls: string[];
    lastScraped?: string;
}

const START_URL = 'https://help.forcepoint.com/dlp/10.4.0/dlphelp/index.html';
const BASE_DOMAIN = 'help.forcepoint.com';
const MAX_CONCURRENCY = 5;
const DATA_FILE = path.join(process.cwd(), 'full_site_data.json');

let results: DocNode[] = [];
if (fs.existsSync(DATA_FILE)) {
    try {
        results = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    } catch (e) {
        results = [];
    }
}

const visited = new Set<string>(results.map(r => r.url));
const queue: { url: string; parentUrl?: string }[] = [];

if (!visited.has(START_URL)) {
    queue.push({ url: START_URL });
}

let processing = 0;

async function processUrl(url: string, parentUrl?: string) {
    if (visited.has(url) && results.find(r => r.url === url)) {
        return;
    }
    visited.add(url);

    try {
        console.log(`[Queue: ${queue.length}] Crawling: ${url}`);
        const response = await axios.get(url, { 
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0 ForcepointMindMapper/1.0' }
        });
        const $ = cheerio.load(response.data);

        const title = $('article h1').first().text().trim() || $('h1.title').first().text().trim() || $('title').text().trim();
        const breadcrumbs: string[] = [];
        $('.wh_breadcrumb a').each((_, el) => {
            const text = $(el).text().trim();
            if (text && text !== 'Home') breadcrumbs.push(text);
        });

        const content = $('article').text().replace(/\s+/g, ' ').trim();

        // Semantic Flow Extraction
        const nextHref = $('.wh_next_topic a, a[rel="next"]').first().attr('href');
        const nextUrl = nextHref ? new URL(nextHref, url).toString() : undefined;

        const prevHref = $('.wh_previous_topic a, a[rel="prev"]').first().attr('href');
        const prevUrl = prevHref ? new URL(prevHref, url).toString() : undefined;

        const relatedUrls: string[] = [];
        $('.related-links a, .wh_related_links a').each((_, el) => {
            const href = $(el).attr('href');
            if (href) {
                try {
                    relatedUrls.push(new URL(href, url).toString());
                } catch (e) {}
            }
        });

        const structuralLinks: string[] = [];
        $('.wh_side_toc a').each((_, el) => {
            const href = $(el).attr('href');
            if (href && !href.startsWith('http') && !href.startsWith('#')) {
                try {
                    const absoluteUrl = new URL(href, url).toString();
                    if (new URL(absoluteUrl).hostname === BASE_DOMAIN && !visited.has(absoluteUrl)) {
                        structuralLinks.push(absoluteUrl);
                    }
                } catch (e) {}
            }
        });

        results.push({
            url,
            title,
            breadcrumbs,
            content: content.substring(0, 500),
            parentUrl,
            nextUrl,
            prevUrl,
            relatedUrls,
            lastScraped: new Date().toISOString()
        });

        for (const link of structuralLinks) {
            queue.push({ url: link, parentUrl: url });
        }
        // Also queue nextUrl if not visited to ensure we follow the flowchart
        if (nextUrl && !visited.has(nextUrl)) {
            queue.push({ url: nextUrl, parentUrl: url });
        }

    } catch (error: any) {
        console.error(`Failed ${url}: ${error.message}`);
    }
}

function save() {
    console.log(`Saving ${results.length} pages...`);
    fs.writeFileSync(DATA_FILE, JSON.stringify(results, null, 2));
}

process.on('SIGINT', () => {
    save();
    process.exit();
});

async function run() {
    if (results.length > 0 && queue.length === 0) {
        queue.push({ url: START_URL });
    }

    while (queue.length > 0 || processing > 0) {
        if (queue.length > 0 && processing < MAX_CONCURRENCY) {
            const item = queue.shift();
            if (item) {
                processing++;
                processUrl(item.url, item.parentUrl).then(() => {
                    if (results.length % 50 === 0) save();
                }).finally(() => {
                    processing--;
                });
            }
        } else {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    save();
    console.log(`Crawl finished. Total pages: ${results.length}`);
}

run();