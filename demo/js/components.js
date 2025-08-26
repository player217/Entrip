// Component rendering functions
function renderHeader() {
    const headerHTML = `
        <header class="header">
            <div class="header-content">
                <div class="logo-section">
                    <img src="public/logo.png" alt="Entrip" class="logo">
                    <span class="logo-text">Entrip</span>
                </div>
                <div class="header-actions">
                    <button class="icon-button">
                        <i class="fas fa-search"></i>
                    </button>
                    <button class="icon-button">
                        <i class="fas fa-bell"></i>
                    </button>
                    <button class="icon-button">
                        <i class="fas fa-cog"></i>
                    </button>
                    <div class="user-avatar">U</div>
                </div>
            </div>
        </header>
    `;
    document.getElementById('header-container').innerHTML = headerHTML;
}

function renderSidebar() {
    const sidebarHTML = `
        <aside class="sidebar" id="sidebar">
            <nav class="nav-section">
                <div class="nav-item active" data-page="flow">
                    <i class="fas fa-project-diagram nav-icon"></i>
                    <span class="nav-label">Flow Canvas</span>
                </div>
                <div class="nav-item" data-page="dashboard">
                    <i class="fas fa-th-large nav-icon"></i>
                    <span class="nav-label">Dashboard</span>
                </div>
                <div class="nav-item" data-page="nodes">
                    <i class="fas fa-cube nav-icon"></i>
                    <span class="nav-label">Node Library</span>
                </div>
                <div class="nav-item" data-page="data">
                    <i class="fas fa-database nav-icon"></i>
                    <span class="nav-label">Data Sources</span>
                </div>
                <div class="nav-divider"></div>
                <div class="nav-item" data-page="history">
                    <i class="fas fa-history nav-icon"></i>
                    <span class="nav-label">History</span>
                </div>
                <div class="nav-item" data-page="templates">
                    <i class="fas fa-layer-group nav-icon"></i>
                    <span class="nav-label">Templates</span>
                </div>
            </nav>
            <div class="nav-bottom">
                <div class="nav-item" id="toggle-sidebar">
                    <i class="fas fa-bars nav-icon"></i>
                    <span class="nav-label">Collapse</span>
                </div>
            </div>
        </aside>
    `;
    document.getElementById('sidebar-container').innerHTML = sidebarHTML;
    
    // Add sidebar toggle functionality
    document.getElementById('toggle-sidebar').addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('expanded');
    });
    
    // Add navigation functionality
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all items
            document.querySelectorAll('.nav-item').forEach(navItem => {
                navItem.classList.remove('active');
            });
            // Add active class to clicked item
            item.classList.add('active');
            
            // Handle page navigation
            const page = item.getAttribute('data-page');
            window.tabManager.addTab(page.charAt(0).toUpperCase() + page.slice(1), page);
        });
    });
}
