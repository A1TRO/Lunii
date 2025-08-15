
class SplashManager {
    constructor() {
        this.progressBar = document.getElementById('loading-progress');
        this.loadingText = document.getElementById('loading-text');
        this.quoteElement = document.getElementById('quote');
        this.versionElement = document.getElementById('app-version');
        
        this.quotes = [
            "Initializing Discord connection...",
            "⚡ Loading your servers and channels...",
            "✦ Preparing advanced dashboard...",
            "⧉ Setting up automation features...",
            "✱ Configuring smart notifications...",
            "◆ Welcome to the future of Discord!",
            "✪ Discord, but supercharged.",
            "⊞ Your personal Discord command center.",
            "✧ Enhancing your Discord experience...",
            "⛨ Loading security features...",
            "▣ Preparing analytics dashboard...",
            "◈ Customizing your interface...",
            "⛭ Optimizing performance...",
            "✹ Almost ready to launch!",
            "❖ Lunii - Discord Self-Bot Revolution",
            "✦ Making Discord work for you...",
            "⊹ Loading the magic...",
            "✷ Bringing colors to your Discord...",
            "♬ Tuning up the experience...",
            "Ready for takeoff!"
        ];
        
        
        this.currentQuoteIndex = 0;
        this.progress = 0;
        
        this.init();
    }

    init() {
        this.loadAppVersion();
        this.startLoadingSequence();
        this.setupEventListeners();
    }

    async loadAppVersion() {
        try {
            const version = await window.electronAPI.getAppVersion();
            this.versionElement.textContent = `v${version}`;
        } catch (error) {
            console.error('Error loading app version:', error);
            this.versionElement.textContent = 'v1.0.0';
        }
    }

    setupEventListeners() {
        // Listen for splash progress updates
        window.electronAPI.onSplashProgress((event, data) => {
            this.updateProgress(data.progress, data.message);
        });

        // Listen for splash completion
        window.electronAPI.onSplashComplete((event) => {
            this.completeSplash();
        });
    }

    startLoadingSequence() {
        // Simulate loading process
        this.simulateLoading();
        
        // Start quote rotation
        this.startQuoteRotation();
    }

    simulateLoading() {
        const steps = [
            { progress: 10, message: "Initializing application...", delay: 500 },
            { progress: 25, message: "Loading core modules...", delay: 800 },
            { progress: 40, message: "Setting up Discord client...", delay: 1000 },
            { progress: 60, message: "Configuring user interface...", delay: 700 },
            { progress: 80, message: "Preparing dashboard...", delay: 600 },
            { progress: 95, message: "Finalizing setup...", delay: 500 },
            { progress: 100, message: "Ready to launch!", delay: 300 }
        ];

        let currentStep = 0;

        const executeStep = () => {
            if (currentStep < steps.length) {
                const step = steps[currentStep];
                this.updateProgress(step.progress, step.message);
                
                setTimeout(() => {
                    currentStep++;
                    executeStep();
                }, step.delay);
            } else {
                // Complete after a short delay
                setTimeout(() => {
                    this.completeSplash();
                }, 1000);
            }
        };

        executeStep();
    }

    startQuoteRotation() {
        // Change quote every 2 seconds
        setInterval(() => {
            this.rotateQuote();
        }, 2000);
        
        // Set initial quote
        this.rotateQuote();
    }

    rotateQuote() {
        this.quoteElement.style.opacity = '0';
        
        setTimeout(() => {
            this.quoteElement.textContent = this.quotes[this.currentQuoteIndex];
            this.quoteElement.style.opacity = '1';
            
            this.currentQuoteIndex = (this.currentQuoteIndex + 1) % this.quotes.length;
        }, 150);
    }

    updateProgress(progress, message) {
        this.progress = progress;
        this.progressBar.style.width = `${progress}%`;
        this.loadingText.textContent = message;
    }

    completeSplash() {
        this.updateProgress(100, "Launch complete!");
        
        // Add fade out effect
        setTimeout(() => {
            document.body.classList.add('fade-out');
            
            // Notify main process that splash is complete
            setTimeout(() => {
                if (window.electronAPI) {
                    ipcRenderer.send('splash-complete');
                }
            }, 500);
        }, 500);
    }
}

// Initialize splash manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SplashManager();
});

// Add some visual enhancements
document.addEventListener('DOMContentLoaded', () => {
    // Add floating particles effect
    const createParticle = () => {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: 2px;
            height: 2px;
            background: rgba(79, 70, 229, 0.6);
            border-radius: 50%;
            pointer-events: none;
            animation: float 8s linear infinite;
            left: ${Math.random() * 100}%;
            top: 100%;
            z-index: 1;
        `;
        
        document.body.appendChild(particle);
        
        setTimeout(() => {
            particle.remove();
        }, 8000);
    };

    // Create particles periodically
    setInterval(createParticle, 2000);
    
    // Add CSS for particle animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes float {
            0% {
                transform: translateY(0) rotate(0deg);
                opacity: 0;
            }
            10% {
                opacity: 1;
            }
            90% {
                opacity: 1;
            }
            100% {
                transform: translateY(-100vh) rotate(360deg);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
});