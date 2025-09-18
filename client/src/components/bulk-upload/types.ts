// Enhanced Bulk Upload Types
// TypeScript interfaces for the comprehensive bulk upload system

export interface UploadSession {
  id: string;
  userId: number;
  fileName: string;
  fileSize: number;
  fileFormat: 'csv' | 'json' | 'xlsx';
  status: 'initiated' | 'analyzing' | 'mapping' | 'previewing' | 'importing' | 'completed' | 'failed';
  recordCount: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface SourceField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  sampleValues: any[];
  valueCount: number;
  nullCount: number;
  uniqueCount: number;
  confidence?: number;
  mappedTo?: string;
}

export interface TargetField {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  required: boolean;
  description?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  confidence: number;
  isManual: boolean;
  transformations?: {
    type: string;
    config: Record<string, any>;
  }[];
}

export interface ValidationError {
  recordIndex: number;
  field: string;
  value: any;
  rule: string;
  severity: 'error' | 'warning';
  message: string;
  suggestion?: string;
  autoFix?: {
    action: string;
    newValue: any;
    confidence: number;
  };
}

export interface ImportProgress {
  sessionId: string;
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  currentBatch: number;
  totalBatches: number;
  processingRate: number;
  estimatedTimeRemaining: number;
  status: 'running' | 'paused' | 'completed' | 'failed';
  errors: ValidationError[];
  startTime: string;
  endTime?: string;
}

export interface ImportResults {
  sessionId: string;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  processingTime: number;
  brandId?: number;
  errors: ValidationError[];
  summary: {
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
}

export interface BulkUploadWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (results: ImportResults) => void;
}

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  isValid?: boolean;
  canSkip?: boolean;
}

export interface FileUploadZoneProps {
  onFileSelect: (files: File[]) => void;
  acceptedTypes: string[];
  maxSize: number;
  multiple?: boolean;
  isLoading?: boolean;
}

export interface FieldMappingTableProps {
  sourceFields: SourceField[];
  targetFields: TargetField[];
  mappings: FieldMapping[];
  onMappingChange: (sourceField: string, targetField: string) => void;
  onBulkAction: (action: 'accept-high-confidence' | 'clear-all' | 'auto-map') => void;
  isLoading?: boolean;
}

export interface DataPreviewTableProps {
  sessionId: string;
  previewData: any[];
  validationErrors: ValidationError[];
  fieldMappings: FieldMapping[];
  onErrorFix: (recordIndex: number, field: string, newValue: any) => void;
  onBulkFix: (errors: ValidationError[]) => void;
  isLoading?: boolean;
}

export interface ImportProgressProps {
  sessionId: string;
  progress: ImportProgress;
  onCancel: () => void;
  onPause?: () => void;
  onResume?: () => void;
  showDetails?: boolean;
}

export interface ProgressTrackerProps {
  progress: ImportProgress;
  showDetails?: boolean;
  className?: string;
}

export interface ConfidenceIndicatorProps {
  confidence: number;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export interface ErrorDisplayProps {
  errors: ValidationError[];
  onErrorResolve: (error: ValidationError, resolution: any) => void;
  onBulkResolve: (errors: ValidationError[], resolution: any) => void;
  showBulkActions?: boolean;
}

export interface ValidationSummaryProps {
  totalRecords: number;
  validRecords: number;
  errorRecords: number;
  warningRecords: number;
  onExportErrors?: () => void;
}

export interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
  className?: string;
}

// WebSocket Message Types
export interface WebSocketMessage {
  type: 'progress' | 'completed' | 'error' | 'mapping_suggestions' | 'validation_update';
  sessionId: string;
  data: any;
  timestamp: string;
}

export interface ProgressMessage extends WebSocketMessage {
  type: 'progress';
  data: ImportProgress;
}

export interface CompletionMessage extends WebSocketMessage {
  type: 'completed';
  data: ImportResults;
}

export interface ErrorMessage extends WebSocketMessage {
  type: 'error';
  data: {
    message: string;
    code?: string;
    details?: any;
  };
}

export interface MappingSuggestionsMessage extends WebSocketMessage {
  type: 'mapping_suggestions';
  data: {
    suggestions: FieldMapping[];
    confidence: number;
  };
}

// API Response Types
export interface UploadAnalysisResponse {
  sessionId: string;
  sourceFields: SourceField[];
  recordCount: number;
  previewData: any[];
  detectedFormat: string;
  warnings: string[];
}

export interface MappingAnalysisResponse {
  sessionId: string;
  suggestions: FieldMapping[];
  targetFields: TargetField[];
  confidence: number;
  conflicts: string[];
}

export interface PreviewResponse {
  sessionId: string;
  previewData: any[];
  validationErrors: ValidationError[];
  statistics: {
    totalRecords: number;
    validRecords: number;
    errorRecords: number;
    warningRecords: number;
  };
}

export interface ImportExecutionResponse {
  sessionId: string;
  status: 'started' | 'queued';
  estimatedCompletionTime?: string;
}

// Error Types for Error Handling
export interface BulkUploadError extends Error {
  code: string;
  type: 'FILE_UPLOAD' | 'FIELD_MAPPING' | 'DATA_VALIDATION' | 'IMPORT_EXECUTION' | 'NETWORK' | 'SYSTEM';
  details?: any;
  recoverable: boolean;
  suggestions?: string[];
}

export interface ErrorRecoveryAction {
  type: 'retry' | 'skip' | 'fix' | 'cancel' | 'contact_support';
  label: string;
  description: string;
  action: () => void;
}

// Utility Types
export type WizardStepId = 'upload' | 'mapping' | 'preview' | 'import';
export type FileFormat = 'csv' | 'json' | 'xlsx';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type ValidationSeverity = 'error' | 'warning' | 'info';

// Form Types for Components
export interface BulkUploadFormData {
  file?: File;
  mappings: FieldMapping[];
  importOptions: {
    brandId?: number;
    skipErrors: boolean;
    updateExisting: boolean;
    createMissing: boolean;
  };
}

export interface FieldMappingFormData {
  [sourceField: string]: string; // target field
}

export interface ImportOptionsFormData {
  brandId?: number;
  skipErrors: boolean;
  updateExisting: boolean;
  createMissing: boolean;
  notificationPreferences: {
    emailOnComplete: boolean;
    emailOnError: boolean;
  };
}