/**
 * planID: PLAN-20251002-PHASES-5-6-FRONTEND
 * Phase: 6.1 (SKU Dial Visualization Components)
 * Category Slider Component for SKU Dial Allocation
 * Created: 2025-10-02T17:00:00Z
 * Agent: developer
 */

import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Package,
  DollarSign,
  TrendingUp,
  Target,
  Activity,
  Minus,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMetricColor } from "@/lib/chart-colors";

interface CategorySliderProps {
  category:
    | "performance"
    | "inventory"
    | "profitability"
    | "demand"
    | "competitive"
    | "trend";
  value: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  error?: string;
  remainingPoints?: number;
  totalUsed?: number;
}

const categoryConfig = {
  performance: {
    label: "Performance",
    icon: BarChart3,
    color: "hsl(262, 83%, 58%)", // Purple
    description: "Product performance metrics and KPIs",
    max: 200,
  },
  inventory: {
    label: "Inventory",
    icon: Package,
    color: "hsl(159, 100%, 36%)", // Green
    description: "Stock levels and inventory management",
    max: 150,
  },
  profitability: {
    label: "Profitability",
    icon: DollarSign,
    color: "hsl(45, 93%, 47%)", // Yellow/Gold
    description: "Margin and profitability analysis",
    max: 200,
  },
  demand: {
    label: "Demand",
    icon: TrendingUp,
    color: "hsl(217, 91%, 60%)", // Blue
    description: "Market demand and customer interest",
    max: 138,
  },
  competitive: {
    label: "Competitive",
    icon: Target,
    color: "hsl(335, 78%, 42%)", // Pink/Red
    description: "Competitive positioning and analysis",
    max: 100,
  },
  trend: {
    label: "Trend",
    icon: Activity,
    color: "hsl(188, 94%, 43%)", // Cyan
    description: "Market trends and future outlook",
    max: 100,
  },
};

export function CategorySlider({
  category,
  value,
  max,
  onChange,
  disabled = false,
  error,
  remainingPoints = 0,
  totalUsed = 0,
}: CategorySliderProps) {
  const [inputValue, setInputValue] = useState(value.toString());
  const config = categoryConfig[category];
  const Icon = config.icon;

  // Sync input value with prop value
  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const handleSliderChange = (newValue: number[]) => {
    const val = newValue[0];
    onChange(val);
    setInputValue(val.toString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    const numVal = parseInt(val, 10);
    if (!isNaN(numVal) && numVal >= 0 && numVal <= max) {
      onChange(numVal);
    }
  };

  const handleInputBlur = () => {
    const numVal = parseInt(inputValue, 10);
    if (isNaN(numVal) || numVal < 0) {
      setInputValue("0");
      onChange(0);
    } else if (numVal > max) {
      setInputValue(max.toString());
      onChange(max);
    }
  };

  const adjustValue = (delta: number) => {
    const newValue = Math.max(0, Math.min(max, value + delta));
    onChange(newValue);
  };

  const percentage = (value / max) * 100;
  const isOverLimit = totalUsed > 888;
  const isAtMax = value === max;

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${config.color}20` }}
          >
            <Icon className="h-5 w-5" style={{ color: config.color }} />
          </div>
          <div>
            <Label className="text-sm font-medium">{config.label}</Label>
            <p className="text-xs text-muted-foreground">
              {config.description}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge
            variant={
              isOverLimit ? "destructive" : value > 0 ? "default" : "secondary"
            }
            className="font-mono"
          >
            {value}/{max}
          </Badge>
          {percentage > 0 && (
            <Badge variant="outline" className="text-xs">
              {percentage.toFixed(0)}%
            </Badge>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-3">
        {/* Slider */}
        <div className="space-y-2">
          <Slider
            value={[value]}
            onValueChange={handleSliderChange}
            max={max}
            min={0}
            step={1}
            disabled={disabled}
            className={cn(
              "w-full",
              error && "border-destructive",
              isOverLimit && "opacity-75",
            )}
            style={
              {
                "--slider-color": config.color,
              } as React.CSSProperties
            }
          />

          {/* Range indicators */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span className="text-center">{Math.floor(max / 2)}</span>
            <span>{max}</span>
          </div>
        </div>

        {/* Input and adjustment buttons */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => adjustValue(-10)}
            disabled={disabled || value <= 0}
            className="h-8 w-8 p-0"
          >
            <Minus className="h-3 w-3" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => adjustValue(-1)}
            disabled={disabled || value <= 0}
            className="h-8 w-8 p-0"
          >
            -1
          </Button>

          <Input
            type="number"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            min={0}
            max={max}
            disabled={disabled}
            className={cn(
              "text-center font-mono w-20 h-8",
              error && "border-destructive",
            )}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => adjustValue(1)}
            disabled={disabled || value >= max}
            className="h-8 w-8 p-0"
          >
            +1
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => adjustValue(10)}
            disabled={disabled || value >= max}
            className="h-8 w-8 p-0"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Quick presets */}
        <div className="flex items-center space-x-1">
          <span className="text-xs text-muted-foreground mr-2">Quick:</span>
          {[
            0,
            Math.floor(max * 0.25),
            Math.floor(max * 0.5),
            Math.floor(max * 0.75),
            max,
          ].map((preset) => (
            <Button
              key={preset}
              variant={value === preset ? "default" : "ghost"}
              size="sm"
              onClick={() => onChange(preset)}
              disabled={disabled}
              className="h-6 px-2 text-xs"
            >
              {preset === 0
                ? "0"
                : preset === max
                  ? "Max"
                  : `${Math.floor((preset / max) * 100)}%`}
            </Button>
          ))}
        </div>
      </div>

      {/* Error message */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Status indicators */}
      {isAtMax && (
        <p className="text-xs text-warning">
          At maximum allocation for this category
        </p>
      )}

      {isOverLimit && (
        <p className="text-xs text-destructive">
          Total allocation exceeds 888 points by {totalUsed - 888}
        </p>
      )}
    </div>
  );
}

export default CategorySlider;
