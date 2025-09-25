import { useState, useEffect } from 'react';

/**
 * Custom hook for responsive design using media queries
 * 
 * @param query - CSS media query string
 * @returns boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(query);
    
    // Set initial value
    setMatches(mediaQuery.matches);

    // Define the event listener
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add event listener
    mediaQuery.addEventListener('change', handleChange);

    // Cleanup function
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}

// Common breakpoint hooks for convenience
export const useMobile = () => useMediaQuery('(max-width: 640px)');
export const useTablet = () => useMediaQuery('(max-width: 768px)');
export const useDesktop = () => useMediaQuery('(min-width: 1024px)');
export const useLargeScreen = () => useMediaQuery('(min-width: 1280px)');

// Device capability hooks
export const useTouchDevice = () => useMediaQuery('(pointer: coarse)');
export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');
export const useDarkMode = () => useMediaQuery('(prefers-color-scheme: dark)');