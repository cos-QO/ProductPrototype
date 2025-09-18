import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Download, 
  Edit3, 
  AlertCircle,
  Eye,
  RefreshCw,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UploadSession, FieldMapping, ValidationError } from '../types';

interface DataPreviewStepProps {
  sessionData: UploadSession | null;
  fieldMappings: FieldMapping[];
  validationErrors: ValidationError[];
  setValidationErrors: (errors: ValidationError[]) => void;
  onNext: () => void;
}

// Validation summary component
const ValidationSummary: React.FC<{
  totalRecords: number;
  validRecords: number;
  errorRecords: number;
  warningRecords: number;
  onExportErrors?: () => void;
}> = ({ totalRecords, validRecords, errorRecords, warningRecords, onExportErrors }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
      <div className="text-2xl font-bold text-blue-600">{totalRecords}</div>
      <div className="text-sm text-muted-foreground">Total Records</div>
    </div>
    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
      <div className="text-2xl font-bold text-green-600">{validRecords}</div>
      <div className="text-sm text-muted-foreground">Valid Records</div>
    </div>
    <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
      <div className="text-2xl font-bold text-red-600">{errorRecords}</div>
      <div className="text-sm text-muted-foreground">Error Records</div>
    </div>
    <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
      <div className="text-2xl font-bold text-yellow-600">{warningRecords}</div>
      <div className="text-sm text-muted-foreground">Warning Records</div>
    </div>
  </div>
);

