import React, { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Settings,
  Filter,
  Trash2,
  AlertTriangle,
  Clock,
  Users,
  Zap,
  ChevronRight,
  Circle,
  MoreHorizontal,
  X,
} from 'lucide-react';

import { RiskIndicator } from './RiskIndicator';

import type {
  ApprovalNotification,
  NotificationPreferences,
  RiskLevel,
} from '@/types/approval-types';

interface NotificationCenterProps {
  userId: string;
  notifications: ApprovalNotification[];
  unreadCount: number;
  onNotificationClick: (notification: ApprovalNotification) => void;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (notificationId: string) => void;
  onUpdatePreferences: (preferences: Partial<NotificationPreferences>) => void;
  preferences?: NotificationPreferences;
  className?: string;
}

interface NotificationItemProps {
  notification: ApprovalNotification;
  onRead: (id: string) => void;
  onClick: (notification: ApprovalNotification) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}

const getNotificationIcon = (type: ApprovalNotification['type']) => {
  const iconMap = {
    new_approval: Bell,
    deadline_warning: Clock,
    decision_made: Check,
    escalation: AlertTriangle,
    timeout: AlertTriangle,
  };
  return iconMap[type] || Bell;
};

const getNotificationColor = (priority: ApprovalNotification['priority']): string => {
  const colorMap = {
    low: 'text-blue-600 bg-blue-50 border-blue-200',
    medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    high: 'text-orange-600 bg-orange-50 border-orange-200',
    critical: 'text-red-600 bg-red-50 border-red-200',
  };
  return colorMap[priority] || colorMap.medium;
};

