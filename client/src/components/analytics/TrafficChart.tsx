import React, { useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from "chart.js";
import { Pie, Doughnut } from "react-chartjs-2";
import { getTrafficColorsArray, chartDefaults } from "@/lib/chart-colors";

// Register Chart.js components
ChartJS.register(ArcElement, Title, Tooltip, Legend);

interface TrafficChartProps {
  trafficAds: number;
  trafficEmails: number;
  trafficText: number;
  trafficStore: number;
  trafficOrganic?: number;
  trafficSocial?: number;
  trafficDirect?: number;
  trafficReferral?: number;
  variant?: "pie" | "doughnut";
  showLegend?: boolean;
}

export function TrafficChart({
  trafficAds,
  trafficEmails,
  trafficText,
  trafficStore,
  trafficOrganic = 0,
  trafficSocial = 0,
  trafficDirect = 0,
  trafficReferral = 0,
  variant = "doughnut",
  showLegend = true,
}: TrafficChartProps) {
  // Calculate total traffic
  const total =
    trafficAds +
    trafficEmails +
    trafficText +
    trafficStore +
    trafficOrganic +
    trafficSocial +
    trafficDirect +
    trafficReferral;

  // Prepare chart data
  const data: ChartData<"pie" | "doughnut"> = {
    labels: [
      "Ads",
      "Email",
      "SMS/Text",
      "Store",
      "Organic",
      "Social",
      "Direct",
      "Referral",
    ],
    datasets: [
      {
        data: [
          trafficAds,
          trafficEmails,
          trafficText,
          trafficStore,
          trafficOrganic,
          trafficSocial,
          trafficDirect,
          trafficReferral,
        ],
        backgroundColor: getTrafficColorsArray(),
        borderWidth: 0,
      },
    ],
  };

  const options: ChartOptions<"pie" | "doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // We'll render custom legend outside chart
      },
      tooltip: {
        backgroundColor: chartDefaults.tooltip.backgroundColor,
        titleColor: chartDefaults.tooltip.titleColor,
        bodyColor: chartDefaults.tooltip.bodyColor,
        borderColor: chartDefaults.tooltip.borderColor,
        borderWidth: chartDefaults.tooltip.borderWidth,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: (context) => {
            const value = context.raw as number;
            const percentage =
              total > 0 ? ((value / total) * 100).toFixed(1) : "0";
            return ` ${context.label}: ${value.toLocaleString()} (${percentage}%)`;
          },
        },
      },
    },
    // Adjust cutout for better visibility - smaller cutout means larger chart area
    cutout: variant === "doughnut" ? "40%" : undefined,
    // No padding for maximum chart size
    layout: {
      padding: 0,
    },
  };

  const ChartComponent = variant === "pie" ? Pie : Doughnut;

  // Prepare legend data with visibility state
  const [hiddenItems, setHiddenItems] = React.useState<Set<number>>(new Set());
  const chartRef = useRef<any>(null);

  const toggleLegendItem = (index: number) => {
    const chart = chartRef.current;
    if (chart) {
      const meta = chart.getDatasetMeta(0);
      const isHidden = meta.data[index].hidden;
      meta.data[index].hidden = !isHidden;
      chart.update();

      const newHiddenItems = new Set(hiddenItems);
      if (isHidden) {
        newHiddenItems.delete(index);
      } else {
        newHiddenItems.add(index);
      }
      setHiddenItems(newHiddenItems);
    }
  };

  // Generate legend items
  const legendItems =
    data.labels
      ?.map((label, i) => {
        const value = data.datasets[0].data[i] as number;
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
        const backgroundColors = data.datasets[0].backgroundColor as string[];
        const backgroundColor = backgroundColors?.[i] || "#6b7280";
        const isHidden = hiddenItems.has(i);

        return {
          label,
          value,
          percentage,
          backgroundColor,
          isHidden,
          index: i,
        };
      })
      .filter((item) => item.value > 0) || [];

  // Always render the chart, even with zero data
  // Chart.js will handle empty data gracefully
  return (
    <div className="h-full w-full flex flex-col">
      {/* Chart area - takes all available space with much larger height */}
      <div
        className="flex-1 min-h-0 relative"
        style={{ minHeight: "400px", height: "400px" }}
      >
        <ChartComponent ref={chartRef} data={data} options={options} />
      </div>

      {/* Custom legend at the bottom */}
      {showLegend && legendItems.length > 0 && (
        <div className="flex-shrink-0 mt-4 pt-3 border-t border-border">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {legendItems.map((item) => (
              <button
                key={item.index}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleLegendItem(item.index);
                }}
                className={`flex items-center gap-2 p-1 rounded hover:bg-muted/50 transition-colors text-left ${
                  item.isHidden ? "opacity-50" : ""
                }`}
              >
                <div
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{
                    backgroundColor: item.isHidden
                      ? "hsl(var(--muted))"
                      : item.backgroundColor,
                  }}
                />
                <span
                  className={`truncate ${item.isHidden ? "text-muted-foreground" : ""}`}
                >
                  {item.label}: {item.percentage}%
                </span>
              </button>
            ))}
          </div>
          <div className="text-center text-muted-foreground mt-2 text-xs">
            Click legend items to show/hide data
          </div>
        </div>
      )}
    </div>
  );
}
