import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { URL } from 'url';
import { normalizeUrl } from './utils/url_utils.ts';
import { logger } from './utils/logger.ts';
import type { DocNode } from './types.ts';

// START from the global sitemap to get EVERYTHING
const START_URL = 'https://help.forcepoint.com/docs/index.html';
const BASE_DOMAIN = 'help.forcepoint.com';
const MAX_CONCURRENCY = 10;
const MAX_PAGES = 10000;
const MAX_RETRIES = 3;
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
const queued = new Set<string>(visited);
const queue: { url: string; parentUrl?: string; retryCount?: number }[] = [];

// Parse command line arguments
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
    logger.info(`Targeted run for: ${normalizedTarget}`);

    if (visited.has(normalizedTarget)) {
        visited.delete(normalizedTarget);
        queued.delete(normalizedTarget);
    }

    results = results.filter(r => normalizeUrl(r.url) !== normalizedTarget);
    queue.push({ url: targetUrl });
    queued.add(normalizedTarget);
} else {
    const startNorm = normalizeUrl(START_URL);
    if (!queued.has(startNorm)) {
        queue.push({ url: START_URL });
        queued.add(startNorm);
    }
}

let processing = 0;

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<any> {
    for (let i = 0; i < retries; i++) {
        try {
            return await axios.get(url, { 
                timeout: 15000,
                headers: { 'User-Agent': 'Mozilla/5.0 ForcepointMindMapper/1.2' },
                validateStatus: (status: number) => status < 400
            });
        } catch (error: any) {
            if (i === retries - 1) throw error;
            const waitTime = Math.pow(2, i) * 1000;
            logger.warn(`Retry ${i + 1}/${retries} for ${url} after ${waitTime}ms: ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
}

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

    if (url.match(/\.(pdf|png|jpg|jpeg|gif|css|js|json|xml|zip|tar|gz)$/i)) {
        return;
    }

    try {
        logger.info(`Crawling [${visited.size}/${MAX_PAGES}]: ${url}`);
        const response = await fetchWithRetry(url);

        const contentType = response.headers['content-type'];
        if (!contentType || !contentType.includes('text/html')) {
            return;
        }

        const $ = cheerio.load(response.data);

        let title = $('article h1').first().text().trim() ||
                      $('h1.title').first().text().trim() || 
                      $('.wh_main_page_title').text().trim() ||
                      $('title').text().trim();

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

        const content = $('article, .wh_topic_content').text().replace(/\s+/g, ' ').trim();

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

        const links: string[] = [];
        $('.wh_side_toc a, .wh_topic_toc a, article a[href], .wh_main_page_toc a').each((_: any, el: any) => {
            const href = $(el).attr('href');
            if (href && !href.startsWith('javascript:') && !href.startsWith('#') && !href.startsWith('mailto:')) {
                try {
                    const absoluteUrl = new URL(href, url).toString();
                    const normAbsUrl = normalizeUrl(absoluteUrl);
                    if (new URL(absoluteUrl).hostname === BASE_DOMAIN && !queued.has(normAbsUrl)) {
                        queued.add(normAbsUrl);
                        links.push(absoluteUrl);
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
        logger.error(`Failed ${url}: ${error.message}`);
    }
}

let savePromise: Promise<void> | null = null;
async function save(): Promise<void> {
    if (savePromise) return savePromise;

    savePromise = (async () => {
        const TEMP_FILE = `${DATA_FILE}.tmp`;
        try {
            logger.info(`Saving ${results.length} pages...`);
            await new Promise<void>((resolve, reject) => {
                const stream = fs.createWriteStream(TEMP_FILE, { flags: 'w' });
                stream.write('[\n');

                let i = 0;
                // Capture length to ensure snapshot consistency during async write
                const total = results.length;

                function write() {
                    let ok = true;
                    while (i < total && ok) {
                        const isLast = i === total - 1;
                        // Manual JSON formatting to match JSON.stringify(results, null, 2)
                        // Indent object with 2 spaces
                        const itemStr = JSON.stringify(results[i], null, 2);
                        // Add indentation to each line of the item
                        const indentedItem = itemStr.split('\n').map(line => '  ' + line).join('\n');
                        const str = indentedItem + (isLast ? '' : ',\n');

                        ok = stream.write(str);
                        i++;
                    }

                    if (i < total) {
                        stream.once('drain', write);
                    } else {
                        stream.write('\n]');
                        stream.end();
                    }
                }

                write();

                stream.on('finish', resolve);
                stream.on('error', reject);
            });
            await fs.promises.rename(TEMP_FILE, DATA_FILE);
        } catch (err) {
            logger.error(`Failed to save data: ${err}`);
            // Attempt to clean up temp file on error
            try { await fs.promises.unlink(TEMP_FILE); } catch (e) {}
        } finally {
            savePromise = null;
        }
    })();

    return savePromise;
}

process.on('SIGINT', async () => {
    logger.info('Interrupted, saving progress...');
    await save();
    process.exit();
});

async function run() {
    // ⚡ Performance: Worker pool pattern eliminates polling delay in the main loop.
    // Instead of checking queue/concurrency every 50ms, workers immediately pick up
    // the next task. This significantly improves throughput for fast-loading pages.
    const workers = new Array(MAX_CONCURRENCY).fill(null).map(async () => {
        while (visited.size < MAX_PAGES) {
            const item = queue.shift();

            if (!item) {
                // If queue is empty and no other workers are active, we are done.
                if (processing === 0 && queue.length === 0) return;

                // If queue is empty but others are working, wait briefly for new work.
                await new Promise(resolve => setTimeout(resolve, 50));
                continue;
            }

            processing++;
            try {
                await processUrl(item.url, item.parentUrl);
                if (results.length % 500 === 0) await save();
            } catch (error) {
                // Should be caught in processUrl, but safe guard here
                logger.error(`Worker error: ${error}`);
            } finally {
                processing--;
            }
        }
    });

    await Promise.all(workers);
    await save();
    logger.info(`Crawl finished. Total pages: ${results.length}`);
}

run();