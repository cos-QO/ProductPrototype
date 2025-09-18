import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// CSRF token cache
let csrfTokenCache: string | null = null;
let csrfTokenExpiry: number = 0;

async function getCSRFToken(): Promise<string> {
  // Return cached token if still valid (expires in 50 minutes to be safe)
  if (csrfTokenCache && Date.now() < csrfTokenExpiry) {
    return csrfTokenCache;
  }

  try {
    const response = await fetch('/api/csrf-token', {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch CSRF token: ${response.status}`);
    }
    
    const data = await response.json();
    csrfTokenCache = data.csrfToken;
    csrfTokenExpiry = Date.now() + (50 * 60 * 1000); // 50 minutes
    return csrfTokenCache;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  const headers: Record<string, string> = {
    ...(data ? { "Content-Type": "application/json" } : {}),
  };

  // Add CSRF token for state-changing operations
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    try {
      const csrfToken = await getCSRFToken();
      headers['x-csrf-token'] = csrfToken;
    } catch (error) {
      console.error('Failed to get CSRF token for request:', error);
      // Continue with request - let backend handle the missing token
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // If we get a 403 error, it might be due to expired CSRF token
  if (res.status === 403 && csrfTokenCache) {
    // Clear the cache and retry once
    csrfTokenCache = null;
    csrfTokenExpiry = 0;
    
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      try {
        const newCsrfToken = await getCSRFToken();
        headers['x-csrf-token'] = newCsrfToken;
        
        const retryRes = await fetch(url, {
          method,
          headers,
          body: data ? JSON.stringify(data) : undefined,
          credentials: "include",
        });
        
        await throwIfResNotOk(retryRes);
        return await retryRes.json();
      } catch (retryError) {
        console.error('Retry with new CSRF token failed:', retryError);
        // Fall through to original error handling
      }
    }
  }

  await throwIfResNotOk(res);
  return await res.json();
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
