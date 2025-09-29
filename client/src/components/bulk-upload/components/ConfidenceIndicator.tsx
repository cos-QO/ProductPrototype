import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ConfidenceIndicatorProps {
  confidence: number;
  showPercentage?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({
  confidence,
  showPercentage = true,
  size = "md",
  className,
}) => {
  const getColor = (conf: number) => {
    if (conf >= 0.9) return "bg-success";
    if (conf >= 0.7) return "bg-warning";
    return "bg-destructive";
  };

  const getLabel = (conf: number) => {
    if (conf >= 0.9) return "High";
    if (conf >= 0.7) return "Medium";
    return "Low";
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case "sm":
        return { dot: "w-1.5 h-1.5", text: "text-xs" };
      case "lg":
        return { dot: "w-3 h-3", text: "text-sm" };
      default:
        return { dot: "w-2 h-2", text: "text-xs" };
    }
  };

  const sizeClasses = getSizeClasses(size);

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div
        className={cn("rounded-full", getColor(confidence), sizeClasses.dot)}
      />
      <span className={cn("text-muted-foreground", sizeClasses.text)}>
        {showPercentage
          ? `${Math.round(confidence * 100)}%`
          : getLabel(confidence)}
      </span>
    </div>
  );
};

export default ConfidenceIndicator;
