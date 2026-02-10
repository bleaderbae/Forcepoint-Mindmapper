import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { URL } from 'url';
import { normalizeUrl } from './url_utils.ts';

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

// START from the global sitemap to get EVERYTHING
const START_URL = 'https://help.forcepoint.com/docs/index.html';
const BASE_DOMAIN = 'help.forcepoint.com';
const MAX_CONCURRENCY = 10;
const MAX_PAGES = 10000;
const DATA_FILE = path.join(process.cwd(), 'full_site_data.json');

let results: DocNode[] = [];
if (fs.existsSync(DATA_FILE)) {
    try {
        results = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    } catch (e) {
        results = [];
    }
}

const visited = new Set<string>(results.map(r => normalizeUrl(r.url)));
// Track queued URLs to prevent duplicates in the queue
const queued = new Set<string>(visited);
const queue: { url: string; parentUrl?: string }[] = [];

// Parse command line arguments for targeted run
const args = process.argv.slice(2);
let targetUrl: string | undefined;

for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--url' || args[i] === '-u') && args[i + 1]) {
        targetUrl = args[i + 1];
        break;
    }
}

if (targetUrl) {
    const normalizedTarget = normalizeUrl(targetUrl);
    console.log(`Targeted run for: ${normalizedTarget}`);

    // Remove from visited so it gets re-crawled
    if (visited.has(normalizedTarget)) {
        visited.delete(normalizedTarget);
        queued.delete(normalizedTarget);
        console.log(`Removed ${normalizedTarget} from visited set to force update.`);
    }

    // Remove existing entry from results to update it
    const initialCount = results.length;
    results = results.filter(r => normalizeUrl(r.url) !== normalizedTarget);
    if (results.length < initialCount) {
        console.log(`Removed existing data for ${normalizedTarget} to refresh content.`);
    }

    queue.push({ url: targetUrl });
    queued.add(normalizedTarget);
} else {
    // Default behavior: start from global sitemap if not visited/queued
    const startNorm = normalizeUrl(START_URL);
    if (!queued.has(startNorm)) {
        queue.push({ url: START_URL });
        queued.add(startNorm);
    }
}

let processing = 0;

