import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'loading' | 'warning';

export interface ToastProps {
    message: string;
    type: ToastType;
    isVisible: boolean;
    onClose?: () => void;
    duration?: number; // Auto-close duration in ms (0 = no auto-close)
}

export const Toast: React.FC<ToastProps> = ({ 
    message, 
    type, 
    isVisible, 
    onClose,
    duration = 3000 
}) => {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setShow(true);
            if (duration > 0 && type !== 'loading') {
                const timer = setTimeout(() => {
                    setShow(false);
                    setTimeout(() => onClose?.(), 300);
                }, duration);
                return () => clearTimeout(timer);
            }
        } else {
            setShow(false);
        }
    }, [isVisible, duration, type, onClose]);

    if (!isVisible && !show) return null;

    const styles = {
        success: {
            bg: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
            icon: <CheckCircle className="w-5 h-5" />,
        },
        error: {
            bg: 'bg-gradient-to-r from-red-500 to-red-600',
            icon: <XCircle className="w-5 h-5" />,
        },
        loading: {
            bg: 'bg-gradient-to-r from-blue-500 to-blue-600',
            icon: <Loader2 className="w-5 h-5 animate-spin" />,
        },
        warning: {
            bg: 'bg-gradient-to-r from-amber-500 to-amber-600',
            icon: <AlertCircle className="w-5 h-5" />,
        },
    };

    const { bg, icon } = styles[type];

    return (
        <div className="fixed top-4 right-4 z-[100] pointer-events-none">
            <div 
                className={`
                    pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-white font-medium
                    transform transition-all duration-300 ease-out
                    ${bg}
                    ${show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
                `}
            >
                {icon}
                <span className="text-sm">{message}</span>
                {type !== 'loading' && onClose && (
                    <button 
                        onClick={() => {
                            setShow(false);
                            setTimeout(() => onClose(), 300);
                        }}
                        className="ml-2 p-1 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
};

// Toast context for global usage
interface ToastContextType {
    showToast: (message: string, type: ToastType, duration?: number) => void;
    hideToast: () => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean; duration: number }>({
        message: '',
        type: 'success',
        isVisible: false,
        duration: 3000,
    });

    const showToast = (message: string, type: ToastType, duration = 3000) => {
        setToast({ message, type, isVisible: true, duration });
    };

    const hideToast = () => {
        setToast(prev => ({ ...prev, isVisible: false }));
    };

    return (
        <ToastContext.Provider value={{ showToast, hideToast }}>
            {children}
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={hideToast}
                duration={toast.duration}
            />
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = React.useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
