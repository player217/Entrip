// Main application initialization
document.addEventListener('DOMContentLoaded', () => {
    // Render main components
    renderHeader();
    renderSidebar();
    
    // Initialize tab manager
    window.tabManager.init();
    
    // Set default sidebar state to expanded
    setTimeout(() => {
        document.getElementById('sidebar').classList.add('expanded');
    }, 100);
});
