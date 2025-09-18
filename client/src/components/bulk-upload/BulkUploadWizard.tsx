import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';

// Import step components
import { FileUploadStep } from './steps/FileUploadStep';
import { FieldMappingStep } from './steps/FieldMappingStep';
import { DataPreviewStep } from './steps/DataPreviewStep';
import { ImportExecutionStep } from './steps/ImportExecutionStep';

// Import accessibility hooks
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';

// Import types
import type {
  BulkUploadWizardProps,
  WizardStep,
  UploadSession,
  FieldMapping,
  ValidationError,
  ImportProgress,
  ImportResults,
  WizardStepId,
} from './types';

export const BulkUploadWizard: React.FC<BulkUploadWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const { toast } = useToast();
  
  // Wizard state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [sessionData, setSessionData] = useState<UploadSession | null>(null);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [isSessionValid, setIsSessionValid] = useState(false);
  
  // WebSocket connection for real-time updates
  const [ws, setWs] = useState<WebSocket | null>(null);
  
  // Define enhanced 3-step wizard flow
  const wizardSteps: WizardStep[] = [
    {
      id: 'upload',
      title: 'Uploading',
      description: 'Select file and configure upload',
      component: FileUploadStep,
      isValid: !!sessionData && (sessionData.status === 'analyzing' || sessionData.status === 'mapping' || sessionData.status === 'previewing'),
    },
    {
      id: 'processing',
      title: 'Processing',
      description: 'Mapping fields and validating data',
      component: currentStepIndex === 1 && fieldMappings.length === 0 ? FieldMappingStep : DataPreviewStep,
      isValid: fieldMappings.length > 0 && validationErrors.filter(e => e.severity === 'error').length === 0,
    },
    {
      id: 'complete',
      title: 'Done',
      description: 'Import execution and results',
      component: ImportExecutionStep,
      isValid: true,
    },
  ];

  const currentStep = wizardSteps[currentStepIndex];
  const canProceed = currentStep.isValid !== false;
  const canGoBack = currentStepIndex > 0 && !importProgress;
  const isLastStep = currentStepIndex === wizardSteps.length - 1;

  // Enhanced navigation handlers for 3-step flow
  const handleNext = () => {
    if (!canProceed || isLastStep) return;
    
    // Special handling for the consolidated steps
    if (currentStepIndex === 0 && sessionData) {
      // Move from Upload to Processing step
      setCurrentStepIndex(1);
    } else if (currentStepIndex === 1 && fieldMappings.length > 0 && validationErrors.filter(e => e.severity === 'error').length === 0) {
      // Move from Processing to Done step
      setCurrentStepIndex(2);
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (canGoBack) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleClose = () => {
    if (importProgress) {
      // Show confirmation dialog for active import
      const confirmed = window.confirm(
        'Import is in progress. Are you sure you want to close? This will cancel the import.'
      );
      if (!confirmed) return;
    }
    
    // Clean up session if needed
    if (sessionData?.id && sessionData.status !== 'completed') {
      // Optionally cancel the session
      cleanupSession();
    }
    
    // Reset all state
    setCurrentStepIndex(0);
    setSessionData(null);
    setFieldMappings([]);
    setValidationErrors([]);
    setImportProgress(null);
    setImportResults(null);
    setIsSessionValid(false);
    
    onClose();
  };

  // Accessibility and keyboard navigation
  const { announceToScreenReader } = useKeyboardNavigation({
    isOpen,
    currentStep: currentStepIndex,
    totalSteps: wizardSteps.length,
    canGoBack,
    canProceed,
    onNext: handleNext,
    onBack: handleBack,
    onClose: handleClose,
  });

  // WebSocket connection management
  useEffect(() => {
    if (!sessionData?.id || !isOpen) return;

    // Fix port detection issue - window.location.port returns empty string in development
    const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '5000');
    const wsUrl = `ws://${window.location.hostname}:${port}/ws?sessionId=${sessionData.id}&userId=${sessionData.userId}`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('WebSocket connected for session:', sessionData.id);
      setWs(websocket);
    };

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      setWs(null);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: 'Connection Error',
        description: 'Lost connection to the server. Some features may be limited.',
        variant: 'destructive',
      });
    };

    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, [sessionData?.id, isOpen]);

  // Handle WebSocket messages
  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'progress':
        setImportProgress(message.data);
        break;
      case 'completed':
        setImportResults(message.data);
        setImportProgress(null);
        handleImportComplete(message.data);
        break;
      case 'error':
        handleImportError(message.data);
        break;
      case 'mapping_suggestions':
        setFieldMappings(message.data.suggestions);
        break;
      case 'validation_update':
        setValidationErrors(message.data.errors);
        break;
      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  };

  // Handle import completion
  const handleImportComplete = (results: ImportResults) => {
    toast({
      title: 'Import Complete',
      description: `Successfully imported ${results.successfulRecords} of ${results.totalRecords} products`,
    });
    onComplete(results);
  };

  // Handle import errors
  const handleImportError = (error: any) => {
    toast({
      title: 'Import Failed',
      description: error.message || 'An error occurred during import',
      variant: 'destructive',
    });
    setImportProgress(null);
  };

  // Cleanup session
  const cleanupSession = async () => {
    if (!sessionData?.id) return;
    
    try {
      await apiRequest('DELETE', `/api/upload/${sessionData.id}`);
    } catch (error) {
      console.error('Failed to cleanup session:', error);
    }
  };

  // Step component props
  const stepProps = {
    sessionData,
    setSessionData,
    fieldMappings,
    setFieldMappings,
    validationErrors,
    setValidationErrors,
    importProgress,
    setImportProgress,
    importResults,
    setImportResults,
    onNext: handleNext,
    onBack: handleBack,
    onClose: handleClose,
    ws,
  };

  // Progress calculation
  const progressPercentage = ((currentStepIndex + (currentStep.isValid ? 1 : 0)) / wizardSteps.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        <DialogHeader className="flex-shrink-0 border-b pb-4">
          <DialogTitle className="text-2xl font-bold">Bulk Upload Products</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Import multiple products using our guided wizard
          </DialogDescription>
          <div className="flex items-center justify-end space-x-2 mt-2">
            <Button variant="ghost" size="sm">
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Enhanced 3-Step Progress Indicator */}
        <div className="flex-shrink-0 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-6" role="navigation" aria-label="Wizard progress">
              {wizardSteps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                        index < currentStepIndex
                          ? 'bg-primary text-primary-foreground shadow-lg'
                          : index === currentStepIndex
                          ? 'bg-primary/20 text-primary border-2 border-primary ring-2 ring-primary/20'
                          : 'bg-muted text-muted-foreground'
                      }`}
                      aria-label={`Step ${index + 1}: ${step.title}${index === currentStepIndex ? ' (current)' : index < currentStepIndex ? ' (completed)' : ' (upcoming)'}`}
                    >
                      {index < currentStepIndex ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="hidden sm:block">
                      <p className={`text-sm font-medium transition-colors ${
                        index === currentStepIndex ? 'text-primary' : 'text-foreground'
                      }`}>{step.title}</p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                  {index < wizardSteps.length - 1 && (
                    <div className="hidden sm:flex items-center mx-4">
                      <div
                        className={`w-16 h-0.5 transition-all duration-300 ${
                          index < currentStepIndex ? 'bg-primary shadow-sm' : 'bg-muted'
                        }`}
                      />
                      <div className={`w-2 h-2 rounded-full ml-2 transition-all duration-300 ${
                        index < currentStepIndex ? 'bg-primary' : 'bg-muted'
                      }`} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={currentStepIndex === wizardSteps.length - 1 ? "default" : "outline"} className="hidden sm:inline-flex">
                Step {currentStepIndex + 1} of {wizardSteps.length}
              </Badge>
              {importProgress && (
                <Badge variant="secondary" className="animate-pulse">
                  {Math.round((importProgress.processedRecords / importProgress.totalRecords) * 100)}%
                </Badge>
              )}
            </div>
          </div>
          
          {/* Enhanced Progress Bar */}
          <div className="space-y-2">
            <Progress 
              value={importProgress ? (importProgress.processedRecords / importProgress.totalRecords) * 100 : progressPercentage} 
              className="h-2" 
              aria-label={`Wizard progress: ${Math.round(importProgress ? (importProgress.processedRecords / importProgress.totalRecords) * 100 : progressPercentage)}% complete`}
            />
            
            {/* Mobile Step Labels */}
            <div className="flex sm:hidden justify-between text-xs text-muted-foreground">
              {wizardSteps.map((step, index) => (
                <span key={step.id} className={index === currentStepIndex ? 'text-primary font-medium' : ''}>
                  {step.title}
                </span>
              ))}
            </div>
          </div>
        </div>

        <Separator className="flex-shrink-0" />

        {/* Screen Reader Status Region */}
        <div 
          aria-live="polite" 
          aria-atomic="true" 
          className="sr-only"
          id="bulk-upload-status"
        >
          Step {currentStepIndex + 1} of {wizardSteps.length}: {currentStep.title}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-auto py-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2" aria-level={2}>{currentStep.title}</h3>
              <p className="text-muted-foreground">{currentStep.description}</p>
            </div>
            
            {/* Render current step component */}
            <currentStep.component {...stepProps} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t pt-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={!canGoBack}
              className="flex items-center space-x-2"
              data-action="back"
              aria-label={`Go back to previous step${canGoBack ? '' : ' (disabled)'}`}
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>

            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              
              {!isLastStep ? (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed}
                  className="flex items-center space-x-2"
                  data-action="next"
                  aria-label={`Proceed to next step${!canProceed ? ' (disabled - please complete current step)' : ''}`}
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed || !!importProgress}
                  className="gradient-primary text-white"
                  data-action="import"
                  aria-label={`Start import process${!canProceed ? ' (disabled - please complete data review)' : ''}`}
                >
                  {importProgress ? 'Importing...' : 'Start Import'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUploadWizard;