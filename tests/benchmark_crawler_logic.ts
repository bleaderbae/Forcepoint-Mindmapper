import { performance } from 'perf_hooks';

// Mock values
const MAX_CONCURRENCY = 10;
const MAX_PAGES = 10000;
const TASK_DURATION = 20; // ms
const TASK_COUNT = 100;

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Global state for simulation
let visited = new Set<string>();
let processing = 0;
let queue: { url: string }[] = [];
let results: any[] = [];

// Mock processUrl
async function processUrl(url: string) {
    await sleep(TASK_DURATION);
    results.push({ url });
}

// Reset state
function reset() {
    visited = new Set();
    processing = 0;
    queue = [];
    results = [];
    for (let i = 0; i < TASK_COUNT; i++) {
        queue.push({ url: `url-${i}` });
    }
}

// Old Logic (Slow)
async function runOld() {
    reset();
    const start = performance.now();

    while (queue.length > 0 || processing > 0) {
        if (queue.length > 0 && processing < MAX_CONCURRENCY && visited.size < MAX_PAGES) {
            const item = queue.shift();
            if (item) {
                processing++;
                visited.add(item.url);
                processUrl(item.url).finally(() => {
                    processing--;
                });
            }
        } else {
            await sleep(50);
            if (visited.size >= MAX_PAGES && processing === 0 && queue.length === 0) break;
        }
    }

    const end = performance.now();
    return end - start;
}

// New Logic (Fast)
async function runNew() {
    reset();
    const start = performance.now();

    const workers = new Array(MAX_CONCURRENCY).fill(null).map(async () => {
        while (visited.size < MAX_PAGES) {
             let item = queue.shift();
             if (!item) {
                 if (processing === 0 && queue.length === 0) return;
                 // Wait a bit if queue is empty but others are working
                 await sleep(50);
                 continue;
             }

             processing++;
             visited.add(item.url);
             try {
                 await processUrl(item.url);
             } finally {
                 processing--;
             }
        }
    });

    await Promise.all(workers);

    const end = performance.now();
    return end - start;
}

async function benchmark() {
    console.log(`Benchmarking with ${TASK_COUNT} tasks, ${MAX_CONCURRENCY} concurrency, ${TASK_DURATION}ms duration.`);

    const oldTime = await runOld();
    console.log(`Old Logic Time: ${oldTime.toFixed(2)}ms`);

    const newTime = await runNew();
    console.log(`New Logic Time: ${newTime.toFixed(2)}ms`);

    const improvement = ((oldTime - newTime) / oldTime) * 100;
    console.log(`Improvement: ${improvement.toFixed(2)}%`);
}

benchmark();
