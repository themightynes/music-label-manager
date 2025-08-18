import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    console.warn(`[HTTP ERROR] Status: ${res.status} ${res.statusText}`);
    console.warn(`[HTTP ERROR] URL: ${res.url}`);
    console.warn(`[HTTP ERROR] Headers:`, Object.fromEntries(res.headers.entries()));
    
    let errorMessage = `HTTP ${res.status}`;
    let errorDetails = null;
    
    try {
      // Clone response to safely attempt multiple parsing strategies
      const clonedRes = res.clone();
      
      // Strategy 1: Try to parse as JSON (structured error responses)
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        console.log('[HTTP ERROR] Attempting JSON parsing...');
        try {
          const errorData = await res.json();
          console.log('[HTTP ERROR] JSON parsed successfully:', errorData);
          
          // Extract error message with multiple fallbacks
          if (typeof errorData === 'object' && errorData !== null) {
            errorMessage = errorData.message || errorData.error || errorData.details || res.statusText;
            errorDetails = errorData;
          } else if (typeof errorData === 'string') {
            errorMessage = errorData;
          }
        } catch (jsonError) {
          console.warn('[HTTP ERROR] JSON parsing failed:', jsonError);
          throw jsonError; // Let it fall through to text parsing
        }
      } else {
        console.log('[HTTP ERROR] Non-JSON content type, skipping JSON parsing');
        throw new Error('Not JSON'); // Force text parsing
      }
    } catch (jsonError) {
      // Strategy 2: Parse as text (fallback)
      try {
        console.log('[HTTP ERROR] Attempting text parsing...');
        const clonedRes = res.clone();
        const textContent = await clonedRes.text();
        console.log('[HTTP ERROR] Text content:', textContent);
        
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
        console.error('[HTTP ERROR] Both JSON and text parsing failed:', textError);
        errorMessage = res.statusText || `HTTP ${res.status} - Unable to parse response`;
      }
    }
    
    // Create comprehensive error with all available information
    const error = new Error(`${res.status}: ${errorMessage}`);
    (error as any).status = res.status;
    (error as any).statusText = res.statusText;
    (error as any).url = res.url;
    (error as any).details = errorDetails;
    
    console.error('[HTTP ERROR] Final error object:', {
      message: error.message,
      status: res.status,
      statusText: res.statusText,
      url: res.url,
      details: errorDetails
    });
    
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.group(`[HTTP REQUEST ${requestId}] ${method} ${url}`);
  console.log('[REQUEST] Method:', method);
  console.log('[REQUEST] URL:', url);
  console.log('[REQUEST] Data:', data);
  
  const requestConfig = {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include" as RequestCredentials,
  };
  
  console.log('[REQUEST] Config:', {
    method: requestConfig.method,
    headers: requestConfig.headers,
    body: requestConfig.body ? 'Present' : 'None',
    credentials: requestConfig.credentials
  });
  
  let res: Response;
  try {
    console.log('[REQUEST] Sending fetch request...');
    res = await fetch(url, requestConfig);
    console.log('[RESPONSE] Received response');
    console.log('[RESPONSE] Status:', res.status, res.statusText);
    console.log('[RESPONSE] Headers:', Object.fromEntries(res.headers.entries()));
    console.log('[RESPONSE] OK:', res.ok);
    console.log('[RESPONSE] Type:', res.type);
    console.log('[RESPONSE] URL:', res.url);
  } catch (fetchError) {
    console.error('[REQUEST] Fetch failed:', fetchError);
    console.error('[REQUEST] Error type:', typeof fetchError);
    console.error('[REQUEST] Error constructor:', fetchError?.constructor?.name);
    console.error('[REQUEST] Error message:', fetchError instanceof Error ? fetchError.message : 'Unknown');
    console.error('[REQUEST] Error stack:', fetchError instanceof Error ? fetchError.stack : 'No stack');
    console.groupEnd();
    throw fetchError;
  }
  
  try {
    console.log('[RESPONSE] Checking response status...');
    await throwIfResNotOk(res);
    console.log('[RESPONSE] Status check passed');
    console.groupEnd();
    return res;
  } catch (statusError) {
    console.error('[RESPONSE] Status check failed:', statusError);
    console.error('[RESPONSE] Error type:', typeof statusError);
    console.error('[RESPONSE] Error constructor:', statusError?.constructor?.name);
    console.error('[RESPONSE] Error message:', statusError instanceof Error ? statusError.message : 'Unknown');
    console.error('[RESPONSE] Error properties:', Object.getOwnPropertyNames(statusError));
    console.groupEnd();
    throw statusError;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
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
