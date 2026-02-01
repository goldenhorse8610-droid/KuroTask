/**
 * Utility to retry an operation with exponential backoff or simple delay.
 * Focused on handling temporary database connection issues.
 */

export async function withRetry<T>(
    operation: () => Promise<T>,
    options: {
        maxRetries?: number;
        delayMs?: number;
        onRetry?: (error: any, attempt: number) => void;
    } = {}
): Promise<T> {
    const { maxRetries = 3, delayMs = 2000, onRetry } = options;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;

            // List of error codes or messages that should trigger a retry
            // P1001: Can't reach database server
            // P1017: Server has closed the connection
            const isConnectionError =
                error.message?.includes('Can\'t reach database server') ||
                error.message?.includes('P1001') ||
                error.message?.includes('P1017') ||
                error.message?.includes('ECONNRESET') ||
                error.message?.includes('ETIMEDOUT');

            if (!isConnectionError || attempt > maxRetries) {
                throw error;
            }

            if (onRetry) {
                onRetry(error, attempt);
            } else {
                console.warn(`[Retry] Attempt ${attempt} failed: ${error.message}. Retrying in ${delayMs}ms...`);
            }

            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    throw lastError;
}
