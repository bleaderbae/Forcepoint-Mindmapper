import * as fs from 'fs';
import * as path from 'path';

function run() {
    const dataPath = path.join(process.cwd(), 'd3-data.json');
    if (!fs.existsSync(dataPath)) {
        console.error('d3-data.json not found. Run npm run gen-d3 first.');
        return;
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://d3js.org; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; object-src 'none'; base-uri 'none';">
    <title>Forcepoint Mind Map Canvas</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --fp-green: #00af9a;
            --fp-dark-green: #007565;
            --fp-navy: #1d252c;
            --fp-gray: #636569;
            --fp-light: #f5f6f6;
            
            --bg-color: var(--fp-light);
            --header-bg: var(--fp-navy);
            --card-bg: #ffffff;
            --text-primary: var(--fp-navy);
            --text-secondary: var(--fp-gray);
            --border-color: #e2e8f0;
            --node-bg: #ffffff;
            --edge-color: #cbd5e0;
            --grid-color: #d1d1d1;
            --sidebar-width: 340px;
            --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        body.dark-mode {
            --bg-color: #0f172a;
            --header-bg: #020617;
            --card-bg: #1e293b;
            --text-primary: #f1f5f9;
            --text-secondary: #94a3b8;
            --border-color: #334155;
            --node-bg: #1e293b;
            --edge-color: #475569;
            --grid-color: #334155;
        }

        * { box-sizing: border-box; }

        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            font-family: 'Inter', system-ui, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-primary);
            transition: background-color 0.3s ease, color 0.3s ease;
            display: flex;
            height: 100vh;
        }

        header {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 64px;
            background-color: var(--header-bg);
            color: white;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 24px;
            z-index: 1000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }

        header h1 {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 600;
        }

        /* Finder Sidebar */
        #global-finder {
            width: var(--sidebar-width);
            background: var(--card-bg);
            border-right: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
            z-index: 950;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s ease;
            margin-top: 64px;
            height: calc(100vh - 64px);
        }

        #global-finder.collapsed {
            transform: translateX(-100%);
            position: absolute;
        }

        .finder-header {
            padding: 16px;
            background: var(--fp-green);
            color: white;
            font-weight: 800;
            font-size: 12px;
            letter-spacing: 1px;
            text-transform: uppercase;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .finder-scroll {
            flex: 1;
            overflow-y: auto;
            padding: 0;
        }

        .finder-item {
            padding: 10px 16px;
            cursor: pointer;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: all 0.2s;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: var(--text-primary);
            border-bottom: 1px solid transparent;
        }

        .finder-item:hover {
            background: var(--fp-light);
            color: var(--fp-green);
        }

        .dark-mode .finder-item:hover {
            background: rgba(255,255,255,0.05);
        }

        .finder-item--active {
            background: rgba(0, 175, 154, 0.1);
            color: var(--fp-green);
            border-left: 4px solid var(--fp-green);
            font-weight: 600;
        }

        .finder-item--platform { 
            background: var(--header-bg); 
            color: white !important; 
            font-weight: 700; 
            margin-top: 0; 
            position: sticky; 
            top: 0;
            z-index: 10;
        }
        
        .finder-item--product {
            background: var(--bg-color);
            border-bottom: 1px solid var(--border-color);
            font-weight: 700;
            color: var(--fp-green);
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
        }

        .finder-item--version { color: var(--text-secondary); font-style: italic; font-size: 11px; }
        .finder-item--indent-1 { padding-left: 16px; }
        .finder-item--indent-2 { padding-left: 32px; }
        .finder-item--indent-3 { padding-left: 48px; }
        .finder-item--indent-4 { padding-left: 64px; }

        .sidebar-toggle {
            position: absolute;
            top: 80px;
            left: var(--sidebar-width);
            background: var(--fp-green);
            color: white;
            border: none;
            width: 24px;
            height: 48px;
            border-radius: 0 8px 8px 0;
            cursor: pointer;
            z-index: 960;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 2px 0 5px rgba(0,0,0,0.1);
        }

        #global-finder.collapsed + .sidebar-toggle {
            left: 0;
        }

        /* Layout adjustment */
        #main-content {
            flex: 1;
            position: relative;
            overflow: hidden;
        }

        .header-actions {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        #breadcrumb-navigator {
            position: absolute;
            top: 80px;
            left: 40px;
            z-index: 900;
            background: var(--card-bg);
            padding: 8px 16px;
            border-radius: 8px;
            box-shadow: var(--shadow);
            border: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            color: var(--text-secondary);
            max-width: 60vw;
            overflow-x: auto;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease, background-color 0.3s ease;
        }

        #breadcrumb-navigator.visible {
            opacity: 1;
            pointer-events: auto;
        }

        .breadcrumb-item {
            cursor: pointer;
            transition: color 0.2s;
        }

        .breadcrumb-item:hover {
            color: var(--fp-green);
            text-decoration: underline;
        }

        .breadcrumb-separator {
            color: var(--border-color);
        }

        #search-input {
            padding: 8px 16px;
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.2);
            background: rgba(255,255,255,0.1);
            color: white;
            width: 250px;
            outline: none;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-size: 14px;
        }

        #search-input:focus {
            background: white;
            color: var(--fp-navy);
            width: 400px;
            box-shadow: 0 0 0 3px rgba(0, 175, 154, 0.3);
        }

        .theme-toggle {
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            color: white;
            width: 40px;
            height: 40px;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            transition: all 0.2s;
        }

        #canvas-container {
            width: 100%;
            height: 100%;
            cursor: grab;
            background-image: 
                radial-gradient(circle, var(--grid-color) 1.5px, transparent 1.5px);
            background-size: 48px 48px;
            position: relative;
        }

        .node rect {
            fill: var(--node-bg);
            stroke: var(--border-color);
            stroke-width: 1.5px;
            rx: 12; ry: 12;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1), fill 0.3s ease, stroke 0.3s ease;
        }

        .node--selected rect {
            stroke: var(--fp-green) !important;
            stroke-width: 3px !important;
            filter: drop-shadow(0 8px 24px rgba(0, 175, 154, 0.2));
        }

        .node text {
            font-size: 13px;
            font-weight: 600;
            pointer-events: none;
            fill: var(--text-primary);
            transition: fill 0.3s ease;
        }

        .link {
            fill: none;
            stroke: var(--edge-color);
            stroke-width: 2.5px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease;
        }

        .node--compressed { opacity: 0.4; }

        .controls {
            position: absolute;
            bottom: 32px;
            left: 32px;
            display: flex;
            gap: 12px;
            z-index: 100;
        }

        .btn {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            width: 44px; height: 44px;
            border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; box-shadow: var(--shadow);
            font-size: 20px; color: var(--text-primary);
            transition: all 0.2s;
        }

        #loading-overlay {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: var(--bg-color);
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            z-index: 2000; transition: opacity 0.5s ease-out;
        }

        .spinner {
            width: 40px; height: 40px;
            border: 4px solid var(--border-color);
            border-top: 4px solid var(--fp-green);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
        }

        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div id="loading-overlay">
        <div class="spinner"></div>
        <div style="font-weight: 500; color: var(--text-secondary);">Building Directory...</div>
    </div>
    
    <header>
        <h1>Forcepoint Documentation</h1>
        <div class="header-actions">
            <div id="search-container">
                <input type="text" id="search-input" placeholder="Search docs (Press / to focus)">
            </div>
            <button class="theme-toggle" id="theme-toggle" title="Toggle Dark Mode">🌓</button>
        </div>
    </header>

    <aside id="global-finder">
        <div class="finder-header">
            <span>Documentation Hub</span>
            <span id="finder-stats" style="font-size: 10px; opacity: 0.8;"></span>
        </div>
        <div class="finder-scroll" id="finder-list"></div>
    </aside>
    <button class="sidebar-toggle" id="finder-toggle" onclick="toggleSidebar()">‹</button>

    <main id="main-content">
        <div id="breadcrumb-navigator"></div>
        <div id="ghost-tooltip" style="position:absolute; background:var(--card-bg); border:1px solid var(--border-color); padding:12px; border-radius:8px; opacity:0; pointer-events:none; z-index:1000; box-shadow:var(--shadow-lg);"></div>
        <div id="canvas-container">
            <div class="controls">
                <button class="btn" title="Zoom In" onclick="zoomIn()">+</button>
                <button class="btn" title="Zoom Out" onclick="zoomOut()">-</button>
                <button class="btn" title="Reset View" onclick="resetZoom()">⟲</button>
            </div>
        </div>
    </main>

    <script>
        const config = {
            nodeWidth: 280, nodeHeight: 52, expandedHeight: 160, directoryHeight: 320,
            levelWidth: 400, directoryThreshold: 12
        };

        let root;
        let svg, g, linkGroup, nodeGroup;
        let zoom;
        let i = 0;
        let selectedNode = null;
        const duration = 600;

        function toggleSidebar() {
            const finder = document.getElementById('global-finder');
            const toggle = document.getElementById('finder-toggle');
            const isCollapsed = finder.classList.toggle('collapsed');
            toggle.innerText = isCollapsed ? '›' : '‹';
            setTimeout(() => {
                const width = document.getElementById('canvas-container').clientWidth;
                const height = document.getElementById('canvas-container').clientHeight;
                svg.attr("width", width).attr("height", height);
            }, 300);
        }

        async function init() {
            let data;
            try {
                data = await d3.json('d3-data.json?v=' + new Date().getTime());
            } catch (error) { console.error(error); return; }
            
            const container = d3.select("#canvas-container");
            svg = container.append("svg").attr("width", "100%").attr("height", "100%").style("overflow", "visible");
            g = svg.append("g");
            linkGroup = g.append("g").attr("class", "links");
            nodeGroup = g.append("g").attr("class", "nodes");

            zoom = d3.zoom().scaleExtent([0.05, 3]).on("zoom", (event) => g.attr("transform", event.transform));
            svg.call(zoom);

            root = d3.hierarchy(data, d => d.children);
            root.eachAfter(d => {
                d.value = d.children ? d.children.reduce((sum, c) => sum + c.value, 0) : 1;
                if (d.children && d.children.length > config.directoryThreshold) d.data.isDirectory = true;
            });

            root.x0 = container.node().clientHeight / 2;
            root.y0 = 0;

            buildFinder();

            if (root.children) root.children.forEach(d => { if (d.children) d.children.forEach(collapse); });

            update(root);
            resetZoom();

            document.getElementById('loading-overlay').style.opacity = '0';
            setTimeout(() => document.getElementById('loading-overlay').remove(), 500);

            // Search
            d3.select("#search-input").on("input", function() {
                const term = this.value.toLowerCase();
                if (!term) return;
                const match = root.descendants().find(d => d.data.name.toLowerCase().includes(term));
                if (match) window.focusNodeById(match.id);
            });
        }

        function buildFinder() {
            const finderList = document.getElementById('finder-list');
            finderList.innerHTML = "";
            const descendants = root.descendants();
            
            document.getElementById('finder-stats').innerText = \`\${descendants.length - 1} Docs\`;

            descendants.forEach(d => {
                if (d.depth === 0) return;
                const item = document.createElement('div');
                item.className = \`finder-item finder-item--indent-\${Math.min(d.depth, 4)}\`;
                item.dataset.id = d.id;
                
                if (d.data.type === 'platform') item.classList.add('finder-item--platform');
                else if (d.depth === 1) item.classList.add('finder-item--product');
                else if (d.data.type === 'version') item.classList.add('finder-item--version');
                
                const icon = d.data.url ? '📄' : (d.data.type === 'platform' ? '🌐' : '📁');
                item.innerHTML = \`<span style="opacity:0.6">\${icon}</span> <span>\${d.data.name}</span>\`;
                item.onclick = () => window.focusNodeById(d.id);
                finderList.appendChild(item);
            });
        }

        function collapse(d) {
            if (d.children) {
                d._children = d.children;
                d._children.forEach(collapse);
                d.children = null;
            }
        }

        window.focusNodeById = (id) => {
            const target = root.descendants().find(d => String(d.id) === String(id));
            if (!target) return;

            const ancestors = target.ancestors();
            for (let i = ancestors.length - 1; i > 0; i--) {
                const parent = ancestors[i];
                if (parent._children) {
                    parent.children = parent._children;
                    parent._children = null;
                    update(parent);
                }
            }

            selectNode(target);
            update(target);
            
            // Highlight in sidebar
            document.querySelectorAll('.finder-item').forEach(el => el.classList.remove('finder-item--active'));
            const activeItem = document.querySelector(\`.finder-item[data-id="\${id}"]\`);
            if (activeItem) {
                activeItem.classList.add('finder-item--active');
                activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            const container = d3.select("#canvas-container");
            const w = container.node().clientWidth;
            const h = container.node().clientHeight;
            let scale = target.data.type === 'document' ? 1.2 : 0.8;

            svg.transition().duration(750).call(
                zoom.transform,
                d3.zoomIdentity.translate(w/3, h/2).scale(scale).translate(-target.y, -target.x)
            );
        };

        function calculateDynamicTree() {
            const layout = d3.tree().nodeSize([160, config.levelWidth]);
            const treeData = layout(root);
            const nodes = treeData.descendants();
            if (selectedNode) {
                const activePath = new Set(selectedNode.ancestors());
                nodes.sort((a,b) => a.x - b.x);
                nodes.forEach((d, index) => {
                    const isFocus = activePath.has(d) || (selectedNode.parent && activePath.has(d.parent));
                    d.x = index > 0 ? nodes[index-1].x + (isFocus ? 160 : 45) : 0;
                });
            }
            return treeData;
        }

        function update(source) {
            const treeData = calculateDynamicTree();
            const nodes = treeData.descendants();
            const links = treeData.links();
            nodes.forEach(d => { d.y = d.depth * config.levelWidth; });

            const node = nodeGroup.selectAll("g.node").data(nodes, d => d.id || (d.id = ++i));
            const nodeEnter = node.enter().append("g")
                .attr("class", d => "node node--" + (d.data.type || 'category'))
                .attr("transform", d => "translate(" + (source.y0 ?? source.y ?? 0) + "," + (source.x0 ?? source.x ?? 0) + ")")
                .on("click", (event, d) => window.focusNodeById(d.id));

            nodeEnter.append("rect").attr("width", config.nodeWidth).attr("height", config.nodeHeight).attr("y", -config.nodeHeight/2);
            nodeEnter.append("text").attr("class", "node-label").attr("dy", ".35em").attr("x", 16).text(d => d.data.name.length > 32 ? d.data.name.substring(0, 29) + "..." : d.data.name);
            nodeEnter.append("foreignObject").attr("class", "details-container").attr("width", config.nodeWidth).attr("y", -config.expandedHeight/2);

            const nodeUpdate = nodeEnter.merge(node);
            const activePath = selectedNode ? new Set(selectedNode.ancestors()) : new Set();
            nodeUpdate.classed("node--selected", d => d === selectedNode)
                      .classed("node--compressed", d => selectedNode && !activePath.has(d) && !(d.parent && activePath.has(d.parent)));

            nodeUpdate.transition().duration(duration).attr("transform", d => "translate(" + d.y + "," + d.x + ")");
            nodeUpdate.select("rect").transition().duration(duration).attr("height", d => d === selectedNode ? (d.data.isDirectory ? config.directoryHeight : config.expandedHeight) : config.nodeHeight)
                .attr("y", d => { const h = d === selectedNode ? (d.data.isDirectory ? config.directoryHeight : config.expandedHeight) : config.nodeHeight; return -h/2; });

            nodeUpdate.each(function(d) {
                if (d !== selectedNode) return;
                const fo = d3.select(this).select(".details-container");
                fo.style("pointer-events", "auto");
                const safeName = d.data.name.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#039;"}[m]));
                const safeUrl = (d.data.url && /^https?:\\/\\//i.test(d.data.url)) ? d.data.url.replace(/"/g, "&quot;") : '';
                
                if (d.data.isDirectory) {
                    const items = (d.children || d._children || []).map(c => \`<li class="directory-item" onclick="event.stopPropagation(); window.focusNodeById('\${c.id}')">\${c.data.name}</li>\`).join("");
                    fo.html(\`<div class="node-details directory-container" xmlns="http://www.w3.org/1999/xhtml"><div class="directory-header"><span>DIRECTORY</span><span>\${(d.children||d._children).length} items</span></div><div class="detail-title">\${safeName}</div><ul class="directory-list">\${items}</ul></div>\`);
                } else {
                    fo.html(\`<div class="node-details" xmlns="http://www.w3.org/1999/xhtml"><div class="type-tag tag-\${d.data.type}">\${d.data.type}</div><div class="detail-title">\${safeName}</div>\${safeUrl ? \`<a href="\${safeUrl}" target="_blank" class="external-link-btn" onclick="event.stopPropagation()">Documentation ↗</a>\` : ''}</div>\`);
                }
            });

            node.exit().transition().duration(duration).attr("transform", d => "translate(" + source.y + "," + source.x + ")").remove();

            const link = linkGroup.selectAll("path.link").data(links, d => d.target.id);
            link.enter().insert("path", "g").attr("class", "link").attr("d", d => { const o = { x: source.x0 ?? source.x ?? 0, y: (source.y0 ?? source.y ?? 0) + config.nodeWidth }; return diagonal(o, o); })
                .merge(link).transition().duration(duration).attr("d", d => diagonal({ x: d.source.x, y: d.source.y + config.nodeWidth }, { x: d.target.x, y: d.target.y }))
                .attr("stroke-width", d => Math.max(2, Math.log(d.target.value || 1) * 1.5) + "px")
                .style("opacity", d => activePath.has(d.target) || activePath.has(d.source) ? 1 : 0.2);
            link.exit().remove();

            nodes.forEach(d => { d.x0 = d.x; d.y0 = d.y; });
        }

        function diagonal(s, d) { return "M" + s.y + "," + s.x + "C" + (s.y + d.y) / 2 + "," + s.x + " " + (s.y + d.y) / 2 + "," + d.x + " " + d.y + "," + d.x; }

        function selectNode(d) {
            selectedNode = d;
            const nav = d3.select("#breadcrumb-navigator");
            if (!d) return nav.classed("visible", false);
            nav.classed("visible", true).html("");
            d.ancestors().reverse().forEach((a, i) => {
                if (i > 0) nav.append("span").attr("class", "breadcrumb-separator").text("›");
                nav.append("span").attr("class", "breadcrumb-item").text(a.data.name).on("click", (e) => { e.stopPropagation(); window.focusNodeById(a.id); });
            });
        }

        function zoomIn() { svg.transition().call(zoom.scaleBy, 1.4); }
        function zoomOut() { svg.transition().call(zoom.scaleBy, 0.7); }
        function resetZoom() { 
            const h = document.getElementById('canvas-container').clientHeight;
            svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity.translate(60, h/2).scale(0.7)); 
        }

        init();
    </script>
</body>
</html>`;

    fs.writeFileSync(path.join(process.cwd(), 'index.html'), html);
    console.log('Polished Global Finder Sidebar index.html generated.');
}

run();