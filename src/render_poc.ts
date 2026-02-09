import * as fs from 'fs';
import * as path from 'path';

function run() {
    const mermaidPath = path.join(process.cwd(), 'mindmap.mmd');
    const htmlPath = path.join(process.cwd(), 'index.html');
    
    if (!fs.existsSync(mermaidPath)) {
        console.error('mindmap.mmd not found');
        return;
    }

    const mermaidContent = fs.readFileSync(mermaidPath, 'utf-8');
    
    const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Forcepoint Mind Map POC</title>
    <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
        mermaid.initialize({ 
            startOnLoad: true,
            theme: 'base',
            themeVariables: {
                primaryColor: '#007bff',
                edgeColor: '#007bff',
                nodeBorder: '#007bff'
            }
        });
    </script>
    <style>
        body { font-family: sans-serif; background: #f4f4f9; margin: 0; padding: 20px; }
        .mermaid { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; text-align: center; }
    </style>
</head>
<body>
    <h1>Forcepoint Documentation Mind Map (POC)</h1>
    <div class="mermaid">
${mermaidContent}
    </div>
</body>
</html>`;

    fs.writeFileSync(htmlPath, htmlTemplate);
    console.log('POC index.html generated.');
}

run();
