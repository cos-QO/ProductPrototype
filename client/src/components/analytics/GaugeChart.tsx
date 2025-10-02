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
import {
  generateGaugeGradient,
  getGaugeColorForPercentage,
  gaugeColors,
} from "@/lib/chart-colors";

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
  color = "hsl(222.2, 84%, 4.9%)", // --primary equivalent
  backgroundColor = "hsl(210, 40%, 98%)", // --gauge-background equivalent
}: GaugeChartProps) {
  const chartRef = useRef<ChartJS<"doughnut", number[], string>>(null);

  // Ensure value doesn't exceed max
  const normalizedValue = Math.min(Math.max(value, 0), max);
  const percentage = (normalizedValue / max) * 100;

  // Use design system color based on percentage
  const gaugeColor = getGaugeColorForPercentage(percentage);

  // Calculate remaining portion for the gauge effect
  const remaining = max - normalizedValue;

  // Use design system gradient segments
  const gradientSegments = generateGaugeGradient(normalizedValue, max, 5);
  const segmentData = gradientSegments.map((segment) => segment.value);
  const segmentColors = gradientSegments.map((segment) => segment.color);

  const data = {
    datasets: [
      {
        data: segmentData,
        backgroundColor: segmentColors,
        borderWidth: 0,
        circumference: 180, // Half circle
        rotation: 270, // Start from top (left side = red, right side = green)
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

  // Custom plugin to draw the center text - removed to prevent overlap
  const centerTextPlugin = {
    id: "centerText",
    beforeDraw: (chart: any) => {
      // Disabled center text drawing to prevent overlap with title
      // The value is now shown in the progress indicator below
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

      {/* Title and Value Display */}
      <div className="text-center mt-4">
        <h3 className="font-semibold text-sm text-foreground">{title}</h3>
        <div className="text-2xl font-bold mt-2" style={{ color: gaugeColor }}>
          {value.toFixed(1)}
          {max === 100 ? "%" : ""}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>

      {/* Progress Indicator */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>0</span>
          <span className="font-semibold">{percentage.toFixed(0)}%</span>
          <span>{max === 100 ? "100%" : max}</span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${percentage}%`,
              backgroundColor: gaugeColor,
            }}
          />
        </div>
      </div>
    </div>
  );
}
