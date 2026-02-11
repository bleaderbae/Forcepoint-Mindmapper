import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { escapeHtml } from './utils/string_utils.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function run() {
    const mmdPath = path.join(process.cwd(), 'mindmap.mmd');
    if (!fs.existsSync(mmdPath)) {
        console.error('mindmap.mmd not found.');
        return;
    }

    const mermaidContent = fs.readFileSync(mmdPath, 'utf-8');
    const sanitizedContent = escapeHtml(mermaidContent);

    const templatePath = path.join(__dirname, 'templates', 'poc_template.html');
    if (!fs.existsSync(templatePath)) {
        console.error('Template file not found at:', templatePath);
        return;
    }

    let html = fs.readFileSync(templatePath, 'utf-8');
    html = html.replace('<!-- MERMAID_CONTENT -->', () => sanitizedContent);

    fs.writeFileSync(path.join(process.cwd(), 'index.html'), html);
    console.log('POC index.html updated with Forcepoint branding.');
}

run();
