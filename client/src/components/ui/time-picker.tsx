import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimePickerProps {
  value?: string; // Format: "HH:MM" or "HH:MM:SS"
  onChange?: (time: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  format?: "12" | "24"; // 12-hour or 24-hour format
  includeSeconds?: boolean;
  step?: number; // Minutes step for selection
}

const TimePicker = React.forwardRef<HTMLButtonElement, TimePickerProps>(
  (
    {
      value,
      onChange,
      placeholder = "Select time",
      disabled = false,
      className,
      format = "24",
      includeSeconds = false,
      step = 1,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const [internalValue, setInternalValue] = React.useState(value || "");

    // Parse time string to components
    const parseTime = (timeStr: string) => {
      if (!timeStr)
        return { hours: "", minutes: "", seconds: "", period: "AM" };

      const parts = timeStr.split(":");
      let hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const seconds = parseInt(parts[2]) || 0;
      let period = "AM";

      if (format === "12") {
        period = hours >= 12 ? "PM" : "AM";
        if (hours === 0) hours = 12;
        else if (hours > 12) hours -= 12;
      }

      return {
        hours: hours.toString().padStart(2, "0"),
        minutes: minutes.toString().padStart(2, "0"),
        seconds: seconds.toString().padStart(2, "0"),
        period,
      };
    };

    // Format time components to string
    const formatTime = (
      hours: string,
      minutes: string,
      seconds: string,
      period?: string,
    ) => {
      let h = parseInt(hours) || 0;

      if (format === "12" && period) {
        if (period === "AM" && h === 12) h = 0;
        else if (period === "PM" && h !== 12) h += 12;
      }

      const timeStr = includeSeconds
        ? `${h.toString().padStart(2, "0")}:${minutes.padStart(2, "0")}:${seconds.padStart(2, "0")}`
        : `${h.toString().padStart(2, "0")}:${minutes.padStart(2, "0")}`;

      return timeStr;
    };

    const { hours, minutes, seconds, period } = parseTime(internalValue);

    const updateTime = (
      newHours?: string,
      newMinutes?: string,
      newSeconds?: string,
      newPeriod?: string,
    ) => {
      const h = newHours ?? hours;
      const m = newMinutes ?? minutes;
      const s = newSeconds ?? seconds;
      const p = newPeriod ?? period;

      const formatted = formatTime(h, m, s, p);
      setInternalValue(formatted);
      onChange?.(formatted);
    };

    // Generate hour options
    const hourOptions = React.useMemo(() => {
      const options = [];
      const maxHours = format === "12" ? 12 : 23;
      const minHours = format === "12" ? 1 : 0;

      for (let i = minHours; i <= maxHours; i++) {
        options.push({
          value: i.toString().padStart(2, "0"),
          label: i.toString().padStart(2, "0"),
        });
      }
      return options;
    }, [format]);

    // Generate minute options
    const minuteOptions = React.useMemo(() => {
      const options = [];
      for (let i = 0; i < 60; i += step) {
        options.push({
          value: i.toString().padStart(2, "0"),
          label: i.toString().padStart(2, "0"),
        });
      }
      return options;
    }, [step]);

    // Generate second options
    const secondOptions = React.useMemo(() => {
      const options = [];
      for (let i = 0; i < 60; i++) {
        options.push({
          value: i.toString().padStart(2, "0"),
          label: i.toString().padStart(2, "0"),
        });
      }
      return options;
    }, []);

    const formatDisplayTime = (timeStr: string) => {
      if (!timeStr) return "";

      const { hours, minutes, seconds, period } = parseTime(timeStr);
      const displayHours =
        format === "12" ? (parseInt(hours) === 0 ? "12" : hours) : hours;

      if (format === "12") {
        return includeSeconds
          ? `${displayHours}:${minutes}:${seconds} ${period}`
          : `${displayHours}:${minutes} ${period}`;
      } else {
        return includeSeconds
          ? `${hours}:${minutes}:${seconds}`
          : `${hours}:${minutes}`;
      }
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !internalValue && "text-muted-foreground",
              className,
            )}
            disabled={disabled}
          >
            <Clock className="mr-3 h-4 w-4" />
            {internalValue ? formatDisplayTime(internalValue) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {/* Hours */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  {format === "12" ? "Hour" : "Hours"}
                </label>
                <Select value={hours} onValueChange={(h) => updateTime(h)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hourOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Minutes */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Min</label>
                <Select
                  value={minutes}
                  onValueChange={(m) => updateTime(undefined, m)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {minuteOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Seconds (if enabled) */}
              {includeSeconds && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Sec</label>
                  <Select
                    value={seconds}
                    onValueChange={(s) => updateTime(undefined, undefined, s)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {secondOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* AM/PM for 12-hour format */}
            {format === "12" && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Period</label>
                <Select
                  value={period}
                  onValueChange={(p) =>
                    updateTime(undefined, undefined, undefined, p)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Quick time presets */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">
                Quick Select
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    const currentTime = formatTime(
                      now.getHours().toString(),
                      now.getMinutes().toString(),
                      now.getSeconds().toString(),
                    );
                    setInternalValue(currentTime);
                    onChange?.(currentTime);
                    setOpen(false);
                  }}
                >
                  Now
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setInternalValue("");
                    onChange?.("");
                    setOpen(false);
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  },
);
TimePicker.displayName = "TimePicker";

export { TimePicker, type TimePickerProps };
