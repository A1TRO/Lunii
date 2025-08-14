class SplashScreen {
    constructor() {
        this.quotes = [
            "Connecting to Discord...",
            "Loading your servers...",
            "Preparing dashboard...",
            "Initializing features...",
            "Almost ready...",
            "Welcome to Lunii!",
            "Discord made better.",
            "Your personal Discord assistant.",
            "Enhancing your Discord experience...",
            "Loading automation features...",
            "Preparing command center...",
            "Setting up notifications...",
            "Optimizing performance...",
            "Ready to launch!"
        ];
        
        this.currentQuoteIndex = 0;
        this.progress = 0;
        this.targetProgress = 0;
        
        this.init();
    }

    async init() {
        await this.loadAppVersion();
        this.startQuoteRotation();
        this.startProgressAnimation();
        this.setupEventListeners();
    }

    async loadAppVersion() {
        try {
            const version = await window.electronAPI.getAppVersion();
            document.getElementById('app-version').textContent = `v${version}`;
        } catch (error) {
            console.error('Error loading app version:', error);
        }
    }

    setupEventListeners() {
        window.electronAPI.onSplashProgress((event, data) => {
            this.updateProgress(data.progress, data.message);
        });

        window.electronAPI.onSplashComplete(() => {
            this.completeSplash();
        });
    }

    startQuoteRotation() {
        this.updateQuote();
        setInterval(() => {
            this.updateQuote();
        }, 2000);
    }

    updateQuote() {
        const quoteElement = document.getElementById('quote');
        quoteElement.style.opacity = '0';
        
        setTimeout(() => {
            quoteElement.textContent = this.quotes[this.currentQuoteIndex];
            quoteElement.style.opacity = '1';
            this.currentQuoteIndex = (this.currentQuoteIndex + 1) % this.quotes.length;
        }, 300);
    }

    startProgressAnimation() {
        const animate = () => {
            if (this.progress < this.targetProgress) {
                this.progress += 1;
                this.updateProgressBar();
                requestAnimationFrame(animate);
            }
        };
        animate();
    }

    updateProgress(targetProgress, message) {
        this.targetProgress = Math.min(targetProgress, 100);
        
        if (message) {
            document.getElementById('loading-text').textContent = message;
        }
        
        this.startProgressAnimation();
    }

    updateProgressBar() {
        const progressBar = document.getElementById('loading-progress');
        progressBar.style.width = this.progress + '%';
    }

    completeSplash() {
        this.updateProgress(100, 'Complete!');
        
        setTimeout(() => {
            document.body.classList.add('fade-out');
        }, 1000);
    }
}

// Initialize splash screen when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SplashScreen();
});

// Add some visual enhancements
document.addEventListener('DOMContentLoaded', () => {
    // Add floating animation to logo
    const logo = document.querySelector('.logo-container');
    let floatDirection = 1;
    
    setInterval(() => {
        const currentTransform = logo.style.transform || 'translateY(0px)';
        const currentY = parseFloat(currentTransform.match(/translateY\(([^)]+)px\)/) || [0, 0])[1];
        
        if (currentY >= 5) floatDirection = -1;
        if (currentY <= -5) floatDirection = 1;
        
        logo.style.transform = `translateY(${currentY + (floatDirection * 0.5)}px)`;
    }, 50);
});