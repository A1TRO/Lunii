const { ipcRenderer } = require('electron');

class LoginManager {
    constructor() {
        this.tokenInput = document.getElementById('token-input');
        this.loginBtn = document.getElementById('login-btn');
        this.errorMessage = document.getElementById('error-message');
        this.errorText = document.getElementById('error-text');
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupWindowControls();
        this.tokenInput.focus();
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
            e.preventDefault();
            this.showTokenHelp();
        });
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

    isValidTokenFormat(token) {
        // Basic Discord token validation (should be base64-encoded)
        if (!token || token.length < 50) return false;
        
        // Discord tokens usually start with specific patterns
        const tokenPattern = /^[A-Za-z0-9+/]+=*$/;
        return tokenPattern.test(token);
    }

    async handleLogin() {
        const token = this.tokenInput.value.trim();
        
        if (!this.isValidTokenFormat(token)) {
            this.showError('Invalid token format');
            return;
        }

        // Show loading state
        this.setLoading(true);
        this.hideError();

        try {
            const result = await ipcRenderer.invoke('login', token);
            
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

    showTokenHelp() {
        // Create a simple modal or alert with token instructions
        const helpText = `To get your Discord token:

1. Open Discord in your browser
2. Press F12 to open Developer Tools
3. Go to the Network tab
4. Send a message in any channel
5. Look for a request to "messages"
6. In the request headers, find "Authorization"
7. Copy the value after "Authorization: "

⚠️ Warning: Never share your token with others!
Your token gives full access to your Discord account.`;

        // For now, just show an alert. In a full implementation,
        // you'd want a proper modal
        alert(helpText);
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