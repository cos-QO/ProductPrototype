/**
 * Realtime Metrics Component
 * Live updating metrics with WebSocket integration
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  Zap, 
  TrendingUp,
  Clock,
  Users
} from 'lucide-react';
import { AutomationMetrics } from '../../../types/automation';

interface RealtimeMetricsProps {
  metrics?: AutomationMetrics;
  isConnected: boolean;
  isLoading: boolean;
}

interface LiveUpdate {
  timestamp: string;
  type: 'automation-rate' | 'cost-savings' | 'error-reduction' | 'system-health';
  value: number;
  change: number;
}

export function RealtimeMetrics({ metrics, isConnected, isLoading }: RealtimeMetricsProps) {
  const [liveUpdates, setLiveUpdates] = useState<LiveUpdate[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [updateCount, setUpdateCount] = useState(0);

  useEffect(() => {
    if (metrics && isConnected) {
      // Simulate live updates for demo purposes
      const interval = setInterval(() => {
        const updateTypes: LiveUpdate['type'][] = [
          'automation-rate', 'cost-savings', 'error-reduction', 'system-health'
        ];
        
        const randomType = updateTypes[Math.floor(Math.random() * updateTypes.length)];
        const baseValue = {
          'automation-rate': metrics.automationRate.current,
          'cost-savings': metrics.costEfficiency.savings,
          'error-reduction': metrics.errorReduction.qualityScore,
          'system-health': metrics.systemHealth.performance
        }[randomType];

        const change = (Math.random() - 0.5) * 2; // -1 to +1
        const newUpdate: LiveUpdate = {
          timestamp: new Date().toISOString(),
          type: randomType,
          value: baseValue + change,
          change
        };

        setLiveUpdates(prev => [newUpdate, ...prev.slice(0, 9)]); // Keep last 10
        setLastUpdateTime(new Date());
        setUpdateCount(prev => prev + 1);
      }, 15000); // Update every 15 seconds

      return () => clearInterval(interval);
    }
  }, [metrics, isConnected]);

  if (isLoading || !metrics) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 bg-gray-100 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatUpdateType = (type: LiveUpdate['type']) => {
    const labels = {
      'automation-rate': 'Automation Rate',
      'cost-savings': 'Cost Savings',
      'error-reduction': 'Error Reduction',
      'system-health': 'System Health'
    };
    return labels[type];
  };

  const getUpdateIcon = (type: LiveUpdate['type']) => {
    const icons = {
      'automation-rate': <Zap className="h-4 w-4 text-blue-500" />,
      'cost-savings': <TrendingUp className="h-4 w-4 text-green-500" />,
      'error-reduction': <Activity className="h-4 w-4 text-purple-500" />,
      'system-health': <Activity className="h-4 w-4 text-red-500" />
    };
    return icons[type];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-500" />
          Real-time Metrics
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          Live system monitoring and updates
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <Badge variant={isConnected ? 'default' : 'destructive'} className="text-xs">
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`} />
            <span className="text-sm font-medium">
              {isConnected ? 'Live Data Stream Active' : 'Connection Lost'}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            Updates: {updateCount}
          </div>
        </div>

        {/* Current Live Values */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-600">Automation Rate</span>
            </div>
            <div className="text-xl font-bold text-blue-600">
              {metrics.automationRate.current.toFixed(1)}%
            </div>
            <div className="flex items-center gap-1 text-xs">
              {metrics.automationRate.trend === 'increasing' ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <Activity className="h-3 w-3 text-gray-500" />
              )}
              <span className="text-gray-500">
                {metrics.automationRate.weekOverWeek > 0 ? '+' : ''}
                {metrics.automationRate.weekOverWeek.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-gray-600">System Health</span>
            </div>
            <div className="text-xl font-bold text-purple-600">
              {metrics.systemHealth.performance.toFixed(0)}%
            </div>
            <div className="text-xs">
              <Badge 
                variant={
                  metrics.systemHealth.status === 'healthy' ? 'default' :
                  metrics.systemHealth.status === 'warning' ? 'secondary' : 'destructive'
                }
                className="text-xs"
              >
                {metrics.systemHealth.status}
              </Badge>
            </div>
          </div>
        </div>

        {/* Recent Updates */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Recent Updates</h4>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>Last: {lastUpdateTime.toLocaleTimeString()}</span>
            </div>
          </div>
          
          {liveUpdates.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {liveUpdates.map((update, index) => (
                <div 
                  key={`${update.timestamp}-${index}`}
                  className="flex items-center justify-between p-2 bg-white border rounded text-sm"
                >
                  <div className="flex items-center gap-2">
                    {getUpdateIcon(update.type)}
                    <span className="font-medium">
                      {formatUpdateType(update.type)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {update.value.toFixed(1)}
                      {update.type === 'automation-rate' || update.type === 'system-health' || update.type === 'error-reduction' ? '%' : ''}
                    </span>
                    <span className={`text-xs ${
                      update.change > 0 ? 'text-green-600' : 
                      update.change < 0 ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {update.change > 0 ? '+' : ''}{update.change.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(update.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <div className="text-sm">
                {isConnected ? 'Waiting for updates...' : 'No connection to live data'}
              </div>
            </div>
          )}
        </div>

        {/* Live Performance Indicators */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-200">
          <div className="text-center">
            <div className="text-sm text-gray-600">Uptime</div>
            <div className="text-lg font-bold text-green-600">
              {metrics.systemHealth.uptime.toFixed(1)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">Users Active</div>
            <div className="text-lg font-bold text-blue-600">
              {Math.floor(Math.random() * 50) + 10} {/* Simulated */}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">Response</div>
            <div className="text-lg font-bold text-purple-600">
              {Math.floor(800 + Math.random() * 200)}ms
            </div>
          </div>
        </div>

        {/* Connection Quality Indicator */}
        <div className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="flex space-x-1">
              {[1, 2, 3, 4].map((bar) => (
                <div
                  key={bar}
                  className={`w-1 h-3 rounded-sm ${
                    isConnected && bar <= 3 ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            <span>Connection Quality</span>
          </div>
          <span>
            {isConnected ? 'Excellent' : 'Disconnected'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}