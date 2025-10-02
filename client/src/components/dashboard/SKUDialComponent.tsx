/**
 * planID: PLAN-20251002-PHASES-5-6-FRONTEND
 * Phase: 6.1 (SKU Dial Visualization Components)
 * SKU Dial Component - Main circular visualization
 * Created: 2025-10-02T17:15:00Z
 * Agent: developer
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Package,
  DollarSign,
  TrendingUp,
  Target,
  Activity,
} from "lucide-react";
import { useSkuDial } from "@/hooks/useSkuDial";
import { cn } from "@/lib/utils";

interface SKUDialComponentProps {
  productId: number;
  onEdit?: () => void;
  className?: string;
  showDetails?: boolean;
}

interface CircularProgressProps {
  value: number;
  max: number;
  size: number;
  strokeWidth: number;
  color: string;
  label: string;
  className?: string;
}

function CircularProgress({
  value,
  max,
  size,
  strokeWidth,
  color,
  label,
  className,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (value / max) * circumference;
  const center = size / 2;

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className,
      )}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          className="opacity-20"
        />
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-300 ease-in-out"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

const categoryConfig = {
  performance: {
    label: "Performance",
    icon: BarChart3,
    color: "hsl(262, 83%, 58%)",
    max: 200,
  },
  inventory: {
    label: "Inventory",
    icon: Package,
    color: "hsl(159, 100%, 36%)",
    max: 150,
  },
  profitability: {
    label: "Profitability",
    icon: DollarSign,
    color: "hsl(45, 93%, 47%)",
    max: 200,
  },
  demand: {
    label: "Demand",
    icon: TrendingUp,
    color: "hsl(217, 91%, 60%)",
    max: 138,
  },
  competitive: {
    label: "Competitive",
    icon: Target,
    color: "hsl(335, 78%, 42%)",
    max: 100,
  },
  trend: {
    label: "Trend",
    icon: Activity,
    color: "hsl(188, 94%, 43%)",
    max: 100,
  },
};

export function SKUDialComponent({
  productId,
  onEdit,
  className,
  showDetails = true,
}: SKUDialComponentProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useSkuDial(productId);

  if (isLoading) {
    return (
      <Card className={cn("bg-card border-border", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            SKU Dial Allocation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("bg-card border-border", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            SKU Dial Allocation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <AlertTriangle className="h-16 w-16 text-destructive opacity-50" />
            <p className="text-center text-muted-foreground">
              Failed to load SKU dial data
            </p>
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default data if none exists
  const allocation = data || {
    performancePoints: 0,
    inventoryPoints: 0,
    profitabilityPoints: 0,
    demandPoints: 0,
    competitivePoints: 0,
    trendPoints: 0,
    totalPoints: 0,
    remainingPoints: 888,
    efficiencyRating: 0,
  };

  const totalPoints = allocation.totalPoints;
  const remainingPoints = allocation.remainingPoints;
  const efficiencyRating = allocation.efficiencyRating;
  const isOptimal = totalPoints >= 800 && totalPoints <= 888;
  const isOverAllocated = totalPoints > 888;

  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          SKU Dial Allocation
        </CardTitle>
        <div className="flex items-center gap-2">
          {isOptimal && (
            <Badge
              variant="default"
              className="bg-success text-success-foreground"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Optimal
            </Badge>
          )}
          {isOverAllocated && (
            <Badge variant="destructive">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Over Limit
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Edit
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main dial visualization */}
        <div className="flex items-center justify-center">
          <div className="relative">
            {/* Main circular progress */}
            <CircularProgress
              value={totalPoints}
              max={888}
              size={200}
              strokeWidth={12}
              color={
                isOverAllocated
                  ? "hsl(var(--destructive))"
                  : "hsl(var(--primary))"
              }
              label="Total Points"
              className="drop-shadow-lg"
            />

            {/* Efficiency rating overlay */}
            <div className="absolute top-8 right-8">
              <div className="text-center">
                <div className="text-lg font-bold text-primary">
                  {efficiencyRating.toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground">Efficiency</div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-foreground">
              {totalPoints}
            </div>
            <div className="text-sm text-muted-foreground">Used Points</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-muted-foreground">
              {remainingPoints}
            </div>
            <div className="text-sm text-muted-foreground">Remaining</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">888</div>
            <div className="text-sm text-muted-foreground">Total Limit</div>
          </div>
        </div>

        {/* Category breakdown */}
        {showDetails && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">
              Category Breakdown
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(categoryConfig).map(([key, config]) => {
                const value =
                  (allocation[
                    `${key}Points` as keyof typeof allocation
                  ] as number) || 0;
                const percentage = (value / config.max) * 100;
                const Icon = config.icon;

                return (
                  <div
                    key={key}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-colors",
                      hoveredCategory === key ? "bg-muted/50" : "bg-background",
                      "hover:bg-muted/30 cursor-default",
                    )}
                    onMouseEnter={() => setHoveredCategory(key)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${config.color}20` }}
                      >
                        <Icon
                          className="h-4 w-4"
                          style={{ color: config.color }}
                        />
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          {config.label}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {value}/{config.max} ({percentage.toFixed(0)}%)
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{value}</div>
                      <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all duration-300"
                          style={{
                            width: `${Math.min(percentage, 100)}%`,
                            backgroundColor: config.color,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!showDetails && onEdit && (
          <Button
            onClick={onEdit}
            className="w-full"
            variant={isOverAllocated ? "destructive" : "default"}
          >
            {isOverAllocated ? "Fix Allocation" : "Adjust Allocation"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default SKUDialComponent;