async function processUrl(url: string, parentUrl?: string) {
    const normalizedUrl = normalizeUrl(url);
    if (visited.has(normalizedUrl)) return;

    // Security: Strict Scope Validation
    try {
        const urlObj = new URL(normalizedUrl);
        if (urlObj.hostname !== BASE_DOMAIN) {
            console.log(`Skipping off-domain URL: ${normalizedUrl}`);
            return;
        }
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            console.log(`Skipping unsafe protocol: ${normalizedUrl}`);
            return;
        }
    } catch (e) {
        console.error(`Skipping invalid URL: ${url}`);
        return;
    }

    visited.add(normalizedUrl);

    // Skip obviously non-HTML extensions
    if (url.match(/\.(pdf|png|jpg|jpeg|gif|css|js|json|xml|zip|tar|gz)$/i)) {
        console.log(`Skipping non-HTML: ${url}`);
        return;
    }

    try {
        console.log(`[Queue: ${queue.length}] Crawling: ${url}`);
        const response = await axios.get(url, { 
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0 ForcepointMindMapper/1.1' },
            validateStatus: (status: number) => status < 400 // reject if >= 400
        });

        const contentType = response.headers['content-type'];
        if (!contentType || !contentType.includes('text/html')) {
            console.log(`Skipping non-HTML content-type (${contentType}): ${url}`);
            return;
        }

        const $ = cheerio.load(response.data);

        // Improved Title extraction
        let title = $('article h1').first().text().trim() ||
                      $('h1.title').first().text().trim() || 
                      $('.wh_main_page_title').text().trim() ||
                      $('title').text().trim();

        // Fallback for title from breadcrumbs or URL
        if (!title) {
            const lastCrumb = $('.wh_breadcrumb a').last().text().trim();
            if (lastCrumb) title = lastCrumb;
        }
        if (!title) {
            const parts = normalizedUrl.split('/');
            let filename = parts[parts.length - 1];
            if (!filename || filename === 'index.html') filename = parts[parts.length - 2] || 'Untitled';
            title = filename.replace(/[-_]/g, ' ').replace('.html', '');
        }


        const breadcrumbs: string[] = [];
        $('.wh_breadcrumb a').each((_: any, el: any) => {
            const text = $(el).text().trim();
            if (text && text !== 'Home') breadcrumbs.push(text);
        });

        // Content strictly from article or main body
        const content = $('article, .wh_topic_content').text().replace(/\s+/g, ' ').trim();

        // Semantic Flow Extraction
        const nextHref = $('.wh_next_topic a, a[rel="next"]').first().attr('href');
        const nextUrl = nextHref ? normalizeUrl(new URL(nextHref, url).toString()) : undefined;

        const prevHref = $('.wh_previous_topic a, a[rel="prev"]').first().attr('href');
        const prevUrl = prevHref ? normalizeUrl(new URL(prevHref, url).toString()) : undefined;

        const relatedUrls: string[] = [];
        $('.related-links a, .wh_related_links a').each((_: any, el: any) => {
            const href = $(el).attr('href');
            if (href) {
                try {
                    relatedUrls.push(normalizeUrl(new URL(href, url).toString()));
                } catch (e) {}
            }
        });

        // Link Extraction: Prioritize TOC but also capture sitemap links
        const links: string[] = [];
        $('.wh_side_toc a, .wh_topic_toc a, article a[href], .wh_main_page_toc a').each((_: any, el: any) => {
            const href = $(el).attr('href');
            if (href && !href.startsWith('javascript:') && !href.startsWith('#') && !href.startsWith('mailto:')) {
                try {
                    const absoluteUrl = new URL(href, url).toString();
                    const normAbsUrl = normalizeUrl(absoluteUrl);
                    // Use queued set to prevent duplicate queue items
                    if (new URL(absoluteUrl).hostname === BASE_DOMAIN && !queued.has(normAbsUrl)) {
                        queued.add(normAbsUrl);
                        links.push(absoluteUrl); // push original URL to queue, let processUrl normalize
                    }
                } catch (e) {}
            }
        });

        results.push({
            url: normalizedUrl,
            title,
            breadcrumbs,
            content: content.substring(0, 1000),
            parentUrl: parentUrl ? normalizeUrl(parentUrl) : undefined,
            nextUrl,
            prevUrl,
            relatedUrls,
            lastScraped: new Date().toISOString()
        });

        for (const link of links) {
            queue.push({ url: link, parentUrl: url });
        }

    } catch (error: any) {
        console.error(`Failed ${url}: ${error.message}`);
    }
}

let savePromise: Promise<void> | null = null;
function save(): Promise<void> {
    if (savePromise) return savePromise;

    savePromise = (async () => {
        try {
            console.log(`Saving ${results.length} pages...`);
            await fs.promises.writeFile(DATA_FILE, JSON.stringify(results, null, 2));
        } catch (err) {
            console.error(`Failed to save data: ${err}`);
        } finally {
            savePromise = null;
        }
    })();

    return savePromise;
}

process.on('SIGINT', async () => {
    console.log('\nInterrupted, saving progress...');
    // If a save is already in progress, wait for it and then do one final save
    // to ensure any data added after the first save started is captured.
    await save();
    await save();
    process.exit();
});

async function run() {
    // If resuming, start from unvisited links in results or START_URL
    if (results.length > 0 && queue.length === 0) {
        // Find links in existing results that are not visited?
        // Actually, if we just rely on visited set, we are good.
        // But queue is empty.
        // We could restart crawl from START_URL to find new links, but visited set prevents re-crawling known pages.
        const startNorm = normalizeUrl(START_URL);
        if (!queued.has(startNorm)) {
            queue.push({ url: START_URL });
            queued.add(startNorm);
        }
    }

    while (queue.length > 0 || processing > 0) {
        if (queue.length > 0 && processing < MAX_CONCURRENCY && visited.size < MAX_PAGES) {
            const item = queue.shift();
            if (item) {
                processing++;
                processUrl(item.url, item.parentUrl).then(async () => {
                    // Save every 500 pages instead of 100 to reduce I/O and serialization overhead
                    if (results.length % 500 === 0) await save();
                }).finally(() => {
                    processing--;
                });
            }
        } else {
            await new Promise(resolve => setTimeout(resolve, 100));
            if (visited.size >= MAX_PAGES && processing === 0 && queue.length === 0) break;
        }
    }
    await save();
    console.log(`Crawl finished. Total pages: ${results.length}`);
}

run();
