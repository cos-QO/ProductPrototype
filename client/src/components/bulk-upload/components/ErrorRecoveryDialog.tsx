import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Edit3,
  Zap,
  SkipForward
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ValidationError } from '../types';

interface ErrorRecoveryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  errors: ValidationError[];
  sessionId: string;
  onErrorsResolved: (resolvedErrors: ValidationError[]) => void;
}

interface ErrorGroup {
  rule: string;
  errors: ValidationError[];
  canAutoFix: boolean;
  fixAction?: string;
}

export const ErrorRecoveryDialog: React.FC<ErrorRecoveryDialogProps> = ({
  isOpen,
  onClose,
  errors,
  sessionId,
  onErrorsResolved,
}) => {
  const { toast } = useToast();
  const [currentErrorIndex, setCurrentErrorIndex] = useState(0);
  const [resolvedErrors, setResolvedErrors] = useState<Set<number>>(new Set());
  const [editingError, setEditingError] = useState<ValidationError | null>(null);
  const [editValue, setEditValue] = useState('');
  const [view, setView] = useState<'individual' | 'bulk'>('individual');

  // Group errors by rule for bulk actions
  const errorGroups: ErrorGroup[] = errors.reduce((groups, error, index) => {
    const existing = groups.find(g => g.rule === error.rule);
    const errorWithIndex = { ...error, originalIndex: index };
    
    if (existing) {
      existing.errors.push(errorWithIndex);
    } else {
      groups.push({
        rule: error.rule,
        errors: [errorWithIndex],
        canAutoFix: !!error.autoFix,
        fixAction: error.autoFix?.action,
      });
    }
    return groups;
  }, [] as ErrorGroup[]);

  // Apply single fix mutation
  const applyFixMutation = useMutation({
    mutationFn: async ({ error, newValue }: { error: ValidationError; newValue: any }) => {
      const response = await apiRequest('POST', `/api/recovery/${sessionId}/fix-single`, {
        recordIndex: error.recordIndex,
        field: error.field,
        newValue,
      });
      return response;
    },
    onSuccess: (data, variables) => {
      const errorIndex = errors.findIndex(e => 
        e.recordIndex === variables.error.recordIndex && e.field === variables.error.field
      );
      if (errorIndex !== -1) {
        setResolvedErrors(prev => new Set([...prev, errorIndex]));
      }
      toast({
        title: 'Error Fixed',
        description: 'Value has been updated successfully',
      });
      setEditingError(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Fix Failed',
        description: error.message || 'Failed to apply fix',
        variant: 'destructive',
      });
    },
  });

  // Apply bulk fix mutation
  const applyBulkFixMutation = useMutation({
    mutationFn: async (group: ErrorGroup) => {
      const response = await apiRequest('POST', `/api/recovery/${sessionId}/fix-bulk`, {
        rule: group.rule,
        errors: group.errors,
      });
      return response;
    },
    onSuccess: (data, group) => {
      const fixedIndices = group.errors
        .map(e => errors.findIndex(err => 
          err.recordIndex === e.recordIndex && err.field === e.field
        ))
        .filter(index => index !== -1);
      
      setResolvedErrors(prev => new Set([...prev, ...fixedIndices]));
      
      toast({
        title: 'Bulk Fix Applied',
        description: `Fixed ${group.errors.length} similar errors`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Bulk Fix Failed',
        description: error.message || 'Failed to apply bulk fix',
        variant: 'destructive',
      });
    },
  });

  // Skip error
  const skipError = (errorIndex: number) => {
    setResolvedErrors(prev => new Set([...prev, errorIndex]));
    if (currentErrorIndex === errorIndex && currentErrorIndex < errors.length - 1) {
      setCurrentErrorIndex(prev => prev + 1);
    }
  };

  // Skip all errors of same type
  const skipAllOfType = (rule: string) => {
    const indices = errors
      .map((error, index) => error.rule === rule ? index : -1)
      .filter(index => index !== -1);
    
    setResolvedErrors(prev => new Set([...prev, ...indices]));
    
    toast({
      title: 'Errors Skipped',
      description: `Skipped ${indices.length} errors of type: ${rule}`,
    });
  };

  // Start editing an error
  const startEditing = (error: ValidationError) => {
    setEditingError(error);
    setEditValue(String(error.value));
  };

  // Apply edit
  const applyEdit = () => {
    if (editingError) {
      applyFixMutation.mutate({ error: editingError, newValue: editValue });
    }
  };

  // Navigate through errors
  const goToNextError = () => {
    let nextIndex = currentErrorIndex + 1;
    while (nextIndex < errors.length && resolvedErrors.has(nextIndex)) {
      nextIndex++;
    }
    if (nextIndex < errors.length) {
      setCurrentErrorIndex(nextIndex);
    }
  };

  const goToPrevError = () => {
    let prevIndex = currentErrorIndex - 1;
    while (prevIndex >= 0 && resolvedErrors.has(prevIndex)) {
      prevIndex--;
    }
    if (prevIndex >= 0) {
      setCurrentErrorIndex(prevIndex);
    }
  };

  // Finish and close
  const handleFinish = () => {
    const resolvedErrorsList = Array.from(resolvedErrors).map(index => errors[index]);
    onErrorsResolved(resolvedErrorsList);
    onClose();
  };

  const totalErrors = errors.length;
  const resolvedCount = resolvedErrors.size;
  const remainingCount = totalErrors - resolvedCount;
  const progressPercentage = (resolvedCount / totalErrors) * 100;

  const currentError = errors[currentErrorIndex];
  const isCurrentResolved = resolvedErrors.has(currentErrorIndex);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Error Recovery Assistant</DialogTitle>
          <DialogDescription>
            Resolve validation errors to improve your import success rate
          </DialogDescription>
        </DialogHeader>

        {/* Progress Overview */}
        <div className="flex-shrink-0 space-y-4">
          <Progress value={progressPercentage} className="h-2" />
          <div className="flex justify-between text-sm">
            <span>{resolvedCount} resolved</span>
            <span>{remainingCount} remaining</span>
            <span>{totalErrors} total</span>
          </div>
        </div>

        {/* View Selector */}
        <div className="flex-shrink-0 flex space-x-2">
          <Button
            variant={view === 'individual' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('individual')}
          >
            Individual ({remainingCount})
          </Button>
          <Button
            variant={view === 'bulk' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('bulk')}
          >
            Bulk Actions ({errorGroups.length} types)
          </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {view === 'individual' ? (
            /* Individual Error View */
            <div className="space-y-4">
              {currentError && !isCurrentResolved ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        Error {currentErrorIndex + 1} of {totalErrors}
                      </CardTitle>
                      <Badge variant="destructive">
                        {currentError.severity}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Error Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Record</Label>
                        <p className="text-sm font-mono">Row {currentError.recordIndex + 1}</p>
                      </div>
                      <div>
                        <Label>Field</Label>
                        <p className="text-sm font-mono">{currentError.field}</p>
                      </div>
                      <div>
                        <Label>Current Value</Label>
                        <p className="text-sm font-mono bg-muted p-2 rounded">
                          "{currentError.value}"
                        </p>
                      </div>
                      <div>
                        <Label>Issue</Label>
                        <p className="text-sm">{currentError.message}</p>
                      </div>
                    </div>

                    {/* Suggestion */}
                    {currentError.suggestion && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          💡 <strong>Suggestion:</strong> {currentError.suggestion}
                        </p>
                      </div>
                    )}

                    {/* Auto-fix option */}
                    {currentError.autoFix && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-green-800 dark:text-green-200">
                              🔧 <strong>Auto-fix available:</strong> {currentError.autoFix.action}
                            </p>
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                              New value: "{currentError.autoFix.newValue}"
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => applyFixMutation.mutate({ 
                              error: currentError, 
                              newValue: currentError.autoFix!.newValue 
                            })}
                            disabled={applyFixMutation.isPending}
                          >
                            <Zap className="mr-2 h-4 w-4" />
                            Apply Fix
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Manual edit */}
                    <div className="space-y-2">
                      <Label>Manual Correction</Label>
                      <div className="flex space-x-2">
                        <Input
                          value={editingError?.recordIndex === currentError.recordIndex ? editValue : String(currentError.value)}
                          onChange={(e) => {
                            if (!editingError) startEditing(currentError);
                            setEditValue(e.target.value);
                          }}
                          onFocus={() => startEditing(currentError)}
                        />
                        <Button
                          onClick={applyEdit}
                          disabled={applyFixMutation.isPending || !editingError}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Apply
                        </Button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => skipError(currentErrorIndex)}
                      >
                        <SkipForward className="mr-2 h-4 w-4" />
                        Skip This Error
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => skipAllOfType(currentError.rule)}
                      >
                        Skip All Similar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">All Errors Resolved!</h3>
                    <p className="text-muted-foreground">
                      You've successfully resolved all validation errors.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Navigation */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={goToPrevError}
                  disabled={currentErrorIndex === 0}
                >
                  Previous Error
                </Button>
                <Button
                  variant="outline"
                  onClick={goToNextError}
                  disabled={currentErrorIndex >= errors.length - 1}
                >
                  Next Error
                </Button>
              </div>
            </div>
          ) : (
            /* Bulk Actions View */
            <div className="space-y-4">
              {errorGroups.map((group, index) => (
                <Card key={group.rule}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{group.rule}</CardTitle>
                      <Badge variant="outline">
                        {group.errors.length} errors
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-2">
                          Sample error: {group.errors[0].message}
                        </p>
                        {group.canAutoFix && (
                          <p className="text-sm text-green-600 dark:text-green-400">
                            🔧 Auto-fix available: {group.fixAction}
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        {group.canAutoFix && (
                          <Button
                            size="sm"
                            onClick={() => applyBulkFixMutation.mutate(group)}
                            disabled={applyBulkFixMutation.isPending}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Auto-Fix All
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => skipAllOfType(group.rule)}
                        >
                          Skip All
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleFinish}
            className="gradient-primary text-white"
          >
            {resolvedCount > 0 ? `Continue with ${resolvedCount} Fixes` : 'Skip All Errors'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ErrorRecoveryDialog;