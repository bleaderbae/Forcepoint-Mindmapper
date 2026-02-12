
import { humanize } from '../src/utils/string_utils.ts';
import { performance } from 'perf_hooks';

const iterations = 100000;
const testStrings = [
    "forcepoint-dlp-installation-guide",
    "admin-guide",
    "v8.9.1",
    "documentation/forcepoint-one",
    "release-notes-10.2",
    "troubleshooting-guide",
    "Forcepoint ONE Firewall",
    "deployment-guide-azure",
    "getting-started",
    "known-issues"
];

// Seed a larger array with repetitions to simulate real-world data (breadcrumbs)
const data: string[] = [];
for (let i = 0; i < iterations; i++) {
    data.push(testStrings[Math.floor(Math.random() * testStrings.length)]);
}

console.log(`Benchmarking humanize with ${iterations} iterations...`);

const start = performance.now();
for (const str of data) {
    humanize(str);
}
const end = performance.now();

console.log(`Execution time: ${(end - start).toFixed(4)}ms`);
