import { QueryClient, QueryFunction } from "@tanstack/react-query";
import logger, { redactSensitiveHeaders } from "./logger";

async function getClerkToken(): Promise<string | null> {
  const clerk = (window as any).Clerk;
  if (!clerk?.session) {
    return null;
  }

  try {
    return await clerk.session.getToken();
  } catch (error) {
    console.warn('[Clerk] Failed to get session token', error);
    return null;
  }
}

async function throwIfResNotOk(res: Response, options?: { silent401?: boolean }) {
  if (!res.ok) {
    // Skip verbose logging for expected 401s during auth checks
    const isExpected401 = res.status === 401 && options?.silent401;

    if (!isExpected401) {
      logger.warn(`[HTTP ERROR] Status: ${res.status} ${res.statusText}`);
      logger.warn(`[HTTP ERROR] URL: ${res.url}`);
      logger.warn(`[HTTP ERROR] Headers:`, redactSensitiveHeaders(res.headers));
    }
    
    let errorMessage = `HTTP ${res.status}`;
    let errorDetails = null;
    
    try {
      // Clone response to safely attempt multiple parsing strategies
      const clonedRes = res.clone();
      
      // Strategy 1: Try to parse as JSON (structured error responses)
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        if (!isExpected401) {
          logger.debug('[HTTP ERROR] Attempting JSON parsing...');
        }
        try {
          const errorData = await res.json();
          if (!isExpected401) {
            logger.debug('[HTTP ERROR] JSON parsed successfully:', errorData);
          }
          
          // Extract error message with multiple fallbacks
          if (typeof errorData === 'object' && errorData !== null) {
            errorMessage = errorData.message || errorData.error || errorData.details || res.statusText;
            errorDetails = errorData;
          } else if (typeof errorData === 'string') {
            errorMessage = errorData;
          }
        } catch (jsonError) {
          if (!isExpected401) {
            logger.warn('[HTTP ERROR] JSON parsing failed:', jsonError);
          }
          throw jsonError; // Let it fall through to text parsing
        }
      } else {
        if (!isExpected401) {
          logger.debug('[HTTP ERROR] Non-JSON content type, skipping JSON parsing');
        }
        throw new Error('Not JSON'); // Force text parsing
      }
    } catch (jsonError) {
      // Strategy 2: Parse as text (fallback)
      try {
        if (!isExpected401) {
          logger.debug('[HTTP ERROR] Attempting text parsing...');
        }
        const clonedRes = res.clone();
        const textContent = await clonedRes.text();
        if (!isExpected401) {
          logger.debug('[HTTP ERROR] Text content:', textContent);
        }
        
        if (textContent && textContent.trim()) {
          // Check if it's actually HTML error page
          if (textContent.includes('<html>') || textContent.includes('<!DOCTYPE')) {
            errorMessage = `Server returned HTML error page (${res.status})`;
          } else {
            errorMessage = textContent.trim();
          }
        } else {
          errorMessage = res.statusText || `HTTP ${res.status} with empty response`;
        }
      } catch (textError) {
        if (!isExpected401) {
          logger.error('[HTTP ERROR] Both JSON and text parsing failed:', textError);
        }
        errorMessage = res.statusText || `HTTP ${res.status} - Unable to parse response`;
      }
    }

    // Create comprehensive error with all available information
    const error = new Error(`${res.status}: ${errorMessage}`);
    (error as any).status = res.status;
    (error as any).statusText = res.statusText;
    (error as any).url = res.url;
    (error as any).details = errorDetails;

    if (!isExpected401) {
      logger.error('[HTTP ERROR] Final error object:', {
        message: error.message,
        status: res.status,
        statusText: res.statusText,
        url: res.url,
        details: errorDetails
      });
    }
    
    throw error;
  }
}

export interface ApiRequestOptions {
  silent401?: boolean;
  timeout?: number; // Timeout in milliseconds (default: 10000ms = 10s)
  retry?: boolean; // Enable retry logic (default: false, only for GET)
  maxRetries?: number; // Maximum retry attempts (default: 3)
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateBackoff(attempt: number, baseDelay: number = 1000): number {
  // Exponential backoff with jitter: base * 2^attempt + random jitter
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 500; // 0-500ms jitter
  return Math.min(exponentialDelay + jitter, 10000); // Cap at 10 seconds
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: ApiRequestOptions
): Promise<Response> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const timeoutMs = options?.timeout ?? 10000; // Default 10s timeout
  const shouldRetry = options?.retry ?? false;
  const maxRetries = options?.maxRetries ?? 3;

  // Skip verbose logging for auth checks that might fail
  const isAuthCheck = url.includes('/api/auth/me') && options?.silent401;

