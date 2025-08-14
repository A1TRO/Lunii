const Modal = require('./modal-manager.js');

class LoginManager {
    constructor() {
        this.tokenInput = document.getElementById('token-input');
        this.loginBtn = document.getElementById('login-btn');
        this.errorMessage = document.getElementById('error-message');
        this.errorText = document.getElementById('error-text');
        this.saveTokenCheckbox = document.getElementById('save-token-checkbox');
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupWindowControls();
        this.tokenInput.focus();
        
        // Listen for update notifications
        this.setupUpdateListeners();
    }

    setupEventListeners() {
        // Token input validation
        this.tokenInput.addEventListener('input', () => {
            const token = this.tokenInput.value.trim();
            this.loginBtn.disabled = !this.isValidTokenFormat(token);
            this.hideError();
        });

        // Enter key to login
        this.tokenInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.loginBtn.disabled) {
                this.handleLogin();
            }
        });

        // Login button
        this.loginBtn.addEventListener('click', () => {
            if (!this.loginBtn.disabled) {
                this.handleLogin();
            }
        });

        // Help link
        document.getElementById('help-link').addEventListener('click', (e) => {
            this.showTokenHelp();
        });
    }

    setupWindowControls() {
        document.getElementById('minimize-btn').addEventListener('click', () => {
            window.electronAPI.minimizeWindow();
        });

        document.getElementById('maximize-btn').addEventListener('click', () => {
            window.electronAPI.maximizeWindow();
        });

        document.getElementById('close-btn').addEventListener('click', () => {
            window.electronAPI.closeWindow();
        });
    }

    isValidTokenFormat(token) {
        if (!token || typeof token !== 'string') return false;
    
        // Discord token: three parts separated by dots
        // Each part: letters, numbers, -, _
        const discordTokenPattern = /^[\w-]+\.[\w-]+\.[\w-]+$/;
        return discordTokenPattern.test(token);
    }
    
    

    async handleLogin() {
        const token = this.tokenInput.value.trim();
        const saveToken = this.saveTokenCheckbox.checked;
        
        if (!this.isValidTokenFormat(token)) {
            this.showError('Invalid token format');
            return;
        }

        // Show loading state
        this.setLoading(true);
        this.hideError();

        try {
            const result = await window.electronAPI.login(token, saveToken);
            
            if (result.success) {
                // Login successful - main process will handle navigation
                console.log('Login successful');
                console.log('User data:', result.user);
            } else {
                this.showError(result.error || 'Invalid token or login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Connection error. Please check your token and try again.');
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(loading) {
        if (loading) {
            this.loginBtn.classList.add('loading');
            this.loginBtn.disabled = true;
        } else {
            this.loginBtn.classList.remove('loading');
            this.loginBtn.disabled = !this.isValidTokenFormat(this.tokenInput.value.trim());
        }
    }

    showError(message) {
        this.errorText.textContent = message;
        this.errorMessage.classList.add('show');
    }

    hideError() {
        this.errorMessage.classList.remove('show');
    }

    async showTokenHelp() {
        await Modal.alert({
            title: 'How to Get Your Discord Token',
            message: 'Follow these steps to obtain your Discord token:',
            details: `1. Open Discord in your browser
2. Press F12 to open Developer Tools
3. Go to the Network tab
4. Send a message in any channel
5. Look for a request to "messages"
6. In the request headers, find "Authorization"
7. Copy the value after "Authorization: "

⚠️ Warning: Never share your token with others!
Your token gives full access to your Discord account.`,
            type: 'warning',
            confirmText: 'Got it'
        });
    }
    
    setupUpdateListeners() {
        // Listen for update notifications
        window.electronAPI.onUpdateAvailable((event, updateData) => {
            this.showUpdateNotification(updateData);
        });
    }
    
    showUpdateNotification(updateData) {
        Modal.confirm({
            title: 'Update Available',
            message: `Lunii ${updateData.latestVersion} is now available!`,
            details: `You're currently running version ${updateData.currentVersion}. Would you like to download and install the update now?`,
            type: 'info',
            confirmText: 'Update Now',
            cancelText: 'Later'
        }).then(confirmed => {
            if (confirmed) {
                window.electronAPI.invoke('updater-show-update-window');
            } else {
                window.electronAPI.invoke('updater-dismiss-notification');
            }
        });
    }
}

// Initialize login manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LoginManager();
});

// Add some visual feedback for better UX
document.addEventListener('DOMContentLoaded', () => {
    // Add focus animations
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', () => {
            input.parentElement.classList.remove('focused');
        });
    });

    // Add ripple effect to buttons
    const buttons = document.querySelectorAll('.login-btn');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = button.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            button.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
});