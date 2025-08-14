const { ipcRenderer } = require('electron');

class DashboardManager {
    constructor() {
        this.currentUser = null;
        this.uptime = {
            start: Date.now(),
            days: 0,
            hours: 0,
            minutes: 1,
            seconds: 45
        };
        
        this.init();
    }

    init() {
        this.setupWindowControls();
        this.setupNavigation();
        this.setupUserInterface();
        this.startUptimeCounter();
        this.loadUserData();
    }

    setupWindowControls() {
        document.getElementById('minimize-btn').addEventListener('click', () => {
            ipcRenderer.send('window-minimize');
        });

        document.getElementById('maximize-btn').addEventListener('click', () => {
            ipcRenderer.send('window-maximize');
        });

        document.getElementById('close-btn').addEventListener('click', () => {
            ipcRenderer.send('window-close');
        });
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                // Remove active class from all items
                navItems.forEach(nav => nav.classList.remove('active'));
                
                // Add active class to clicked item
                item.classList.add('active');
                
                // Handle page switching (for future implementation)
                const page = item.dataset.page;
                this.switchPage(page);
            });
        });
    }

    setupUserInterface() {
        // Account switcher
        document.querySelector('.switch-account-btn').addEventListener('click', () => {
            this.showAccountSwitcher();
        });

        // Add account
        document.querySelector('.add-account-btn').addEventListener('click', () => {
            this.addNewAccount();
        });

        // Toggle switches
        this.setupToggles();

        // Notification actions
        this.setupNotifications();
    }

    setupToggles() {
        const discoverableToggle = document.getElementById('discoverable-toggle');
        const privateToggle = document.getElementById('private-toggle');

        discoverableToggle.addEventListener('change', (e) => {
            this.updateSetting('discoverable', e.target.checked);
        });

        privateToggle.addEventListener('change', (e) => {
            this.updateSetting('privateMode', e.target.checked);
        });
    }

    setupNotifications() {
        const notificationActions = document.querySelectorAll('.notification-action');
        
        notificationActions.forEach(action => {
            action.addEventListener('click', (e) => {
                const notificationItem = e.target.closest('.notification-item');
                this.dismissNotification(notificationItem);
            });
        });
    }

    startUptimeCounter() {
        setInterval(() => {
            const now = Date.now();
            const elapsed = Math.floor((now - this.uptime.start) / 1000);
            
            this.uptime.days = Math.floor(elapsed / 86400);
            this.uptime.hours = Math.floor((elapsed % 86400) / 3600);
            this.uptime.minutes = Math.floor((elapsed % 3600) / 60);
            this.uptime.seconds = elapsed % 60;
            
            this.updateUptimeDisplay();
        }, 1000);
    }

    updateUptimeDisplay() {
        document.getElementById('uptime-days').textContent = 
            this.uptime.days.toString().padStart(2, '0');
        document.getElementById('uptime-hours').textContent = 
            this.uptime.hours.toString().padStart(2, '0');
        document.getElementById('uptime-minutes').textContent = 
            this.uptime.minutes.toString().padStart(2, '0');
        document.getElementById('uptime-seconds').textContent = 
            this.uptime.seconds.toString().padStart(2, '0');
    }

    async loadUserData() {
        // Simulate loading user data
        // In a real implementation, this would fetch from Discord API
        const userData = {
            username: 'lunii.user',
            handle: 'lunii_user',
            id: '1068917349593391139',
            avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
            nitro: false,
            servers: 15,
            friends: 1,
            version: '2.4.16',
            commandsUsed: 16
        };

        this.currentUser = userData;
        this.updateUserInterface(userData);
    }

    updateUserInterface(userData) {
        // Update greeting
        document.getElementById('username').textContent = userData.username;
        
        // Update profile section
        document.getElementById('profile-username').textContent = userData.username;
        document.getElementById('profile-handle').textContent = userData.handle;
        document.getElementById('user-id').textContent = userData.id;
        
        // Update avatar
        document.querySelector('.avatar').src = userData.avatar;
        
        // Update stats circles
        this.updateStatCircles(userData.servers, userData.friends);
        
        // Update nitro status
        const nitroStatus = document.querySelector('.status-inactive');
        if (userData.nitro) {
            nitroStatus.textContent = 'Active';
            nitroStatus.className = 'detail-value status-active';
        }
    }

    updateStatCircles(servers, friends) {
        // Update servers circle
        const serversFill = document.querySelector('.servers-fill');
        const serversPercentage = Math.min((servers / 100) * 100, 100);
        serversFill.style.strokeDasharray = `${serversPercentage}, 100`;
        
        // Update friends circle
        const friendsFill = document.querySelector('.friends-fill');
        const friendsPercentage = Math.min((friends / 1000) * 100, 100);
        friendsFill.style.strokeDasharray = `${friendsPercentage}, 100`;
        
        // Update text values
        document.querySelector('.stat-value').textContent = servers;
        document.querySelectorAll('.stat-value')[1].textContent = friends;
    }

    switchPage(page) {
        console.log(`Switching to page: ${page}`);
        // This would handle switching between different views
        // For now, just log the page change
    }

    showAccountSwitcher() {
        // This would show a dropdown or modal with available accounts
        console.log('Show account switcher');
    }

    addNewAccount() {
        // This would trigger the login flow for a new account
        ipcRenderer.send('logout');
    }

    updateSetting(setting, value) {
        console.log(`Setting ${setting} to ${value}`);
        // This would save the setting to storage and possibly send to main process
    }

    dismissNotification(notificationItem) {
        notificationItem.style.opacity = '0';
        notificationItem.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
            notificationItem.remove();
        }, 300);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DashboardManager();
});

// Add smooth scrolling for notifications
document.addEventListener('DOMContentLoaded', () => {
    const notificationsList = document.querySelector('.notifications-list');
    
    // Add scroll behavior
    if (notificationsList) {
        notificationsList.style.scrollBehavior = 'smooth';
    }
    
    // Add hover effects for interactive elements
    const interactiveElements = document.querySelectorAll('.nav-item, .toggle-switch, .notification-action');
    
    interactiveElements.forEach(element => {
        element.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.05)';
        });
        
        element.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });
});