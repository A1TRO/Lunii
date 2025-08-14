class ModalSystem {
    constructor() {
        this.activeModals = new Set();
        this.toastContainer = null;
        this.toastQueue = [];
        this.maxToasts = 5;
        this.modalContainer = null;
        
        // Initialize immediately if DOM is ready, otherwise wait
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        if (this.toastContainer) return; // Already initialized
        this.createContainers();
        this.setupKeyboardHandlers();
        this.injectStyles();
    }

    createContainers() {
        // Remove existing containers if they exist
        const existingToast = document.querySelector('.toast-container');
        const existingModal = document.querySelector('.modal-container');
        
        if (existingToast) existingToast.remove();
        if (existingModal) existingModal.remove();
        
        // Create toast container
        this.toastContainer = document.createElement('div');
        this.toastContainer.className = 'toast-container';
        document.body.appendChild(this.toastContainer);
        
        // Create modal container
        this.modalContainer = document.createElement('div');
        this.modalContainer.className = 'modal-container';
        document.body.appendChild(this.modalContainer);
    }

    injectStyles() {
        if (document.querySelector('#modal-system-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'modal-system-styles';
        style.textContent = `
            /* Modal Container */
            .modal-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 10000;
            }
            
            /* Modal Overlay */
            .modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                pointer-events: auto;
            }

            .modal-overlay.show {
                opacity: 1;
                visibility: visible;
            }

            /* Modal */
            .modal {
                background: rgba(15, 23, 42, 0.98);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 16px;
                padding: 24px;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                transform: scale(0.9) translateY(20px);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
                position: relative;
            }

            .modal-overlay.show .modal {
                transform: scale(1) translateY(0);
            }

            /* Modal Header */
            .modal-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 20px;
                padding-bottom: 16px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .modal-icon {
                width: 32px;
                height: 32px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .modal-icon.info {
                background: rgba(59, 130, 246, 0.2);
                color: #3b82f6;
            }

            .modal-icon.success {
                background: rgba(34, 197, 94, 0.2);
                color: #22c55e;
            }

            .modal-icon.warning {
                background: rgba(245, 158, 11, 0.2);
                color: #f59e0b;
            }

            .modal-icon.error {
                background: rgba(239, 68, 68, 0.2);
                color: #ef4444;
            }

            .modal-icon.question {
                background: rgba(124, 58, 237, 0.2);
                color: #7c3aed;
            }

            .modal-title {
                font-size: 18px;
                font-weight: 600;
                color: #ffffff;
                flex: 1;
                font-family: 'Inter', sans-serif;
            }

            .modal-close {
                width: 32px;
                height: 32px;
                border: none;
                background: rgba(255, 255, 255, 0.1);
                color: rgba(255, 255, 255, 0.6);
                border-radius: 8px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                font-size: 18px;
            }

            .modal-close:hover {
                background: rgba(255, 255, 255, 0.2);
                color: #ffffff;
            }

            /* Modal Content */
            .modal-content {
                margin-bottom: 24px;
            }

            .modal-message {
                font-size: 15px;
                line-height: 1.6;
                color: rgba(255, 255, 255, 0.9);
                margin-bottom: 16px;
                font-family: 'Inter', sans-serif;
            }

            .modal-details {
                font-size: 13px;
                color: rgba(255, 255, 255, 0.7);
                background: rgba(255, 255, 255, 0.05);
                padding: 12px 16px;
                border-radius: 8px;
                border-left: 3px solid rgba(79, 70, 229, 0.5);
                white-space: pre-wrap;
                font-family: 'Inter', sans-serif;
            }

            /* Modal Input */
            .modal-input, .modal-textarea {
                width: 100%;
                background: rgba(15, 23, 42, 0.8);
                border: 2px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                padding: 12px 16px;
                font-size: 14px;
                color: #ffffff;
                transition: all 0.3s ease;
                font-family: 'Inter', sans-serif;
                margin-bottom: 16px;
            }

            .modal-input {
                height: 44px;
            }

            .modal-textarea {
                min-height: 80px;
                resize: vertical;
            }

            .modal-input::placeholder, .modal-textarea::placeholder {
                color: rgba(255, 255, 255, 0.5);
            }

            .modal-input:focus, .modal-textarea:focus {
                outline: none;
                border-color: rgba(79, 70, 229, 0.6);
                box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
            }

            /* Modal Actions */
            .modal-actions {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }

            .modal-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s ease;
                font-family: 'Inter', sans-serif;
                min-width: 80px;
                position: relative;
                overflow: hidden;
            }

            .modal-btn-primary {
                background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
                color: #ffffff;
            }

            .modal-btn-primary:hover {
                transform: translateY(-1px);
                box-shadow: 0 8px 25px rgba(79, 70, 229, 0.4);
            }

            .modal-btn-secondary {
                background: rgba(255, 255, 255, 0.1);
                color: rgba(255, 255, 255, 0.9);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }

            .modal-btn-secondary:hover {
                background: rgba(255, 255, 255, 0.2);
                color: #ffffff;
            }

            .modal-btn-danger {
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                color: #ffffff;
            }

            .modal-btn-danger:hover {
                transform: translateY(-1px);
                box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4);
            }

            /* Loading Spinner */
            .modal-spinner {
                width: 20px;
                height: 20px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-top: 2px solid #ffffff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-right: 8px;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            /* Toast System */
            .toast-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10001;
                display: flex;
                flex-direction: column;
                gap: 12px;
                max-width: 400px;
                pointer-events: none;
            }

            .toast {
                background: rgba(15, 23, 42, 0.98);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 12px;
                padding: 16px;
                display: flex;
                align-items: flex-start;
                gap: 12px;
                transform: translateX(100%);
                opacity: 0;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
                pointer-events: auto;
                position: relative;
                overflow: hidden;
            }

            .toast.show {
                transform: translateX(0);
                opacity: 1;
            }

            .toast.hide {
                transform: translateX(100%);
                opacity: 0;
            }

            .toast-icon {
                width: 24px;
                height: 24px;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .toast-icon.info {
                background: rgba(59, 130, 246, 0.2);
                color: #3b82f6;
            }

            .toast-icon.success {
                background: rgba(34, 197, 94, 0.2);
                color: #22c55e;
            }

            .toast-icon.warning {
                background: rgba(245, 158, 11, 0.2);
                color: #f59e0b;
            }

            .toast-icon.error {
                background: rgba(239, 68, 68, 0.2);
                color: #ef4444;
            }

            .toast-content {
                flex: 1;
            }

            .toast-title {
                font-size: 14px;
                font-weight: 600;
                color: #ffffff;
                margin-bottom: 4px;
                font-family: 'Inter', sans-serif;
            }

            .toast-message {
                font-size: 13px;
                color: rgba(255, 255, 255, 0.8);
                line-height: 1.4;
                font-family: 'Inter', sans-serif;
            }

            .toast-close {
                width: 20px;
                height: 20px;
                border: none;
                background: none;
                color: rgba(255, 255, 255, 0.5);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.2s ease;
                font-size: 16px;
            }

            .toast-close:hover {
                background: rgba(255, 255, 255, 0.1);
                color: rgba(255, 255, 255, 0.8);
            }

            /* Progress Bar */
            .toast-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
                border-radius: 0 0 12px 12px;
                transition: width linear;
            }

            .toast.info .toast-progress {
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            }

            .toast.success .toast-progress {
                background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            }

            .toast.warning .toast-progress {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            }

            .toast.error .toast-progress {
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            }

            /* Shake Animation */
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
                20%, 40%, 60%, 80% { transform: translateX(3px); }
            }

            .shake {
                animation: shake 0.5s ease-in-out;
            }

            /* Responsive Design */
            @media (max-width: 768px) {
                .modal {
                    margin: 20px;
                    padding: 20px;
                    max-width: none;
                    width: calc(100% - 40px);
                }
                
                .toast-container {
                    top: 10px;
                    right: 10px;
                    left: 10px;
                    max-width: none;
                }
                
                .modal-actions {
                    flex-direction: column-reverse;
                }
                
                .modal-btn {
                    width: 100%;
                    justify-content: center;
                }
            }
        `;
        document.head.appendChild(style);
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
                <span class="modal-message">${message}</span>
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
        this.modalContainer.appendChild(modal);
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
        if (!this.toastContainer) {
            this.createContainers();
        }
        
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
        element.classList.add('shake');
        setTimeout(() => {
            element.classList.remove('shake');
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

// Export the class
module.exports = ModalSystem;