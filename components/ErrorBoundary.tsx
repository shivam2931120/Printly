import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/Button';
import { AlertTriangle } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
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
                <div className="min-h-screen flex items-center justify-center bg-background p-4 text-center">
                    <div className="max-w-md w-full bg-background-card border border-border rounded-2xl p-8 shadow-2xl">
                        <div className="size-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="size-8 text-red-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2 font-display">Something went wrong</h1>
                        <p className="text-text-muted mb-8 text-sm leading-relaxed">
                            We apologize for the inconvenience. The application encountered an unexpected error.
                        </p>
                        <div className="flex gap-4">
                            <Button
                                onClick={() => window.location.href = '/'}
                                variant="secondary"
                                className="flex-1"
                            >
                                Go Home
                            </Button>
                            <Button
                                onClick={() => window.location.reload()}
                                className="flex-1"
                            >
                                Reload Page
                            </Button>
                        </div>
                        {process.env.NODE_ENV === 'development' && (
                            <div className="mt-8 p-4 bg-black/50 rounded-lg text-left overflow-auto max-h-48 text-xs font-mono text-red-400">
                                {this.state.error?.toString()}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
