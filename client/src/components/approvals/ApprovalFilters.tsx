import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import {
  X,
  Calendar as CalendarIcon,
  Filter,
  RotateCcw,
  Check,
} from 'lucide-react';
import { format } from 'date-fns';

import type {
  ApprovalFilters as FilterType,
  ApprovalType,
  RiskLevel,
  ApprovalStatus,
  TimeRange,
} from '@/types/approval-types';

interface ApprovalFiltersProps {
  filters: FilterType;
  onChange: (filters: Partial<FilterType>) => void;
  onClose?: () => void;
  availableUsers?: Array<{ id: string; name: string; role: string }>;
  className?: string;
}

const approvalTypes: Array<{ value: ApprovalType; label: string; description: string }> = [
  {
    value: 'data_integrity',
    label: 'Data Integrity',
    description: 'Data loss or corruption risks',
  },
  {
    value: 'performance_impact',
    label: 'Performance Impact',
    description: 'System performance concerns',
  },
  {
    value: 'security_risk',
    label: 'Security Risk',
    description: 'Security vulnerabilities or threats',
  },
  {
    value: 'business_logic',
    label: 'Business Logic',
    description: 'Business rule or logic changes',
  },
  {
    value: 'large_dataset',
    label: 'Large Dataset',
    description: 'Processing of large data volumes',
  },
];

const riskLevels: Array<{ value: RiskLevel; label: string; color: string }> = [
  { value: 'low', label: 'Low Risk', color: 'bg-green-100 text-green-800' },
  { value: 'medium', label: 'Medium Risk', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High Risk', color: 'bg-orange-100 text-orange-800' },
  { value: 'critical', label: 'Critical Risk', color: 'bg-red-100 text-red-800' },
];

const statusOptions: Array<{ value: ApprovalStatus; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'timeout', label: 'Timeout' },
];

const timeRangePresets: Array<{ 
  value: TimeRange['preset']; 
  label: string; 
  getDates: () => { start: Date; end: Date } 
}> = [
  {
    value: 'today',
    label: 'Today',
    getDates: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      return { start, end };
    },
  },
  {
    value: 'week',
    label: 'Last 7 days',
    getDates: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 7);
      return { start, end };
    },
  },
  {
    value: 'month',
    label: 'Last 30 days',
    getDates: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30);
      return { start, end };
    },
  },
];

export const ApprovalFilters: React.FC<ApprovalFiltersProps> = ({
  filters,
  onChange,
  onClose,
  availableUsers = [],
  className = '',
}) => {
  const [localFilters, setLocalFilters] = useState<FilterType>(filters);
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);

  const handleFilterChange = (key: keyof FilterType, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onChange(newFilters);
  };

  const handleArrayFilterToggle = (key: keyof FilterType, value: string) => {
    const currentArray = (localFilters[key] as string[]) || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    
    handleFilterChange(key, newArray);
  };

  const handleTimeRangePreset = (preset: TimeRange['preset']) => {
    const presetData = timeRangePresets.find(p => p.value === preset);
    if (presetData) {
      const { start, end } = presetData.getDates();
      handleFilterChange('timeRange', { start, end, preset });
    }
  };

  const handleDateRangeChange = (field: 'start' | 'end', date: Date | undefined) => {
    if (!date) return;
    
    const currentRange = localFilters.timeRange || { 
      start: new Date(), 
      end: new Date(),
      preset: 'custom' 
    };
    
    handleFilterChange('timeRange', {
      ...currentRange,
      [field]: date,
      preset: 'custom',
    });
  };

  const resetFilters = () => {
    const defaultFilters: FilterType = {
      status: ['pending'],
      timeRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
        preset: 'week',
      },
    };
    setLocalFilters(defaultFilters);
    onChange(defaultFilters);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (localFilters.status && localFilters.status.length > 1) count++;
    if (localFilters.type && localFilters.type.length > 0) count++;
    if (localFilters.riskLevel && localFilters.riskLevel.length > 0) count++;
    if (localFilters.assignedTo && localFilters.assignedTo.length > 0) count++;
    if (localFilters.searchQuery && localFilters.searchQuery.trim()) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Filter approvals by status, type, risk level, and more
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetFilters}>
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Status</Label>
          <div className="grid grid-cols-2 gap-2">
            {statusOptions.map(({ value, label }) => (
              <div key={value} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${value}`}
                  checked={(localFilters.status || []).includes(value)}
                  onCheckedChange={() => handleArrayFilterToggle('status', value)}
                />
                <Label htmlFor={`status-${value}`} className="text-sm">
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Approval Type Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Approval Type</Label>
          <div className="space-y-2">
            {approvalTypes.map(({ value, label, description }) => (
              <div key={value} className="flex items-start space-x-2">
                <Checkbox
                  id={`type-${value}`}
                  checked={(localFilters.type || []).includes(value)}
                  onCheckedChange={() => handleArrayFilterToggle('type', value)}
                  className="mt-1"
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor={`type-${value}`} className="text-sm font-medium">
                    {label}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Risk Level Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Risk Level</Label>
          <div className="grid grid-cols-2 gap-2">
            {riskLevels.map(({ value, label, color }) => (
              <div key={value} className="flex items-center space-x-2">
                <Checkbox
                  id={`risk-${value}`}
                  checked={(localFilters.riskLevel || []).includes(value)}
                  onCheckedChange={() => handleArrayFilterToggle('riskLevel', value)}
                />
                <Label htmlFor={`risk-${value}`} className="text-sm flex items-center gap-2">
                  <Badge className={`${color} text-xs px-2 py-0.5`}>
                    {label.split(' ')[0]}
                  </Badge>
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Time Range Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Time Range</Label>
          
          {/* Preset buttons */}
          <div className="grid grid-cols-3 gap-2">
            {timeRangePresets.map(({ value, label }) => (
              <Button
                key={value}
                variant={localFilters.timeRange?.preset === value ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleTimeRangePreset(value)}
                className="text-xs"
              >
                {label}
              </Button>
            ))}
          </div>

          {/* Custom date range */}
          <div className="grid grid-cols-2 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="justify-start text-left">
                  <CalendarIcon className="h-3 w-3 mr-2" />
                  {localFilters.timeRange?.start
                    ? format(localFilters.timeRange.start, 'MMM dd')
                    : 'Start date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={localFilters.timeRange?.start}
                  onSelect={(date) => handleDateRangeChange('start', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="justify-start text-left">
                  <CalendarIcon className="h-3 w-3 mr-2" />
                  {localFilters.timeRange?.end
                    ? format(localFilters.timeRange.end, 'MMM dd')
                    : 'End date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={localFilters.timeRange?.end}
                  onSelect={(date) => handleDateRangeChange('end', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Assigned To Filter */}
        {availableUsers.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <Label className="text-sm font-medium">Assigned To</Label>
              <Select
                value=""
                onValueChange={(value) => handleArrayFilterToggle('assignedTo', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select users..." />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{user.name}</span>
                        <Badge variant="secondary" className="text-xs ml-2">
                          {user.role}
                        </Badge>
                        {(localFilters.assignedTo || []).includes(user.id) && (
                          <Check className="h-3 w-3 ml-2" />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Show selected users */}
              {localFilters.assignedTo && localFilters.assignedTo.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {localFilters.assignedTo.map((userId) => {
                    const user = availableUsers.find(u => u.id === userId);
                    return user ? (
                      <Badge key={userId} variant="secondary" className="text-xs">
                        {user.name}
                        <button
                          onClick={() => handleArrayFilterToggle('assignedTo', userId)}
                          className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                        >
                          <X className="h-2 w-2" />
                        </button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};