import * as React from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function MobileDatePicker({
  value,
  onChange,
  placeholder = "Select date",
  className,
}: DatePickerProps) {
  return (
    <>
      {/* Mobile-optimized version using native date input */}
      <div className="block md:hidden">
        <div className="relative">
          <input
            type="date"
            value={value?.toISOString().split("T")[0] || ""}
            onChange={(e) => {
              const newDate = e.target.value
                ? new Date(e.target.value)
                : undefined;
              onChange(newDate);
            }}
            className={cn(
              "w-full p-3 pr-10 text-base rounded-md border",
              "min-h-[44px] touch-manipulation", // Touch-friendly sizing
              "appearance-none bg-background",
              className,
            )}
            placeholder={placeholder}
          />
          <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Desktop version with popover calendar */}
      <div className="hidden md:block">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !value && "text-muted-foreground",
                className,
              )}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {value ? format(value, "PPP") : placeholder}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={value}
              onSelect={onChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}

interface DateRangePickerProps {
  startDate?: Date;
  endDate?: Date;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  className?: string;
}

export function MobileDateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className,
}: DateRangePickerProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {/* Mobile version with native inputs */}
      <div className="block md:hidden space-y-2">
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1 block">
            Start Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={startDate?.toISOString().split("T")[0] || ""}
              onChange={(e) => {
                const newDate = e.target.value
                  ? new Date(e.target.value)
                  : undefined;
                onStartDateChange(newDate);
              }}
              max={endDate?.toISOString().split("T")[0]}
              className="w-full p-3 pr-10 text-base rounded-md border min-h-[44px] touch-manipulation appearance-none bg-background"
            />
            <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1 block">
            End Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={endDate?.toISOString().split("T")[0] || ""}
              onChange={(e) => {
                const newDate = e.target.value
                  ? new Date(e.target.value)
                  : undefined;
                onEndDateChange(newDate);
              }}
              min={startDate?.toISOString().split("T")[0]}
              className="w-full p-3 pr-10 text-base rounded-md border min-h-[44px] touch-manipulation appearance-none bg-background"
            />
            <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Desktop version */}
      <div className="hidden md:flex md:space-x-2">
        <div className="flex-1">
          <label className="text-sm font-medium text-muted-foreground mb-1 block">
            Start Date
          </label>
          <MobileDatePicker
            value={startDate}
            onChange={onStartDateChange}
            placeholder="Start date"
          />
        </div>

        <div className="flex-1">
          <label className="text-sm font-medium text-muted-foreground mb-1 block">
            End Date
          </label>
          <MobileDatePicker
            value={endDate}
            onChange={onEndDateChange}
            placeholder="End date"
          />
        </div>
      </div>
    </div>
  );
}
