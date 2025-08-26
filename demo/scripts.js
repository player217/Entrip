// Navigation
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionId).classList.add('active');
    
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.classList.remove('text-sidebar-text-active');
        btn.classList.add('text-sidebar-text');
    });
    event.target.closest('.nav-btn').classList.add('active');
    event.target.closest('.nav-btn').classList.remove('text-sidebar-text');
    event.target.closest('.nav-btn').classList.add('text-sidebar-text-active');
}

// Tab switching
function showTab(tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById('tab-' + tabId).classList.add('active');
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('tab-active');
        btn.classList.remove('text-brand-500');
        btn.classList.add('text-gray-500');
    });
    event.target.classList.add('tab-active');
    event.target.classList.add('text-brand-500');
    event.target.classList.remove('text-gray-500');
}

// Auth
let isAuthenticated = false;
let currentUser = null;

function showLogin() {
    document.getElementById('loginModal').classList.remove('hidden');
}

function hideLogin() {
    document.getElementById('loginModal').classList.add('hidden');
    document.getElementById('loginError').classList.add('hidden');
}

function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (email === 'test@entrip.com' && password === 'password') {
        isAuthenticated = true;
        currentUser = { name: '테스트 사용자', email: email };
        updateAuthStatus();
        hideLogin();
    } else {
        document.getElementById('loginError').textContent = '이메일 또는 비밀번호가 올바르지 않습니다';
        document.getElementById('loginError').classList.remove('hidden');
    }
}

function logout() {
    isAuthenticated = false;
    currentUser = null;
    updateAuthStatus();
}

function updateAuthStatus() {
    const userDropdown = document.getElementById('userDropdown');
    const userName = document.getElementById('userName');
    const userChevron = document.getElementById('userChevron');
    
    if (isAuthenticated && currentUser) {
        userName.textContent = currentUser.name;
        userName.classList.remove('hidden');
        userChevron.classList.remove('hidden');
    } else {
        userName.classList.add('hidden');
        userChevron.classList.add('hidden');
    }
}

function showSettings() {
    alert('설정 메뉴 - 로그아웃 기능 등이 여기 들어갑니다.');
    // 임시로 로그아웃 기능 추가
    if(confirm('로그아웃 하시겠습니까?')) {
        logout();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Set initial active nav button
    const firstNavBtn = document.querySelector('.nav-btn');
    if (firstNavBtn) {
        firstNavBtn.classList.add('active');
        firstNavBtn.classList.remove('text-sidebar-text');
        firstNavBtn.classList.add('text-sidebar-text-active');
    }
});
