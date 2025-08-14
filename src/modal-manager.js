const ModalSystem = require('./modals.js');

class ModalManager {
    constructor() {
        this.modalSystem = null;
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initializeSystem();
            });
        } else {
            this.initializeSystem();
        }
    }
    
    initializeSystem() {
        const ModalSystem = require('./modals.js');
        this.modalSystem = new ModalSystem();
        this.addShakeAnimation();
    }

    addShakeAnimation() {
        if (!document.querySelector('#shake-animation')) {
            const style = document.createElement('style');
            style.id = 'shake-animation';
            style.textContent = `
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
                    20%, 40%, 60%, 80% { transform: translateX(2px); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Proxy methods to the modal system
    alert(options) {
        if (!this.modalSystem) return Promise.resolve(false);
        return this.modalSystem.alert(options);
    }

    confirm(options) {
        if (!this.modalSystem) return Promise.resolve(false);
        return this.modalSystem.confirm(options);
    }

    prompt(options) {
        if (!this.modalSystem) return Promise.resolve(null);
        return this.modalSystem.prompt(options);
    }

    loading(options) {
        if (!this.modalSystem) return { close: () => {}, update: () => {} };
        return this.modalSystem.loading(options);
    }

    toast(options) {
        if (!this.modalSystem) return { close: () => {} };
        return this.modalSystem.toast(options);
    }
}

// Create and export singleton instance
const modalManager = new ModalManager();

module.exports = modalManager;