// Error display component
const ErrorDisplay: React.FC<{
  error: ValidationError;
  onFix?: (newValue: any) => void;
}> = ({ error, onFix }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(error.value));

  const handleSave = () => {
    if (onFix) {
      onFix(editValue);
    }
    setIsEditing(false);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative">
          {error.severity === 'error' ? (
            <XCircle className="h-4 w-4 text-red-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          )}
          {isEditing && (
            <div className="absolute top-6 left-0 z-10 bg-background border rounded-lg p-2 shadow-lg min-w-48">
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="mb-2"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
                autoFocus
              />
              <div className="flex space-x-2">
                <Button size="sm" onClick={handleSave}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="max-w-md">
          <p className="font-medium">{error.message}</p>
          {error.suggestion && (
            <p className="text-blue-400 mt-1">💡 {error.suggestion}</p>
          )}
          {error.autoFix && (
            <p className="text-green-400 mt-1">
              🔧 Auto-fix available: {error.autoFix.action}
            </p>
          )}
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => setIsEditing(true)}
          >
            <Edit3 className="h-3 w-3 mr-1" />
            Edit Value
          </Button>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

export const DataPreviewStep: React.FC<DataPreviewStepProps> = ({
  sessionData,
  fieldMappings,
  validationErrors,
  setValidationErrors,
  onNext,
}) => {
  const { toast } = useToast();
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const recordsPerPage = 20;

  // Fetch preview data
  const previewQuery = useQuery({
    queryKey: ['dataPreview', sessionData?.id, fieldMappings],
    queryFn: async () => {
      if (!sessionData?.id) throw new Error('No session');
      
      const response = await apiRequest('GET', `/api/preview/${sessionData.id}`, {
        params: {
          mappings: JSON.stringify(fieldMappings),
          limit: 100, // Get more data for comprehensive preview
        },
      });
      
      return response;
    },
    enabled: !!sessionData?.id && fieldMappings.length > 0,
  });

  // Auto-fix errors mutation
  const autoFixMutation = useMutation({
    mutationFn: async (errors: ValidationError[]) => {
      if (!sessionData?.id) throw new Error('No session');
      
      const response = await apiRequest('POST', `/api/recovery/${sessionData.id}/auto-fix`, {
        errors: errors.filter(e => e.autoFix),
      });
      
      return response;
    },
    onSuccess: (data) => {
      setValidationErrors(data.remainingErrors || []);
      toast({
        title: 'Auto-fix Applied',
        description: `Fixed ${data.fixedCount} errors automatically`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Auto-fix Failed',
        description: error.message || 'Failed to apply auto-fixes',
        variant: 'destructive',
      });
    },
  });

  // Export errors mutation
  const exportErrorsMutation = useMutation({
    mutationFn: async () => {
      if (!sessionData?.id) throw new Error('No session');
      
      const response = await fetch(`/api/import/${sessionData.id}/errors/export`);
      if (!response.ok) throw new Error('Failed to export errors');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `import-errors-${sessionData.id}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({
        title: 'Errors Exported',
        description: 'Error report has been downloaded',
      });
    },
    onError: () => {
      toast({
        title: 'Export Failed',
        description: 'Failed to export error report',
        variant: 'destructive',
      });
    },
  });

  // Process preview data
  useEffect(() => {
    if (previewQuery.data) {
      setPreviewData(previewQuery.data.previewData || []);
      setValidationErrors(previewQuery.data.validationErrors || []);
    }
  }, [previewQuery.data, setValidationErrors]);

  // Get errors for a specific record and field
  const getFieldError = (recordIndex: number, field: string) => {
    return validationErrors.find(e => 
      e.recordIndex === recordIndex && e.field === field
    );
  };

  // Get errors for a specific record
  const getRecordErrors = (recordIndex: number) => {
    return validationErrors.filter(e => e.recordIndex === recordIndex);
  };

  // Calculate statistics
  const totalRecords = previewData.length;
  const errorRecords = new Set(validationErrors.filter(e => e.severity === 'error').map(e => e.recordIndex)).size;
  const warningRecords = new Set(validationErrors.filter(e => e.severity === 'warning').map(e => e.recordIndex)).size;
  const validRecords = totalRecords - errorRecords;

  // Filter data for display
  const filteredData = showErrorsOnly 
    ? previewData.filter((_, index) => getRecordErrors(index).length > 0)
    : previewData;

  // Paginate data
  const startIndex = currentPage * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredData.length / recordsPerPage);

  // Check if we can proceed (no error-level validation issues)
  const canProceed = validationErrors.filter(e => e.severity === 'error').length === 0;

  // Auto-fixable errors
  const autoFixableErrors = validationErrors.filter(e => e.autoFix);

  if (previewQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Generating Data Preview...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
              <Skeleton className="h-64" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (previewQuery.error) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to generate data preview. Please check your field mappings and try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Validation Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Data Preview & Validation</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Review your data and resolve any validation errors before importing
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {autoFixableErrors.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => autoFixMutation.mutate(autoFixableErrors)}
                    disabled={autoFixMutation.isPending}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Auto-fix ({autoFixableErrors.length})
                  </Button>
                )}
                {validationErrors.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => exportErrorsMutation.mutate()}
                    disabled={exportErrorsMutation.isPending}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export Errors
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowErrorsOnly(!showErrorsOnly)}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  {showErrorsOnly ? 'Show All' : 'Errors Only'}
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <ValidationSummary
              totalRecords={totalRecords}
              validRecords={validRecords}
              errorRecords={errorRecords}
              warningRecords={warningRecords}
              onExportErrors={() => exportErrorsMutation.mutate()}
            />
          </CardContent>
        </Card>

        {/* Validation Status */}
        {!canProceed && (
          <Alert>
            <XCircle className="h-4 w-4" />
            <AlertTitle>Validation Errors Found</AlertTitle>
            <AlertDescription>
              {errorRecords} records have validation errors that must be resolved before importing.
              Use the auto-fix feature or edit individual values to resolve issues.
            </AlertDescription>
          </Alert>
        )}

        {canProceed && validationErrors.length === 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>All Data Valid</AlertTitle>
            <AlertDescription>
              Your data has passed all validation checks and is ready for import!
            </AlertDescription>
          </Alert>
        )}

        {canProceed && warningRecords > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Warnings Detected</AlertTitle>
            <AlertDescription>
              {warningRecords} records have warnings. These won't prevent import but should be reviewed.
            </AlertDescription>
          </Alert>
        )}

        {/* Data Preview Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Data Preview
                {showErrorsOnly && (
                  <Badge variant="outline" className="ml-2">
                    Errors Only
                  </Badge>
                )}
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredData.length)} of {filteredData.length} records
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <ScrollArea className="h-96">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      {fieldMappings.map((mapping) => (
                        <TableHead key={mapping.targetField} className="min-w-32">
                          {mapping.targetField}
                        </TableHead>
                      ))}
                      <TableHead className="w-16">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((row, index) => {
                      const recordIndex = startIndex + index;
                      const recordErrors = getRecordErrors(recordIndex);
                      const hasErrors = recordErrors.some(e => e.severity === 'error');
                      const hasWarnings = recordErrors.some(e => e.severity === 'warning');
                      
                      return (
                        <TableRow 
                          key={recordIndex}
                          className={cn(
                            hasErrors && "bg-red-50 dark:bg-red-900/20",
                            !hasErrors && hasWarnings && "bg-yellow-50 dark:bg-yellow-900/20"
                          )}
                        >
                          <TableCell className="font-mono text-sm">
                            {recordIndex + 1}
                          </TableCell>
                          
                          {fieldMappings.map((mapping) => {
                            const value = row[mapping.sourceField];
                            const error = getFieldError(recordIndex, mapping.targetField);
                            
                            return (
                              <TableCell key={mapping.targetField} className="relative">
                                <div className="flex items-center space-x-2">
                                  <span className={cn(
                                    "truncate max-w-32",
                                    error && error.severity === 'error' && "line-through text-muted-foreground"
                                  )}>
                                    {String(value)}
                                  </span>
                                  {error && (
                                    <ErrorDisplay 
                                      error={error}
                                      onFix={(newValue) => {
                                        // Update the value and re-validate
                                        // This would trigger a re-validation API call
                                        console.log('Fix value:', newValue);
                                      }}
                                    />
                                  )}
                                </div>
                              </TableCell>
                            );
                          })}
                          
                          <TableCell>
                            {hasErrors ? (
                              <Badge variant="destructive">Error</Badge>
                            ) : hasWarnings ? (
                              <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                                Warning
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Valid</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                >
                  Previous
                </Button>
                
                <span className="text-sm text-muted-foreground">
                  Page {currentPage + 1} of {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                  disabled={currentPage === totalPages - 1}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error Summary */}
        {validationErrors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Validation Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-40">
                <div className="space-y-2">
                  {validationErrors.slice(0, 50).map((error, index) => (
                    <div 
                      key={index}
                      className={cn(
                        "p-3 rounded-lg text-sm",
                        error.severity === 'error' ? "bg-red-50 dark:bg-red-900/20" : "bg-yellow-50 dark:bg-yellow-900/20"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">
                            Row {error.recordIndex + 1}, Field: {error.field}
                          </p>
                          <p className="text-muted-foreground">
                            Value: "{error.value}" - {error.message}
                          </p>
                          {error.suggestion && (
                            <p className="text-blue-600 dark:text-blue-400 mt-1">
                              💡 {error.suggestion}
                            </p>
                          )}
                        </div>
                        {error.autoFix && (
                          <Badge variant="outline" className="text-xs">
                            Auto-fixable
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {validationErrors.length > 50 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      And {validationErrors.length - 50} more errors...
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
};

export default DataPreviewStep;