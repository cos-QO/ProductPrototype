import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';

// Import step components
import { FileUploadStep } from './steps/FileUploadStep';
import { FieldMappingStep } from './steps/FieldMappingStep';
import { DataPreviewStep } from './steps/DataPreviewStep';
import { ImportExecutionStep } from './steps/ImportExecutionStep';

// Import types
import type {
  BulkUploadWizardProps,
  WizardStep,
  UploadSession,
  FieldMapping,
  ValidationError,
  ImportProgress,
  ImportResults,
} from './types';

export const BulkUploadWizardMobile: React.FC<BulkUploadWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const { toast } = useToast();
  
  // Mobile-specific state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [sessionData, setSessionData] = useState<UploadSession | null>(null);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Define wizard steps (same as desktop but with mobile-optimized components)
  const wizardSteps: WizardStep[] = [
    {
      id: 'upload',
      title: 'Upload',
      description: 'Select your file',
      component: FileUploadStep,
      isValid: !!sessionData && sessionData.status === 'analyzing',
    },
    {
      id: 'mapping',
      title: 'Mapping',
      description: 'Map fields',
      component: FieldMappingStep,
      isValid: fieldMappings.length > 0,
    },
    {
      id: 'preview',
      title: 'Preview',
      description: 'Review data',
      component: DataPreviewStep,
      isValid: validationErrors.filter(e => e.severity === 'error').length === 0,
    },
    {
      id: 'import',
      title: 'Import',
      description: 'Execute import',
      component: ImportExecutionStep,
      isValid: true,
    },
  ];

  const currentStep = wizardSteps[currentStepIndex];
  const canProceed = currentStep.isValid !== false;
  const canGoBack = currentStepIndex > 0 && !importProgress;
  const isLastStep = currentStepIndex === wizardSteps.length - 1;

  // WebSocket connection management
  useEffect(() => {
    if (!sessionData?.id || !isOpen) return;

    // Fix port detection issue - window.location.port returns empty string in development
    const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '5000');
    const wsUrl = `ws://${window.location.hostname}:${port}/ws?sessionId=${sessionData.id}&userId=${sessionData.userId}`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
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
      setWs(null);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: 'Connection Error',
        description: 'Lost connection to server',
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
    }
  };

  // Handle import completion
  const handleImportComplete = (results: ImportResults) => {
    toast({
      title: 'Import Complete',
      description: `Successfully imported ${results.successfulRecords} products`,
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

  // Navigation handlers
  const handleNext = () => {
    if (canProceed && !isLastStep) {
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
      const confirmed = window.confirm(
        'Import is in progress. Are you sure you want to close?'
      );
      if (!confirmed) return;
    }
    
    // Reset state
    setCurrentStepIndex(0);
    setSessionData(null);
    setFieldMappings([]);
    setValidationErrors([]);
    setImportProgress(null);
    setImportResults(null);
    
    onClose();
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
    <Drawer open={isOpen} onOpenChange={handleClose}>
      <DrawerContent className="max-h-[95vh] flex flex-col">
        {/* Mobile Header */}
        <DrawerHeader className="flex-shrink-0 border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="text-xl font-bold">
                Bulk Upload
              </DrawerTitle>
              <DrawerDescription className="mt-1">
                Import products via guided wizard
              </DrawerDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DrawerHeader>

        {/* Mobile Progress Indicator */}
        <div className="flex-shrink-0 px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex space-x-1">
              {wizardSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index < currentStepIndex
                      ? 'bg-primary'
                      : index === currentStepIndex
                      ? 'bg-primary/50'
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            <Badge variant="outline" className="text-xs">
              {currentStepIndex + 1} of {wizardSteps.length}
            </Badge>
          </div>
          <Progress value={progressPercentage} className="h-1" />
        </div>

        <Separator className="flex-shrink-0" />

        {/* Mobile Step Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 space-y-4">
            {/* Step title for mobile */}
            <div className="text-center">
              <h3 className="text-lg font-semibold">{currentStep.title}</h3>
              <p className="text-sm text-muted-foreground">{currentStep.description}</p>
            </div>
            
            {/* Render current step component with mobile-optimized props */}
            <currentStep.component {...stepProps} isMobile={true} />
          </div>
        </div>

        {/* Mobile Footer Navigation */}
        <DrawerFooter className="flex-shrink-0 border-t pt-4">
          {/* Step navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
              disabled={!canGoBack}
              className="flex-1 mr-2"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            
            <div className="flex space-x-1 mx-4">
              {wizardSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full ${
                    index === currentStepIndex ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            
            {!isLastStep ? (
              <Button
                size="sm"
                onClick={handleNext}
                disabled={!canProceed}
                className="flex-1 ml-2"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleNext}
                disabled={!canProceed || !!importProgress}
                className="flex-1 ml-2 gradient-primary text-white"
              >
                {importProgress ? 'Importing...' : 'Import'}
              </Button>
            )}
          </div>
          
          {/* Cancel button */}
          <Button variant="outline" onClick={handleClose} className="w-full">
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default BulkUploadWizardMobile;