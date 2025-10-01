import { useState, useEffect } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, Activity, RefreshCcw, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConnectionStatusProps {
  className?: string;
  showDetails?: boolean;
}

export function ConnectionStatusIndicator({
  className,
  showDetails = false,
}: ConnectionStatusProps) {
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [messageCount, setMessageCount] = useState(0);
  const [dataRefreshRate, setDataRefreshRate] = useState(0);

  // WebSocket connection for real-time updates
  const { isConnected, lastMessage, connect, disconnect } =
    useWebSocket("/ws/dashboard");

  // Track message frequency for data refresh rate
  useEffect(() => {
    if (lastMessage) {
      setLastUpdateTime(new Date());
      setMessageCount((prev) => prev + 1);
    }
  }, [lastMessage]);

  // Calculate data refresh rate (messages per minute)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const timeDiff = (now.getTime() - lastUpdateTime.getTime()) / 1000;

      if (timeDiff > 0) {
        const rate = Math.round((messageCount / timeDiff) * 60);
        setDataRefreshRate(rate);
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [lastUpdateTime, messageCount]);

  const formatLastUpdate = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const getConnectionStatus = () => {
    if (isConnected) {
      const timeSinceUpdate =
        (new Date().getTime() - lastUpdateTime.getTime()) / 1000;
      if (timeSinceUpdate < 30) return "live";
      if (timeSinceUpdate < 120) return "active";
      return "connected";
    }
    return "disconnected";
  };

  const status = getConnectionStatus();

  const statusConfig = {
    live: {
      color: "bg-green-500",
      textColor: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      icon: Zap,
      label: "Live",
      description: "Real-time updates active",
    },
    active: {
      color: "bg-blue-500",
      textColor: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      icon: Activity,
      label: "Active",
      description: "Connected and updating",
    },
    connected: {
      color: "bg-yellow-500",
      textColor: "text-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      icon: Wifi,
      label: "Connected",
      description: "Connection established",
    },
    disconnected: {
      color: "bg-red-500",
      textColor: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      icon: WifiOff,
      label: "Offline",
      description: "No connection",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  if (!showDetails) {
    // Compact indicator for header/navbar
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="relative">
          <div className={cn("w-2 h-2 rounded-full", config.color)} />
          {status === "live" && (
            <div
              className={cn(
                "absolute inset-0 w-2 h-2 rounded-full animate-ping",
                config.color,
                "opacity-75",
              )}
            />
          )}
        </div>
        <span className="text-sm text-muted-foreground">{config.label}</span>
      </div>
    );
  }

  // Detailed status panel for dashboard
  return (
    <div
      className={cn(
        "p-4 rounded-lg border",
        config.bgColor,
        config.borderColor,
        className,
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", config.textColor)} />
          <span className={cn("font-medium", config.textColor)}>
            Data Connection
          </span>
          <Badge variant={status === "live" ? "default" : "secondary"}>
            {config.label}
          </Badge>
        </div>

        {!isConnected && (
          <Button
            variant="outline"
            size="sm"
            onClick={connect}
            className="h-7 px-2"
          >
            <RefreshCcw className="h-3 w-3 mr-1" />
            Reconnect
          </Button>
        )}
      </div>

      <div className="text-sm text-muted-foreground mb-3">
        {config.description}
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            Last Update
          </div>
          <div className="font-medium">{formatLastUpdate(lastUpdateTime)}</div>
        </div>

        <div>
          <div className="text-muted-foreground">Messages</div>
          <div className="font-medium">{messageCount.toLocaleString()}</div>
        </div>

        <div>
          <div className="text-muted-foreground">Refresh Rate</div>
          <div className="font-medium">
            {dataRefreshRate > 0 ? `${dataRefreshRate}/min` : "—"}
          </div>
        </div>
      </div>

      {status === "live" && (
        <div className="mt-3 flex items-center gap-1 text-xs text-green-600">
          <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
          Real-time data streaming active
        </div>
      )}

      {lastMessage && (
        <div className="mt-3 p-2 bg-background/50 rounded text-xs">
          <div className="text-muted-foreground">Latest data:</div>
          <div className="font-mono">
            {lastMessage.type}: {JSON.stringify(lastMessage.data).slice(0, 50)}
            ...
          </div>
        </div>
      )}
    </div>
  );
}

// Hook for easy connection status access
export function useConnectionStatus() {
  const { isConnected, lastMessage } = useWebSocket("/ws/dashboard");
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  useEffect(() => {
    if (lastMessage) {
      setLastUpdateTime(new Date());
    }
  }, [lastMessage]);

  const getStatus = () => {
    if (isConnected) {
      const timeSinceUpdate =
        (new Date().getTime() - lastUpdateTime.getTime()) / 1000;
      if (timeSinceUpdate < 30) return "live";
      if (timeSinceUpdate < 120) return "active";
      return "connected";
    }
    return "disconnected";
  };

  return {
    status: getStatus(),
    isConnected,
    lastUpdateTime,
    lastMessage,
  };
}
