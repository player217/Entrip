// Flow Canvas functionality
class FlowCanvas {
    constructor() {
        this.nodes = [];
        this.connections = [];
        this.selectedNode = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.nodeCounter = 0;
    }
    
    init() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="flow-canvas" id="flow-canvas">
                <svg id="connections-svg" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#FF712E" />
                        </marker>
                    </defs>
                </svg>
                <div class="flow-toolbar">
                    <button class="toolbar-button" id="add-node" title="Add Node">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="toolbar-button" id="zoom-in" title="Zoom In">
                        <i class="fas fa-search-plus"></i>
                    </button>
                    <button class="toolbar-button" id="zoom-out" title="Zoom Out">
                        <i class="fas fa-search-minus"></i>
                    </button>
                    <button class="toolbar-button" id="fit-view" title="Fit View">
                        <i class="fas fa-expand"></i>
                    </button>
                    <button class="toolbar-button" id="toggle-grid" title="Toggle Grid">
                        <i class="fas fa-th"></i>
                    </button>
                </div>
                <div class="minimap">
                    <div class="minimap-viewport"></div>
                </div>
            </div>
        `;
        
        this.setupEventListeners();
        this.addSampleNodes();
    }
    
    setupEventListeners() {
        document.getElementById('add-node').addEventListener('click', () => {
            this.addNode();
        });
        
        const canvas = document.getElementById('flow-canvas');
        canvas.addEventListener('mousedown', this.handleCanvasClick.bind(this));
    }
    
    addNode(x = 100, y = 100, title = 'New Node', content = 'Node description') {
        const nodeId = `node-${++this.nodeCounter}`;
        const node = {
            id: nodeId,
            x,
            y,
            title,
            content,
            type: 'default'
        };
        
        this.nodes.push(node);
        this.renderNode(node);
    }
    
    renderNode(node) {
        const canvas = document.getElementById('flow-canvas');
        const nodeEl = document.createElement('div');
        nodeEl.className = 'flow-node';
        nodeEl.id = node.id;
        nodeEl.style.left = `${node.x}px`;
        nodeEl.style.top = `${node.y}px`;
        
        nodeEl.innerHTML = `
            <div class="node-header">
                <span class="node-title">${node.title}</span>
                <i class="fas fa-microchip node-icon"></i>
            </div>
            <div class="node-content">${node.content}</div>
            <div class="node-ports">
                <div class="port input" data-node-id="${node.id}" data-port-type="input"></div>
                <div class="port output" data-node-id="${node.id}" data-port-type="output"></div>
            </div>
        `;
        
        canvas.appendChild(nodeEl);
        
        // Add drag functionality
        nodeEl.addEventListener('mousedown', this.handleNodeMouseDown.bind(this, node));
        
        // Add port connection functionality
        nodeEl.querySelectorAll('.port').forEach(port => {
            port.addEventListener('click', this.handlePortClick.bind(this));
        });
    }
    
    handleNodeMouseDown(node, e) {
        if (e.target.classList.contains('port')) return;
        
        e.stopPropagation();
        this.selectedNode = node;
        this.isDragging = true;
        
        const nodeEl = document.getElementById(node.id);
        nodeEl.classList.add('selected');
        
        const rect = nodeEl.getBoundingClientRect();
        const canvasRect = document.getElementById('flow-canvas').getBoundingClientRect();
        
        this.dragOffset = {
            x: e.clientX - rect.left + canvasRect.left,
            y: e.clientY - rect.top + canvasRect.top
        };
        
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    }
    
    handleMouseMove(e) {
        if (!this.isDragging || !this.selectedNode) return;
        
        const canvasRect = document.getElementById('flow-canvas').getBoundingClientRect();
        const x = e.clientX - canvasRect.left - this.dragOffset.x;
        const y = e.clientY - canvasRect.top - this.dragOffset.y;
        
        this.selectedNode.x = Math.max(0, x);
        this.selectedNode.y = Math.max(0, y);
        
        const nodeEl = document.getElementById(this.selectedNode.id);
        nodeEl.style.left = `${this.selectedNode.x}px`;
        nodeEl.style.top = `${this.selectedNode.y}px`;
        
        this.updateConnections();
    }
    
    handleMouseUp() {
        this.isDragging = false;
        document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    }
    
    handleCanvasClick(e) {
        if (e.target.id === 'flow-canvas') {
            // Deselect all nodes
            document.querySelectorAll('.flow-node').forEach(node => {
                node.classList.remove('selected');
            });
            this.selectedNode = null;
        }
    }
    
    handlePortClick(e) {
        e.stopPropagation();
        console.log('Port clicked:', e.target);
        // Connection logic would go here
    }
    
    updateConnections() {
        // Update SVG connections between nodes
        // This would be implemented with actual connection logic
    }
    
    addSampleNodes() {
        this.addNode(100, 100, 'Data Input', 'Load dataset from CSV');
        this.addNode(350, 100, 'Process', 'Clean and transform data');
        this.addNode(600, 100, 'AI Model', 'Apply machine learning');
        this.addNode(350, 300, 'Visualize', 'Generate charts');
    }
}

window.flowCanvas = new FlowCanvas();
