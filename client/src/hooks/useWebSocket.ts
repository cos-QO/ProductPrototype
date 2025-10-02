/**
 * Custom WebSocket Hook
 * Provides real-time connection to automation analytics WebSocket
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { WebSocketMessage } from "../types/automation";

interface UseWebSocketResult {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  sendMessage: (message: any) => void;
  connect: () => void;
  disconnect: () => void;
}

export function useWebSocket(url: string): UseWebSocketResult {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const baseDelay = 1000; // Start with 1 second
  const maxDelay = 16000; // Cap at 16 seconds

  const connect = useCallback(() => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // Convert relative URL to WebSocket URL with proper port fallback
      // Ensure we always have a valid host and port
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const defaultPort = "5000"; // Fixed port as configured in vite.config.ts
      let host = window.location.host;

      // Fix undefined port issue - ensure we have a valid host and port
      if (!host || host === "localhost" || host === "") {
        host = `localhost:${defaultPort}`;
      } else if (!host.includes(":")) {
        // Host exists but no port, add default port
        host = `${host}:${defaultPort}`;
      }

      // Additional safety check for malformed hosts
      if (host.includes("undefined") || host.includes("null")) {
        console.warn(
          "Malformed host detected, falling back to localhost:",
          host,
        );
        host = `localhost:${defaultPort}`;
      }

      // Construct WebSocket URL properly - handle both relative and absolute URLs
      let wsUrl: string;
      if (url.startsWith("ws://") || url.startsWith("wss://")) {
        wsUrl = url;
      } else {
        // Remove leading slash if present to avoid double slashes
        const cleanUrl = url.startsWith("/") ? url : `/${url}`;
        wsUrl = `${protocol}//${host}${cleanUrl}`;
      }

      console.log(`Attempting WebSocket connection to: ${wsUrl}`);
      websocketRef.current = new WebSocket(wsUrl);

      websocketRef.current.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      websocketRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      websocketRef.current.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason);
        setIsConnected(false);

        // Attempt to reconnect if it wasn't a manual disconnect
        // Code 1000 = normal closure, 1008 = policy violation (missing params)
        if (
          event.code !== 1000 &&
          event.code !== 1008 && // Don't retry on missing sessionId/userId
          reconnectAttemptsRef.current < maxReconnectAttempts
        ) {
          // Exponential backoff: 1s, 2s, 4s, 8s, 16s
          const delay = Math.min(
            baseDelay * Math.pow(2, reconnectAttemptsRef.current),
            maxDelay,
          );
          console.log(
            `Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`,
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else if (event.code === 1008) {
          console.error(
            "WebSocket connection rejected: Missing sessionId or userId parameters",
          );
        }
      };

      websocketRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      setIsConnected(false);
    }
  }, [url]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (websocketRef.current) {
      websocketRef.current.close(1000, "Manual disconnect");
      websocketRef.current = null;
    }

    setIsConnected(false);
    reconnectAttemptsRef.current = 0;
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      try {
        const messageWithTimestamp = {
          ...message,
          timestamp: new Date().toISOString(),
        };
        websocketRef.current.send(JSON.stringify(messageWithTimestamp));
      } catch (error) {
        console.error("Failed to send WebSocket message:", error);
      }
    } else {
      console.warn("WebSocket is not connected. Message not sent:", message);
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
  };
}

export default useWebSocket;
