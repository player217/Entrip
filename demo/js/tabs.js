// Tab management
class TabManager {
    constructor() {
        this.tabs = [];
        this.activeTabId = null;
        this.tabCounter = 0;
    }
    
    init() {
        this.renderTabContainer();
        this.addTab('Flow Canvas', 'flow', true);
    }
    
    renderTabContainer() {
        const container = document.getElementById('tab-container');
        container.className = 'tab-container';
        this.render();
    }
    
    addTab(title, type, setActive = true) {
        const tabId = `tab-${++this.tabCounter}`;
        const tab = {
            id: tabId,
            title,
            type,
            icon: this.getIconForType(type)
        };
        
        this.tabs.push(tab);
        
        if (setActive) {
            this.activeTabId = tabId;
        }
        
        this.render();
        this.loadTabContent(tabId);
    }
    
    removeTab(tabId) {
        const index = this.tabs.findIndex(tab => tab.id === tabId);
        if (index === -1) return;
        
        this.tabs.splice(index, 1);
        
        if (this.activeTabId === tabId) {
            this.activeTabId = this.tabs.length > 0 ? this.tabs[this.tabs.length - 1].id : null;
        }
        
        this.render();
        if (this.activeTabId) {
            this.loadTabContent(this.activeTabId);
        }
    }
    
    setActiveTab(tabId) {
        this.activeTabId = tabId;
        this.render();
        this.loadTabContent(tabId);
    }
    
    getIconForType(type) {
        const icons = {
            flow: 'fa-project-diagram',
            dashboard: 'fa-th-large',
            nodes: 'fa-cube',
            data: 'fa-database',
            history: 'fa-history',
            templates: 'fa-layer-group'
        };
        return icons[type] || 'fa-file';
    }
    
    render() {
        const container = document.getElementById('tab-container');
        
        const tabsHTML = this.tabs.map(tab => `
            <div class="tab ${tab.id === this.activeTabId ? 'active' : ''}" 
                 data-tab-id="${tab.id}">
                <i class="fas ${tab.icon}"></i>
                <span>${tab.title}</span>
                <span class="tab-close" data-tab-id="${tab.id}">
                    <i class="fas fa-times"></i>
                </span>
            </div>
        `).join('');
        
        container.innerHTML = `
            <div class="tabs-wrapper">
                ${tabsHTML}
                <button class="add-tab-button" id="add-tab">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        `;
        
        // Add event listeners
        container.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                if (!e.target.closest('.tab-close')) {
                    this.setActiveTab(tab.getAttribute('data-tab-id'));
                }
            });
        });
        
        container.querySelectorAll('.tab-close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeTab(closeBtn.getAttribute('data-tab-id'));
            });
        });
        
        document.getElementById('add-tab').addEventListener('click', () => {
            this.addTab('New Flow', 'flow');
        });
    }
    
    loadTabContent(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;
        
        const mainContent = document.getElementById('main-content');
        
        switch (tab.type) {
            case 'flow':
                window.flowCanvas.init();
                break;
            case 'dashboard':
                mainContent.innerHTML = '<div class="p-6"><h2>Dashboard Content</h2></div>';
                break;
            case 'nodes':
                mainContent.innerHTML = '<div class="p-6"><h2>Node Library</h2></div>';
                break;
            case 'data':
                mainContent.innerHTML = '<div class="p-6"><h2>Data Sources</h2></div>';
                break;
            case 'history':
                mainContent.innerHTML = '<div class="p-6"><h2>History</h2></div>';
                break;
            case 'templates':
                mainContent.innerHTML = '<div class="p-6"><h2>Templates</h2></div>';
                break;
            default:
                mainContent.innerHTML = '<div class="p-6"><h2>Content</h2></div>';
        }
    }
}

window.tabManager = new TabManager();