  // Retry logic wrapper (only for GET requests if enabled)
  const canRetry = shouldRetry && method.toUpperCase() === 'GET';
  let lastError: any;

  for (let attempt = 0; attempt <= (canRetry ? maxRetries : 0); attempt++) {
    if (attempt > 0) {
      const backoffDelay = calculateBackoff(attempt - 1);
      if (!isAuthCheck) {
        logger.debug(`[RETRY] Attempt ${attempt}/${maxRetries} after ${backoffDelay}ms backoff`);
      }
      await delay(backoffDelay);
    }

    try {
      if (!isAuthCheck) {
        const retryInfo = attempt > 0 ? ` (Retry ${attempt}/${maxRetries})` : '';
        logger.group(`[HTTP REQUEST ${requestId}${retryInfo}] ${method} ${url}`);
        logger.debug('[REQUEST] Method:', method);
        logger.debug('[REQUEST] URL:', url);
        logger.debug('[REQUEST] Data:', data);
      }

      const headers: Record<string, string> = {};
      if (data) {
        headers["Content-Type"] = "application/json";
      }

      const token = await getClerkToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const requestConfig: RequestInit = {
        method,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      };

      if (!isAuthCheck) {
        logger.debug('[REQUEST] Config:', {
          method: requestConfig.method,
          headers: requestConfig.headers ? redactSensitiveHeaders(headers) : undefined,
          body: requestConfig.body ? 'Present' : 'None',
          timeout: `${timeoutMs}ms`,
        });
      }

      let res: Response;
      try {
        if (!isAuthCheck) {
          logger.debug('[REQUEST] Sending fetch request...');
        }
        res = await fetch(url, requestConfig);
        clearTimeout(timeoutId); // Clear timeout on successful response

        if (!isAuthCheck) {
          logger.debug('[RESPONSE] Received response');
          logger.debug('[RESPONSE] Status:', res.status, res.statusText);
          logger.debug('[RESPONSE] Headers:', redactSensitiveHeaders(res.headers));
          logger.debug('[RESPONSE] OK:', res.ok);
          logger.debug('[RESPONSE] Type:', res.type);
          logger.debug('[RESPONSE] URL:', res.url);
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        // Check if timeout error
        if (fetchError.name === 'AbortError') {
          const timeoutError = new Error(`Request timeout after ${timeoutMs}ms`);
          (timeoutError as any).isTimeout = true;
          throw timeoutError;
        }

        if (!isAuthCheck) {
          logger.error('[REQUEST] Fetch failed:', fetchError);
          logger.error('[REQUEST] Error type:', typeof fetchError);
          logger.error('[REQUEST] Error constructor:', fetchError?.constructor?.name);
          logger.error('[REQUEST] Error message:', fetchError instanceof Error ? fetchError.message : 'Unknown');
          logger.error('[REQUEST] Error stack:', fetchError instanceof Error ? fetchError.stack : 'No stack');
          logger.groupEnd();
        }
        throw fetchError;
      }

      try {
        if (!isAuthCheck) {
          logger.debug('[RESPONSE] Checking response status...');
        }
        await throwIfResNotOk(res, options);
        if (!isAuthCheck) {
          logger.debug('[RESPONSE] Status check passed');
          logger.groupEnd();
        }
        return res; // Success - return response
      } catch (statusError) {
        if (!isAuthCheck) {
          logger.error('[RESPONSE] Status check failed:', statusError);
          logger.error('[RESPONSE] Error type:', typeof statusError);
          logger.error('[RESPONSE] Error constructor:', statusError?.constructor?.name);
          logger.error('[RESPONSE] Error message:', statusError instanceof Error ? statusError.message : 'Unknown');
          logger.error('[RESPONSE] Error properties:', Object.getOwnPropertyNames(statusError));
          logger.groupEnd();
        }

        // Don't retry on client errors (4xx except 429)
        const status = (statusError as any).status;
        if (status >= 400 && status < 500 && status !== 429) {
          throw statusError; // Client error - don't retry
        }

        throw statusError;
      }
    } catch (error) {
      lastError = error;

      // If not retryable or last attempt, throw immediately
      const isLastAttempt = attempt >= maxRetries;
      const isRetryableError = canRetry && (
        (error as any).isTimeout ||
        ((error as any).status >= 500) ||
        ((error as any).status === 429)
      );

      if (!isRetryableError || isLastAttempt) {
        throw error;
      }

      // Otherwise, continue to next retry attempt
      if (!isAuthCheck) {
        logger.warn(`[RETRY] Retryable error encountered:`, error);
      }
    }
  }

  // Should never reach here, but throw last error if we do
  throw lastError;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = await getClerkToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(queryKey.join("/") as string, {
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
