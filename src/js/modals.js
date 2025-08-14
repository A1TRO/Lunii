class ModalSystem {
    constructor() {
        this.activeModals = new Set();
        this.toastContainer = null;
        this.toastQueue = [];
        this.maxToasts = 5;
        
        this.init();
    }

    init() {
        this.createToastContainer();
        this.setupKeyboardHandlers();
    }

    createToastContainer() {
        this.toastContainer = document.createElement('div');
        this.toastContainer.className = 'toast-container';
        document.body.appendChild(this.toastContainer);
    }

    setupKeyboardHandlers() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeTopModal();
            }
        });
    }

    // Alert Modal
    alert(options) {
        return new Promise((resolve) => {
            const {
                title = 'Alert',
                message = '',
                details = '',
                type = 'info',
                confirmText = 'OK'
            } = options;

            const modal = this.createModal({
                title,
                message,
                details,
                type,
                actions: [
                    {
                        text: confirmText,
                        type: 'primary',
                        action: () => {
                            this.closeModal(modal);
                            resolve(true);
                        }
                    }
                ]
            });

            this.showModal(modal);
        });
    }

    // Confirm Modal
    confirm(options) {
        return new Promise((resolve) => {
            const {
                title = 'Confirm',
                message = '',
                details = '',
                type = 'question',
                confirmText = 'Confirm',
                cancelText = 'Cancel',
                danger = false
            } = options;

            const modal = this.createModal({
                title,
                message,
                details,
                type,
                actions: [
                    {
                        text: cancelText,
                        type: 'secondary',
                        action: () => {
                            this.closeModal(modal);
                            resolve(false);
                        }
                    },
                    {
                        text: confirmText,
                        type: danger ? 'danger' : 'primary',
                        action: () => {
                            this.closeModal(modal);
                            resolve(true);
                        }
                    }
                ]
            });

            this.showModal(modal);
        });
    }

    // Prompt Modal
    prompt(options) {
        return new Promise((resolve) => {
            const {
                title = 'Input Required',
                message = '',
                placeholder = '',
                defaultValue = '',
                type = 'question',
                confirmText = 'OK',
                cancelText = 'Cancel',
                multiline = false,
                required = false
            } = options;

            const modal = this.createModal({
                title,
                message,
                type,
                input: {
                    placeholder,
                    defaultValue,
                    multiline,
                    required
                },
                actions: [
                    {
                        text: cancelText,
                        type: 'secondary',
                        action: () => {
                            this.closeModal(modal);
                            resolve(null);
                        }
                    },
                    {
                        text: confirmText,
                        type: 'primary',
                        action: () => {
                            const input = modal.querySelector(multiline ? '.modal-textarea' : '.modal-input');
                            const value = input.value.trim();
                            
                            if (required && !value) {
                                this.shake(input);
                                input.focus();
                                return;
                            }
                            
                            this.closeModal(modal);
                            resolve(value || null);
                        }
                    }
                ]
            });

            this.showModal(modal);
            
            // Focus input after modal is shown
            setTimeout(() => {
                const input = modal.querySelector(multiline ? '.modal-textarea' : '.modal-input');
                if (input) {
                    input.focus();
                    if (defaultValue) {
                        input.select();
                    }
                }
            }, 100);
        });
    }

    // Loading Modal
    loading(options) {
        const {
            title = 'Loading...',
            message = 'Please wait...',
            cancellable = false
        } = options;

        const modal = this.createModal({
            title,
            message,
            type: 'info',
            loading: true,
            actions: cancellable ? [
                {
                    text: 'Cancel',
                    type: 'secondary',
                    action: () => {
                        this.closeModal(modal);
                        return 'cancelled';
                    }
                }
            ] : []
        });

        this.showModal(modal);
        
        return {
            close: () => this.closeModal(modal),
            update: (newMessage) => {
                const messageEl = modal.querySelector('.modal-message');
                if (messageEl) messageEl.textContent = newMessage;
            }
        };
    }

    // Toast Notifications
    toast(options) {
        const {
            title = '',
            message = '',
            type = 'info',
            duration = 5000,
            persistent = false
        } = options;

        const toast = this.createToast({
            title,
            message,
            type,
            duration,
            persistent
        });

        this.showToast(toast, duration);
        
        return {
            close: () => this.closeToast(toast)
        };
    }

    // Create Modal Element
    createModal(options) {
        const {
            title,
            message,
            details,
            type,
            input,
            loading,
            actions = []
        } = options;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'modal';

        // Header
        const header = document.createElement('div');
        header.className = 'modal-header';

        const icon = document.createElement('div');
        icon.className = `modal-icon ${type}`;
        icon.innerHTML = this.getModalIcon(type);

        const titleEl = document.createElement('div');
        titleEl.className = 'modal-title';
        titleEl.textContent = title;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close';
        closeBtn.innerHTML = '×';
        closeBtn.onclick = () => this.closeModal(overlay);

        header.appendChild(icon);
        header.appendChild(titleEl);
        if (!loading) header.appendChild(closeBtn);

        // Content
        const content = document.createElement('div');
        content.className = 'modal-content';

        if (loading) {
            const loadingContent = document.createElement('div');
            loadingContent.style.display = 'flex';
            loadingContent.style.alignItems = 'center';
            loadingContent.innerHTML = `
                <div class="modal-spinner"></div>
                <span>${message}</span>
            `;
            content.appendChild(loadingContent);
        } else {
            if (message) {
                const messageEl = document.createElement('div');
                messageEl.className = 'modal-message';
                messageEl.textContent = message;
                content.appendChild(messageEl);
            }

            if (details) {
                const detailsEl = document.createElement('div');
                detailsEl.className = 'modal-details';
                detailsEl.textContent = details;
                content.appendChild(detailsEl);
            }

            if (input) {
                const inputEl = document.createElement(input.multiline ? 'textarea' : 'input');
                inputEl.className = input.multiline ? 'modal-textarea' : 'modal-input';
                inputEl.placeholder = input.placeholder;
                inputEl.value = input.defaultValue;
                
                if (!input.multiline) {
                    inputEl.type = 'text';
                    inputEl.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            const primaryBtn = modal.querySelector('.modal-btn-primary');
                            if (primaryBtn) primaryBtn.click();
                        }
                    });
                }
                
                content.appendChild(inputEl);
            }
        }

        // Actions
        if (actions.length > 0) {
            const actionsEl = document.createElement('div');
            actionsEl.className = 'modal-actions';

            actions.forEach(action => {
                const btn = document.createElement('button');
                btn.className = `modal-btn modal-btn-${action.type}`;
                btn.textContent = action.text;
                btn.onclick = action.action;
                actionsEl.appendChild(btn);
            });

            modal.appendChild(header);
            modal.appendChild(content);
            modal.appendChild(actionsEl);
        } else {
            modal.appendChild(header);
            modal.appendChild(content);
        }

        overlay.appendChild(modal);
        
        // Click outside to close (except for loading modals)
        if (!loading) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.closeModal(overlay);
                }
            });
        }

        return overlay;
    }

    // Create Toast Element
    createToast(options) {
        const { title, message, type, persistent } = options;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icon = document.createElement('div');
        icon.className = `toast-icon ${type}`;
        icon.innerHTML = this.getToastIcon(type);

        const content = document.createElement('div');
        content.className = 'toast-content';

        if (title) {
            const titleEl = document.createElement('div');
            titleEl.className = 'toast-title';
            titleEl.textContent = title;
            content.appendChild(titleEl);
        }

        const messageEl = document.createElement('div');
        messageEl.className = 'toast-message';
        messageEl.textContent = message;
        content.appendChild(messageEl);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.innerHTML = '×';
        closeBtn.onclick = () => this.closeToast(toast);

        toast.appendChild(icon);
        toast.appendChild(content);
        if (persistent) toast.appendChild(closeBtn);

        if (!persistent) {
            const progress = document.createElement('div');
            progress.className = 'toast-progress';
            toast.appendChild(progress);
        }

        return toast;
    }

    // Show Modal
    showModal(modal) {
        document.body.appendChild(modal);
        this.activeModals.add(modal);
        
        // Trigger animation
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
    }

    // Close Modal
    closeModal(modal) {
        modal.classList.remove('show');
        this.activeModals.delete(modal);
        
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }

    // Close Top Modal
    closeTopModal() {
        if (this.activeModals.size > 0) {
            const modals = Array.from(this.activeModals);
            const topModal = modals[modals.length - 1];
            this.closeModal(topModal);
        }
    }

    // Show Toast
    showToast(toast, duration) {
        // Remove oldest toast if at limit
        const existingToasts = this.toastContainer.children;
        if (existingToasts.length >= this.maxToasts) {
            this.closeToast(existingToasts[0]);
        }

        this.toastContainer.appendChild(toast);
        
        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto-close if not persistent
        if (duration > 0) {
            const progress = toast.querySelector('.toast-progress');
            if (progress) {
                progress.style.width = '100%';
                progress.style.transitionDuration = duration + 'ms';
                
                requestAnimationFrame(() => {
                    progress.style.width = '0%';
                });
            }

            setTimeout(() => {
                this.closeToast(toast);
            }, duration);
        }
    }

    // Close Toast
    closeToast(toast) {
        toast.classList.add('hide');
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 400);
    }

    // Utility Methods
    shake(element) {
        element.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            element.style.animation = '';
        }, 500);
    }

    getModalIcon(type) {
        const icons = {
            info: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2" fill="none"/><path d="M10 14V10M10 6V6.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
            success: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2" fill="none"/><path d="M6 10L8.5 12.5L14 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
            warning: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M10 8V12M10 16V16.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
            error: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2" fill="none"/><path d="M10 6V10M10 14V14.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
            question: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2" fill="none"/><path d="M7.5 7.5C7.5 6.12 8.62 5 10 5S12.5 6.12 12.5 7.5C12.5 8.88 10 9.5 10 12M10 16V16.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
        };
        return icons[type] || icons.info;
    }

    getToastIcon(type) {
        const icons = {
            info: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" fill="none"/><path d="M8 11V8M8 5V5.01" stroke="currentColor" stroke-linecap="round"/></svg>',
            success: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" fill="none"/><path d="M5 8L7 10L11 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
            warning: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6.86 2.877a1.5 1.5 0 0 1 2.28 0l4.817 5.817A1.5 1.5 0 0 1 12.817 11H3.183a1.5 1.5 0 0 1-1.14-2.506L6.86 2.877z" stroke="currentColor" fill="none"/><path d="M8 5V7M8 9V9.01" stroke="currentColor" stroke-linecap="round"/></svg>',
            error: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" fill="none"/><path d="M8 4V8M8 12V12.01" stroke="currentColor" stroke-linecap="round"/></svg>'
        };
        return icons[type] || icons.info;
    }
}

// Create global instance
window.Modal = new ModalSystem();

// Add shake animation to CSS if not present
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

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalSystem;
}