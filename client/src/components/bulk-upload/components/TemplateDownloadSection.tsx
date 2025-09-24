import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  FileCode,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateDownloadSectionProps {
  className?: string;
  isMobile?: boolean;
  isCompact?: boolean;
  onDownload?: (format: 'csv' | 'xlsx' | 'json', filename: string) => void;
  isLoading?: boolean;
  downloadCounts?: Record<string, number>;
}

interface TemplateButtonProps {
  format: 'csv' | 'xlsx' | 'json';
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  downloadCount?: number;
}

const TEMPLATE_FORMATS = [
  {
    format: 'csv' as const,
    icon: FileText,
    label: 'CSV',
    description: 'Comma-separated values',
    mimeType: 'text/csv',
    fileSize: '2.1 KB'
  },
  {
    format: 'xlsx' as const,
    icon: FileSpreadsheet,
    label: 'Excel',
    description: 'Excel spreadsheet',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileSize: '8.3 KB'
  },
  {
    format: 'json' as const,
    icon: FileCode,
    label: 'JSON',
    description: 'JavaScript Object Notation',
    mimeType: 'application/json',
    fileSize: '3.4 KB'
  }
];

export const TemplateDownloadSection: React.FC<TemplateDownloadSectionProps> = ({
  className,
  isMobile = false,
  isCompact = false,
  onDownload,
  isLoading = false,
  downloadCounts = {}
}) => {
  const { toast } = useToast();

  // Template download mutation
  const downloadTemplateMutation = useMutation({
    mutationFn: async (format: 'csv' | 'xlsx' | 'json') => {
      const response = await fetch(`/api/import/template/products/${format}`);
      if (!response.ok) throw new Error('Failed to download template');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products-template.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      return format;
    },
    onSuccess: (format) => {
      toast({
        title: 'Template Downloaded',
        description: `${format.toUpperCase()} template has been downloaded to your computer`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Download Failed',
        description: error.message || 'Failed to download template file',
        variant: 'destructive',
      });
    },
  });

  const handleDownload = async (format: 'csv' | 'xlsx' | 'json') => {
    try {
      const filename = `products-template.${format}`;
      
      // Call parent handler if provided
      if (onDownload) {
        onDownload(format, filename);
        return;
      }

      // Default download behavior
      downloadTemplateMutation.mutate(format);
    } catch (error) {
      console.error('Template download failed:', error);
    }
  };

  if (isCompact) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h4 className="text-sm font-medium">Need a template?</h4>
            <p className="text-xs text-muted-foreground">
              Download pre-formatted files
            </p>
          </div>
        </div>
        
        <div className={cn(
          "grid gap-2",
          isMobile ? "grid-cols-1" : "grid-cols-3"
        )}>
          {TEMPLATE_FORMATS.map((template) => (
            <Button
              key={template.format}
              variant="outline"
              size="sm"
              onClick={() => handleDownload(template.format)}
              disabled={isLoading || downloadTemplateMutation.isPending}
              className="flex items-center justify-center space-x-2 h-8"
            >
              <template.icon className="h-3 w-3" />
              <span className="text-xs">{template.label}</span>
              {downloadCounts[template.format] && (
                <Badge variant="secondary" className="text-xs px-1">
                  {downloadCounts[template.format]}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("border-primary/20 bg-primary/5", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <Download className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Download Template Files</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Get started with our pre-formatted templates to ensure compatibility
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className={cn(
          "grid gap-3",
          isMobile ? "grid-cols-1" : "grid-cols-3"
        )}>
          {TEMPLATE_FORMATS.map((template) => (
            <TemplateButton
              key={template.format}
              format={template.format}
              icon={<template.icon className="h-6 w-6" />}
              label={template.label}
              description={template.description}
              onClick={() => handleDownload(template.format)}
              isLoading={isLoading || downloadTemplateMutation.isPending}
              downloadCount={downloadCounts[template.format]}
            />
          ))}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/50">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Included in templates:</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 ml-6">
              <li>• Required fields: name, sku, price</li>
              <li>• Optional fields: description, brand, category</li>
              <li>• Sample data with proper formatting</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Features:</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 ml-6">
              <li>• Field descriptions and validation rules</li>
              <li>• Examples of correct data formatting</li>
              <li>• Comments and helpful instructions</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const TemplateButton: React.FC<TemplateButtonProps> = ({
  format,
  icon,
  label,
  description,
  onClick,
  isLoading = false,
  disabled = false,
  downloadCount
}) => {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={isLoading || disabled}
      className={cn(
        "h-auto p-4 flex flex-col items-center space-y-2",
        "hover:bg-primary/10 hover:border-primary/50",
        "transition-colors duration-200",
        "focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
      )}
      aria-label={`Download ${label} template for bulk product upload`}
    >
      <div className="text-primary">
        {icon}
      </div>
      
      <div className="text-center space-y-1">
        <div className="font-medium text-sm">{label} Template</div>
        <div className="text-xs text-muted-foreground">{description}</div>
        
        {downloadCount && (
          <Badge variant="secondary" className="text-xs">
            {downloadCount} downloads
          </Badge>
        )}
      </div>
    </Button>
  );
};

export default TemplateDownloadSection;