const ModalSystem = require('./modals');

class ModalManager {
    constructor() {
        this.modalSystem = new ModalSystem();
        this.init();
    }

    init() {
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
        return this.modalSystem.alert(options);
    }

    confirm(options) {
        return this.modalSystem.confirm(options);
    }

    prompt(options) {
        return this.modalSystem.prompt(options);
    }

    loading(options) {
        return this.modalSystem.loading(options);
    }

    toast(options) {
        return this.modalSystem.toast(options);
    }
}

// Create and export singleton instance
const modalManager = new ModalManager();

module.exports = modalManager;