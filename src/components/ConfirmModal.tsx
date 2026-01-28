import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'danger' | 'warning' | 'info';
    icon?: React.ReactNode;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    type = 'warning',
    icon,
}) => {
    if (!isOpen) return null;

    const typeStyles = {
        danger: {
            iconBg: 'bg-red-100',
            iconColor: 'text-red-600',
            confirmBg: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
            confirmShadow: 'shadow-red-200',
        },
        warning: {
            iconBg: 'bg-amber-100',
            iconColor: 'text-amber-600',
            confirmBg: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
            confirmShadow: 'shadow-amber-200',
        },
        info: {
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-600',
            confirmBg: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
            confirmShadow: 'shadow-blue-200',
        },
    };

    const styles = typeStyles[type];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn"
                onClick={onCancel}
            />
            
            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
                {/* Close button */}
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X size={20} />
                </button>

                {/* Icon */}
                <div className={`w-14 h-14 ${styles.iconBg} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                    {icon || <AlertTriangle className={`w-7 h-7 ${styles.iconColor}`} />}
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-gray-800 text-center mb-2">
                    {title}
                </h3>
                <p className="text-gray-500 text-center mb-6 text-sm leading-relaxed">
                    {message}
                </p>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all active:scale-[0.98]"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-2.5 px-4 ${styles.confirmBg} text-white rounded-xl font-semibold transition-all shadow-lg ${styles.confirmShadow} active:scale-[0.98]`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
