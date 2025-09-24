/**
 * System Health Component
 * Real-time system health monitoring and status indicators
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Server, 
  Cpu, 
  HardDrive,
  Wifi,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { AutomationMetrics } from '../../../types/automation';

interface SystemHealthProps {
  systemHealth?: AutomationMetrics['systemHealth'];
  isLoading: boolean;
}

export function SystemHealth({ systemHealth, isLoading }: SystemHealthProps) {
  if (isLoading || !systemHealth) {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return { variant: 'default' as const, text: 'Healthy' };
      case 'warning':
        return { variant: 'secondary' as const, text: 'Warning' };
      case 'critical':
        return { variant: 'destructive' as const, text: 'Critical' };
      default:
        return { variant: 'outline' as const, text: 'Unknown' };
    }
  };

  const statusBadge = getStatusBadge(systemHealth.status);

  // Simulate additional metrics for comprehensive health monitoring
  const healthMetrics = [
    {
      name: 'System Uptime',
      value: systemHealth.uptime,
      max: 100,
      unit: '%',
      icon: <Server className="h-4 w-4 text-blue-500" />,
      status: systemHealth.uptime >= 99.5 ? 'healthy' : systemHealth.uptime >= 99 ? 'warning' : 'critical'
    },
    {
      name: 'Performance Score',
      value: systemHealth.performance,
      max: 100,
      unit: '%',
      icon: <Activity className="h-4 w-4 text-green-500" />,
      status: systemHealth.performance >= 90 ? 'healthy' : systemHealth.performance >= 80 ? 'warning' : 'critical'
    },
    {
      name: 'Resource Usage',
      value: systemHealth.resourceUsage,
      max: 100,
      unit: '%',
      icon: <Cpu className="h-4 w-4 text-purple-500" />,
      status: systemHealth.resourceUsage <= 70 ? 'healthy' : systemHealth.resourceUsage <= 85 ? 'warning' : 'critical'
    },
    {
      name: 'Network Latency',
      value: 85, // Simulated
      max: 100,
      unit: 'ms',
      icon: <Wifi className="h-4 w-4 text-orange-500" />,
      status: 85 <= 100 ? 'healthy' : 85 <= 200 ? 'warning' : 'critical'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon(systemHealth.status)}
          System Health
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          Overall system status and performance metrics
          <Badge variant={statusBadge.variant}>
            {statusBadge.text}
          </Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Health Score */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <span className="font-medium">Overall Health Score</span>
            </div>
            <div className={`text-2xl font-bold ${getStatusColor(systemHealth.status)}`}>
              {Math.round((systemHealth.uptime + systemHealth.performance + (100 - systemHealth.resourceUsage)) / 3)}%
            </div>
          </div>
          <Progress 
            value={Math.round((systemHealth.uptime + systemHealth.performance + (100 - systemHealth.resourceUsage)) / 3)}
            max={100}
            className="h-2"
          />
        </div>

        {/* Individual Metrics */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Detailed Metrics</h4>
          {healthMetrics.map((metric) => (
            <div key={metric.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {metric.icon}
                  <span className="text-sm font-medium">{metric.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">
                    {metric.value.toFixed(1)}{metric.unit}
                  </span>
                  <div className={`w-2 h-2 rounded-full ${
                    metric.status === 'healthy' ? 'bg-green-500' :
                    metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                </div>
              </div>
              <Progress 
                value={metric.name === 'Resource Usage' ? 100 - metric.value : metric.value} 
                max={metric.max}
                className="h-2"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>
                  {metric.status === 'healthy' ? 'Optimal' :
                   metric.status === 'warning' ? 'Attention needed' : 'Critical'}
                </span>
                <span>
                  Target: {metric.name === 'Resource Usage' ? '<70%' : 
                          metric.name === 'System Uptime' ? '>99.5%' :
                          metric.name === 'Performance Score' ? '>90%' : '<100ms'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* System Alerts */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Active Alerts</h4>
          <div className="space-y-2">
            {systemHealth.status === 'critical' && (
              <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-red-900">Critical System Issue</div>
                  <div className="text-red-700">
                    {systemHealth.uptime < 99 && 'System uptime below threshold. '}
                    {systemHealth.performance < 80 && 'Performance degradation detected. '}
                    {systemHealth.resourceUsage > 90 && 'High resource usage detected. '}
                    Immediate attention required.
                  </div>
                </div>
              </div>
            )}
            
            {systemHealth.status === 'warning' && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-yellow-900">System Warning</div>
                  <div className="text-yellow-700">
                    {systemHealth.uptime < 99.5 && systemHealth.uptime >= 99 && 'Uptime slightly below optimal. '}
                    {systemHealth.performance < 90 && systemHealth.performance >= 80 && 'Performance could be improved. '}
                    {systemHealth.resourceUsage > 80 && systemHealth.resourceUsage <= 90 && 'Resource usage is elevated. '}
                    Monitor closely.
                  </div>
                </div>
              </div>
            )}
            
            {systemHealth.status === 'healthy' && (
              <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-green-900">All Systems Operational</div>
                  <div className="text-green-700">
                    All metrics are within optimal ranges. System is performing well.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Recent Activity</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <span>System health check completed - 2 minutes ago</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-3 w-3" />
              <span>Performance metrics updated - 5 minutes ago</span>
            </div>
            <div className="flex items-center gap-2">
              <Server className="h-3 w-3" />
              <span>Resource usage optimized - 15 minutes ago</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2 text-xs text-blue-600">
            <button className="hover:underline">View detailed logs</button>
            <span className="text-gray-400">•</span>
            <button className="hover:underline">Configure alerts</button>
            <span className="text-gray-400">•</span>
            <button className="hover:underline">Performance history</button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}