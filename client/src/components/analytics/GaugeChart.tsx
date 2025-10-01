import { useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  DoughnutController,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  DoughnutController,
);

interface GaugeChartProps {
  value: number;
  max: number;
  title: string;
  subtitle?: string;
  color?: string;
  backgroundColor?: string;
}

export function GaugeChart({
  value,
  max,
  title,
  subtitle,
  color = "#8b5cf6",
  backgroundColor = "#f3f4f6",
}: GaugeChartProps) {
  const chartRef = useRef<ChartJS<"doughnut", number[], string>>(null);

  // Ensure value doesn't exceed max
  const normalizedValue = Math.min(Math.max(value, 0), max);
  const percentage = (normalizedValue / max) * 100;

  // Calculate remaining portion for the gauge effect
  const remaining = max - normalizedValue;

  const data = {
    datasets: [
      {
        data: [normalizedValue, remaining],
        backgroundColor: [color, backgroundColor],
        borderWidth: 0,
        circumference: 180, // Half circle
        rotation: 270, // Start from top
        cutout: "75%", // Creates the gauge hollow center
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false, // Disable tooltips for cleaner look
      },
    },
    elements: {
      arc: {
        borderWidth: 0,
      },
    },
  };

  // Custom plugin to draw the center text
  const centerTextPlugin = {
    id: "centerText",
    beforeDraw: (chart: any) => {
      const { ctx, width, height } = chart;
      ctx.restore();

      const centerX = width / 2;
      const centerY = height / 2 + 20; // Adjust for gauge positioning

      // Main value
      ctx.font = "bold 24px sans-serif";
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const displayValue = typeof value === "number" ? value.toFixed(1) : "0.0";
      ctx.fillText(displayValue, centerX, centerY - 10);

      // Unit or percentage
      ctx.font = "14px sans-serif";
      ctx.fillStyle = "#6b7280";
      const unit = max === 100 ? "%" : "";
      ctx.fillText(unit, centerX, centerY + 15);

      ctx.save();
    },
  };

  useEffect(() => {
    // Register the plugin
    ChartJS.register(centerTextPlugin);

    return () => {
      // Cleanup if needed
      ChartJS.unregister(centerTextPlugin);
    };
  }, []);

  return (
    <div className="relative">
      {/* Chart Container */}
      <div className="h-32 w-full relative">
        <Doughnut
          ref={chartRef}
          data={data}
          options={options}
          plugins={[centerTextPlugin]}
        />
      </div>

      {/* Title and Subtitle */}
      <div className="text-center mt-4">
        <h3 className="font-semibold text-sm text-foreground">{title}</h3>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>

      {/* Progress Indicator */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>0</span>
          <span>{percentage.toFixed(0)}%</span>
          <span>{max}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${percentage}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </div>
    </div>
  );
}
