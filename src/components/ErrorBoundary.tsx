import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full text-center border border-red-100">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h1>
                        <div className="text-gray-500 mb-6 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100 font-mono text-left overflow-auto max-h-32">
                            {this.state.error?.message || 'An unexpected error occurred.'}
                        </div>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center gap-2 font-medium"
                            >
                                <RefreshCw size={18} />
                                Reload Page
                            </button>
                            <button
                                onClick={() => {
                                    window.location.href = '/';
                                }}
                                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-medium"
                            >
                                Return Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
