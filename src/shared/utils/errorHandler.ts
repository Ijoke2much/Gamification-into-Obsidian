import { Notice } from 'obsidian';
import { showGameNotice } from './noticeUtils';

export interface ErrorHandlerOptions {
    showNotice?: boolean;
    noticeMessage?: string;
    noticeTimeout?: number;
    logError?: boolean;
    context?: string;
    fallbackValue?: any;
    rethrow?: boolean;
}

/**
 * Enhanced error handler with configurable options
 */
export function handleError<T = any>(
    error: Error | unknown,
    options: ErrorHandlerOptions = {}
): T | null {
    const {
        showNotice = true,
        noticeMessage,
        noticeTimeout = 5000,
        logError = true,
        context = 'Operation',
        fallbackValue = null,
        rethrow = false
    } = options;

    const errorMessage = error instanceof Error ? error.message : String(error);
    const displayMessage = noticeMessage || `${context} failed: ${errorMessage}`;

    // Log the error if enabled
    if (logError) {
        const logMessage = context ? `[${context}]` : '[Error Handler]';
        console.error(logMessage, error);
    }

    // Show user notification if enabled
    if (showNotice) {
        // Use centralized notice helper so errors stay visible until clicked.
        showGameNotice(displayMessage, noticeTimeout);
    }

    // Rethrow if requested
    if (rethrow) {
        throw error;
    }

    return fallbackValue;
}

/**
 * Async wrapper that catches and handles errors with optional retry logic
 */
export async function safeAsync<T>(
    operation: () => Promise<T>,
    options: ErrorHandlerOptions & {
        retries?: number;
        retryDelay?: number;
    } = {}
): Promise<T | null> {
    const { retries = 0, retryDelay = 1000, ...errorOptions } = options;

    let lastError: Error;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // If this is not the last attempt, wait before retrying
            if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                continue;
            }
        }
    }

    // All attempts failed, handle the final error
    return handleError(lastError!, {
        ...errorOptions,
        context: options.context || 'Async operation'
    });
}

/**
 * Higher-order function that wraps async functions with error handling
 */
export function withErrorHandling<TArgs extends any[], TReturn>(
    fn: (...args: TArgs) => Promise<TReturn>,
    options: ErrorHandlerOptions = {}
) {
    return async (...args: TArgs): Promise<TReturn | null> => {
        try {
            return await fn(...args);
        } catch (error) {
            return handleError(error, {
                context: fn.name || 'Function',
                ...options
            });
        }
    };
}

/**
 * Promise utility that adds timeout and error handling
 */
export async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    options: ErrorHandlerOptions & {
        timeoutMessage?: string;
    } = {}
): Promise<T | null> {
    const { timeoutMessage = 'Operation timed out', ...errorOptions } = options;

    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } catch (error) {
        return handleError(error, {
            context: 'Timed operation',
            ...errorOptions
        });
    }
}

/**
 * File operation error handler with specific error types
 */
export function handleFileError(
    error: Error | unknown,
    operation: string,
    fileName?: string
) {
    const context = fileName ? `${operation} (${fileName})` : operation;

    let userMessage = `Failed to ${operation.toLowerCase()}`;
    if (fileName) {
        userMessage += ` file: ${fileName}`;
    }

    // Check for specific error types
    if (error instanceof Error) {
        if (error.message.includes('ENOENT') || error.message.includes('not found')) {
            userMessage = fileName ? `File not found: ${fileName}` : 'File not found';
        } else if (error.message.includes('EACCES') || error.message.includes('permission')) {
            userMessage = 'Permission denied. Check file permissions.';
        } else if (error.message.includes('EMFILE') || error.message.includes('too many files')) {
            userMessage = 'Too many files open. Please close some files and try again.';
        }
    }

    return handleError(error, {
        context,
        noticeMessage: userMessage,
        logError: true
    });
}

/**
 * Network/API error handler
 */
export function handleNetworkError(
    error: Error | unknown,
    endpoint?: string
) {
    const context = endpoint ? `API call to ${endpoint}` : 'Network request';

    let userMessage = 'Network request failed';

    if (error instanceof Error) {
        if (error.message.includes('fetch')) {
            userMessage = 'Unable to connect. Check your internet connection.';
        } else if (error.message.includes('timeout')) {
            userMessage = 'Request timed out. Please try again.';
        } else if (error.message.includes('404')) {
            userMessage = 'Resource not found.';
        } else if (error.message.includes('401') || error.message.includes('403')) {
            userMessage = 'Access denied. Check your permissions.';
        } else if (error.message.includes('500')) {
            userMessage = 'Server error. Please try again later.';
        }
    }

    return handleError(error, {
        context,
        noticeMessage: userMessage,
        logError: true
    });
}

/**
 * Data validation error handler
 */
export function handleValidationError(
    error: Error | unknown,
    field?: string
) {
    const context = field ? `Validation (${field})` : 'Data validation';
    const userMessage = field ?
        `Invalid ${field}. Please check your input.` :
        'Invalid data. Please check your input.';

    return handleError(error, {
        context,
        noticeMessage: userMessage,
        logError: true
    });
}

/**
 * Generic error boundary for React components
 */
export class ComponentErrorHandler {
    private static instance: ComponentErrorHandler;

    static getInstance(): ComponentErrorHandler {
        if (!ComponentErrorHandler.instance) {
            ComponentErrorHandler.instance = new ComponentErrorHandler();
        }
        return ComponentErrorHandler.instance;
    }

    handleComponentError(
        error: Error,
        errorInfo: any,
        componentName?: string
    ) {
        const context = componentName ? `React Component (${componentName})` : 'React Component';

        console.error(`[${context}]:`, error, errorInfo);

        showGameNotice(
            `Component error in ${componentName || 'unknown component'}. Please refresh the tab.`,
            5000
        );
    }
}

export const componentErrorHandler = ComponentErrorHandler.getInstance();