const getPriorityBadgeVariant = (priority: ApprovalNotification['priority']) => {
  const variantMap = {
    low: 'secondary' as const,
    medium: 'default' as const,
    high: 'destructive' as const,
    critical: 'destructive' as const,
  };
  return variantMap[priority] || 'default';
};

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onRead,
  onClick,
  onDelete,
  compact = false,
}) => {
  const Icon = getNotificationIcon(notification.type);
  const colorClasses = getNotificationColor(notification.priority);
  
  const isUrgent = notification.priority === 'critical' || notification.priority === 'high';
  const isRecent = Date.now() - notification.timestamp.getTime() < 5 * 60 * 1000; // 5 minutes

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onClick(notification);
    if (!notification.read) {
      onRead(notification.id);
    }
  }, [notification, onClick, onRead]);

  const handleMarkAsRead = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRead(notification.id);
  }, [notification.id, onRead]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(notification.id);
  }, [notification.id, onDelete]);

  if (compact) {
    return (
      <div
        className={`
          p-2 border-l-4 cursor-pointer transition-all duration-200 hover:bg-muted/50
          ${notification.read ? 'opacity-70' : 'bg-background'}
          ${isUrgent ? 'border-l-red-500' : 'border-l-blue-500'}
          ${isRecent && !notification.read ? 'animate-pulse' : ''}
        `}
        onClick={handleClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <Icon className={`h-4 w-4 flex-shrink-0 ${isUrgent ? 'text-red-600' : 'text-blue-600'}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{notification.title}</p>
              <p className="text-xs text-muted-foreground truncate">
                {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            {!notification.read && (
              <Circle className="h-2 w-2 fill-blue-600 text-blue-600" />
            )}
            <Badge 
              variant={getPriorityBadgeVariant(notification.priority)}
              className="text-xs h-5"
            >
              {notification.priority}
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md
        ${notification.read ? 'opacity-80' : 'bg-background shadow-sm'}
        ${colorClasses}
        ${isRecent && !notification.read ? 'ring-2 ring-blue-300 animate-pulse' : ''}
      `}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 min-w-0 flex-1">
          <div className={`
            p-2 rounded-full flex-shrink-0
            ${isUrgent ? 'bg-red-100' : 'bg-blue-100'}
          `}>
            <Icon className={`h-4 w-4 ${isUrgent ? 'text-red-600' : 'text-blue-600'}`} />
          </div>
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-medium text-sm">{notification.title}</h4>
              {!notification.read && (
                <Circle className="h-2 w-2 fill-blue-600 text-blue-600 flex-shrink-0" />
              )}
            </div>
            
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
              {notification.message}
            </p>
            
            <div className="flex items-center space-x-3 text-xs text-muted-foreground">
              <span>{formatDistanceToNow(notification.timestamp, { addSuffix: true })}</span>
              
              <Badge 
                variant={getPriorityBadgeVariant(notification.priority)}
                className="text-xs h-5"
              >
                {notification.priority}
              </Badge>
              
              {notification.metadata?.riskLevel && (
                <RiskIndicator
                  riskLevel={notification.metadata.riskLevel as RiskLevel}
                  riskScore={notification.metadata.riskScore || 0}
                  riskFactors={[]}
                  size="small"
                />
              )}
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!notification.read && (
              <DropdownMenuItem onClick={handleMarkAsRead}>
                <Check className="h-4 w-4 mr-2" />
                Mark as read
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onClick(notification)}>
              <ChevronRight className="h-4 w-4 mr-2" />
              View details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

const NotificationPreferences: React.FC<{
  preferences: NotificationPreferences;
  onUpdate: (preferences: Partial<NotificationPreferences>) => void;
  onClose: () => void;
}> = ({ preferences, onUpdate, onClose }) => {
  const [localPrefs, setLocalPrefs] = useState(preferences);

  const handleSave = () => {
    onUpdate(localPrefs);
    onClose();
  };

  return (
    <div className="space-y-6 p-4">
      <div>
        <h3 className="font-semibold mb-3">Notification Types</h3>
        <div className="space-y-3">
          {Object.entries(localPrefs.types).map(([type, enabled]) => (
            <div key={type} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </p>
                <p className="text-xs text-muted-foreground">
                  {type === 'newApproval' && 'New approval requests assigned to you'}
                  {type === 'deadlineWarning' && 'Approaching deadlines for pending approvals'}
                  {type === 'decisionMade' && 'Decisions made on your approval requests'}
                  {type === 'escalation' && 'Approvals escalated to you'}
                  {type === 'timeout' && 'Approvals that have timed out'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setLocalPrefs(prev => ({
                  ...prev,
                  types: { ...prev.types, [type]: e.target.checked }
                }))}
                className="rounded"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Notification Channels</h3>
        <div className="space-y-3">
          {Object.entries(localPrefs.channels).map(([channel, enabled]) => (
            <div key={channel} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {channel.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </p>
                <p className="text-xs text-muted-foreground">
                  {channel === 'inApp' && 'Show notifications in the application'}
                  {channel === 'email' && 'Send email notifications'}
                  {channel === 'push' && 'Browser push notifications'}
                  {channel === 'sms' && 'SMS text messages (critical only)'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setLocalPrefs(prev => ({
                  ...prev,
                  channels: { ...prev.channels, [channel]: e.target.checked }
                }))}
                className="rounded"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Schedule</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Business Hours Only</p>
              <p className="text-xs text-muted-foreground">
                Only send notifications during business hours (except critical)
              </p>
            </div>
            <input
              type="checkbox"
              checked={localPrefs.schedule.businessHoursOnly}
              onChange={(e) => setLocalPrefs(prev => ({
                ...prev,
                schedule: { ...prev.schedule, businessHoursOnly: e.target.checked }
              }))}
              className="rounded"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Quiet Hours</label>
            <div className="flex items-center space-x-2 mt-1">
              <input
                type="time"
                value={localPrefs.schedule.quietHours.start}
                onChange={(e) => setLocalPrefs(prev => ({
                  ...prev,
                  schedule: {
                    ...prev.schedule,
                    quietHours: { ...prev.schedule.quietHours, start: e.target.value }
                  }
                }))}
                className="text-xs border rounded px-2 py-1"
              />
              <span className="text-xs">to</span>
              <input
                type="time"
                value={localPrefs.schedule.quietHours.end}
                onChange={(e) => setLocalPrefs(prev => ({
                  ...prev,
                  schedule: {
                    ...prev.schedule,
                    quietHours: { ...prev.schedule.quietHours, end: e.target.value }
                  }
                }))}
                className="text-xs border rounded px-2 py-1"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          Save Preferences
        </Button>
      </div>
    </div>
  );
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  userId,
  notifications,
  unreadCount,
  onNotificationClick,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onUpdatePreferences,
  preferences,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');

  // Filter notifications based on current filter
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'critical') return notification.priority === 'critical';
    return true;
  });

  // Group notifications by date
  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const date = notification.timestamp.toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(notification);
    return groups;
  }, {} as Record<string, ApprovalNotification[]>);

  // Sort dates (most recent first)
  const sortedDates = Object.keys(groupedNotifications).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  const criticalCount = notifications.filter(n => 
    n.priority === 'critical' && !n.read
  ).length;

  const defaultPreferences: NotificationPreferences = {
    types: {
      newApproval: true,
      deadlineWarning: true,
      decisionMade: true,
      escalation: true,
      timeout: true,
    },
    channels: {
      inApp: true,
      email: true,
      push: false,
      sms: false,
    },
    schedule: {
      businessHoursOnly: false,
      timezone: 'UTC',
      quietHours: {
        start: '22:00',
        end: '08:00',
      },
    },
  };

  const userPreferences = preferences || defaultPreferences;

  // Auto-open for critical notifications
  useEffect(() => {
    if (criticalCount > 0 && !isOpen) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [criticalCount, isOpen]);

  const handleNotificationClick = useCallback((notification: ApprovalNotification) => {
    onNotificationClick(notification);
    if (notification.actionUrl) {
      // Navigate to approval if action URL is provided
      window.location.href = notification.actionUrl;
    }
  }, [onNotificationClick]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`relative ${className}`}
        >
          {unreadCount > 0 ? (
            <BellRing className={`h-5 w-5 ${criticalCount > 0 ? 'text-red-600 animate-pulse' : ''}`} />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          
          {unreadCount > 0 && (
            <Badge
              variant={criticalCount > 0 ? 'destructive' : 'default'}
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-lg p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="flex items-center gap-2">
                  Notifications
                  {unreadCount > 0 && (
                    <Badge variant="secondary">{unreadCount} unread</Badge>
                  )}
                </SheetTitle>
                <SheetDescription>
                  Approval system notifications and updates
                </SheetDescription>
              </div>

              <div className="flex items-center space-x-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setFilter('all')}>
                      All notifications
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilter('unread')}>
                      Unread only
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilter('critical')}>
                      Critical only
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreferences(true)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Action buttons */}
            {unreadCount > 0 && (
              <div className="flex items-center space-x-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onMarkAllAsRead}
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Mark all read
                </Button>
                
                {criticalCount > 0 && (
                  <Badge variant="destructive" className="animate-pulse">
                    <Zap className="h-3 w-3 mr-1" />
                    {criticalCount} critical
                  </Badge>
                )}
              </div>
            )}
          </SheetHeader>

          <ScrollArea className="flex-1">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center p-4">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No notifications</h3>
                <p className="text-sm text-muted-foreground">
                  {filter === 'unread' 
                    ? "You're all caught up! No unread notifications."
                    : filter === 'critical'
                    ? "No critical notifications at this time."
                    : "You'll see approval notifications here."}
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {sortedDates.map(date => (
                  <div key={date}>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3 sticky top-0 bg-background/80 backdrop-blur-sm">
                      {new Date(date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </h4>
                    <div className="space-y-2">
                      {groupedNotifications[date]
                        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                        .map(notification => (
                          <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onRead={onMarkAsRead}
                            onClick={handleNotificationClick}
                            onDelete={onDeleteNotification}
                          />
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>

      {/* Preferences Dialog */}
      <Sheet open={showPreferences} onOpenChange={setShowPreferences}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader className="mb-6">
            <SheetTitle>Notification Preferences</SheetTitle>
            <SheetDescription>
              Configure how and when you receive approval notifications
            </SheetDescription>
          </SheetHeader>
          
          <NotificationPreferences
            preferences={userPreferences}
            onUpdate={onUpdatePreferences}
            onClose={() => setShowPreferences(false)}
          />
        </SheetContent>
      </Sheet>
    </Sheet>
  );
};