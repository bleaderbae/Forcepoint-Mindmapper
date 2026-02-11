import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { URL } from 'url';
import { normalizeUrl } from './utils/url_utils.ts';
import { logger } from './utils/logger.ts';
import type { DocNode } from './types.ts';

const START_URL = 'https://help.forcepoint.com/docs/index.html';
const BASE_DOMAIN = 'help.forcepoint.com';
const MAX_CONCURRENCY = 10;
const MAX_PAGES = 10000;
const MAX_RETRIES = 3;
const DATA_FILE = path.join(process.cwd(), 'full_site_data.json');

let results: DocNode[] = [];
if (fs.existsSync(DATA_FILE)) {
    try { results = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); } catch (e) { results = []; }
}

const visited = new Set<string>(results.map(r => normalizeUrl(r.url)));
const queued = new Set<string>(visited);
const queue: { url: string; parentUrl?: string; retryCount?: number }[] = [];

const args = process.argv.slice(2);
let targetUrl: string | undefined;
for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--url' || args[i] === '-u') && args[i + 1]) {
        targetUrl = args[i + 1]; break;
    }
}

if (targetUrl) {
    const normalizedTarget = normalizeUrl(targetUrl);
    logger.info(`Targeted run for: ${normalizedTarget}`);
    if (visited.has(normalizedTarget)) { visited.delete(normalizedTarget); queued.delete(normalizedTarget); }
    results = results.filter(r => normalizeUrl(r.url) !== normalizedTarget);
    queue.push({ url: targetUrl });
    queued.add(normalizedTarget);
} else {
    const startNorm = normalizeUrl(START_URL);
    if (!queued.has(startNorm)) { queue.push({ url: START_URL }); queued.add(startNorm); }
}

let processing = 0;

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<any> {
    for (let i = 0; i < retries; i++) {
        try {
            return await axios.get(url, { 
                timeout: 15000,
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
                },
                validateStatus: (status: number) => status < 400
            });
        } catch (error: any) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
    }
}

async function processUrl(url: string, parentUrl?: string) {
    const normalizedUrl = normalizeUrl(url);
    if (visited.has(normalizedUrl)) return;

    try {
        const urlObj = new URL(normalizedUrl);
        if (urlObj.hostname !== BASE_DOMAIN) return;
    } catch (e) { return; }

    visited.add(normalizedUrl);
    if (url.match(/\.(pdf|png|jpg|jpeg|gif|css|js|json|xml|zip|tar|gz)$/i)) return;

    try {
        logger.info(`Crawling [${visited.size}/${MAX_PAGES}]: ${url}`);
        const response = await fetchWithRetry(url);
        const contentType = response.headers['content-type'];
        if (!contentType || !contentType.includes('text/html')) return;

        const $ = cheerio.load(response.data);

        let title = $('article h1').first().text().trim() ||
                      $('h1.title').first().text().trim() || 
                      $('.wh_main_page_title').text().trim() ||
                      $('title').text().trim();

        const breadcrumbs: string[] = [];
        $('.wh_breadcrumb a').each((_: any, el: any) => {
            const text = $(el).text().trim();
            if (text && text !== 'Home') breadcrumbs.push(text);
        });

        let content = $('meta[name="description"]').attr('content') || "";
        if (!content || content.length < 50) {
            const bodyText = $('article, .wh_topic_content, .body, #wh_topic_body').text().replace(/\s+/g, ' ').trim();
            if (bodyText.length > content.length) content = bodyText;
        }

        if (content.startsWith(title)) content = content.substring(title.length).trim();
        
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
            content: content.substring(0, 1500),
            parentUrl: parentUrl ? normalizeUrl(parentUrl) : undefined,
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

async function save(): Promise<void> {
    const TEMP_FILE = `${DATA_FILE}.tmp`;
    try {
        const stream = fs.createWriteStream(TEMP_FILE);
        stream.write('[\n');
        for (let i = 0; i < results.length; i++) {
            stream.write(JSON.stringify(results[i], null, 2).split('\n').map(line => '  ' + line).join('\n'));
            if (i < results.length - 1) stream.write(',\n');
        }
        stream.write('\n]');
        stream.end();
        await new Promise(r => stream.on('finish', r));
        await fs.promises.rename(TEMP_FILE, DATA_FILE);
    } catch (err) { logger.error(`Save error: ${err}`); }
}

async function run() {
    const workers = new Array(MAX_CONCURRENCY).fill(null).map(async () => {
        while (visited.size < MAX_PAGES) {
            const item = queue.shift();
            if (!item) {
                if (processing === 0 && queue.length === 0) return;
                await new Promise(r => setTimeout(r, 50)); continue;
            }
            processing++;
            try {
                await processUrl(item.url, item.parentUrl);
                if (results.length % 100 === 0) await save();
            } finally { processing--; }
        }
    });
    await Promise.all(workers);
    await save();
}

run();