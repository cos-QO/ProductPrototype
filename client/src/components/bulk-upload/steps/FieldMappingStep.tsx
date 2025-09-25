import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Brain,
  CheckCircle,
  AlertTriangle,
  MoreVertical,
  Zap,
  RefreshCw,
  Eye,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  UploadSession,
  FieldMapping,
  SourceField,
  TargetField,
} from "../types";

interface FieldMappingStepProps {
  sessionData: UploadSession | null;
  fieldMappings: FieldMapping[];
  setFieldMappings: (mappings: FieldMapping[]) => void;
  onNext: () => void;
  isMobile?: boolean;
}

// Confidence indicator component
const ConfidenceIndicator: React.FC<{
  confidence: number;
  showPercentage?: boolean;
}> = ({ confidence, showPercentage = true }) => {
  const getColor = (conf: number) => {
    if (conf >= 0.9) return "bg-green-500";
    if (conf >= 0.7) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getLabel = (conf: number) => {
    if (conf >= 0.9) return "High";
    if (conf >= 0.7) return "Medium";
    return "Low";
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full ${getColor(confidence)}`} />
      <span className="text-xs text-muted-foreground">
        {showPercentage
          ? `${Math.round(confidence * 100)}%`
          : getLabel(confidence)}
      </span>
    </div>
  );
};

// Product field definitions - these would typically come from the API
const TARGET_FIELDS: TargetField[] = [
  { name: "name", label: "Product Name", type: "string", required: true },
  { name: "sku", label: "SKU", type: "string", required: true },
  { name: "price", label: "Price", type: "number", required: true },
  {
    name: "description",
    label: "Description",
    type: "string",
    required: false,
  },
  {
    name: "shortDescription",
    label: "Short Description",
    type: "string",
    required: false,
  },
  { name: "category", label: "Category", type: "string", required: false },
  { name: "brand", label: "Brand", type: "string", required: false },
  {
    name: "stockQuantity",
    label: "Stock Quantity",
    type: "number",
    required: false,
  },
  { name: "weight", label: "Weight", type: "number", required: false },
  { name: "dimensions", label: "Dimensions", type: "string", required: false },
  { name: "color", label: "Color", type: "string", required: false },
  { name: "size", label: "Size", type: "string", required: false },
  { name: "material", label: "Material", type: "string", required: false },
  { name: "status", label: "Status", type: "string", required: false },
  { name: "tags", label: "Tags", type: "array", required: false },
];

export const FieldMappingStep: React.FC<FieldMappingStepProps> = ({
  sessionData,
  fieldMappings,
  setFieldMappings,
  onNext,
}) => {
  const { toast } = useToast();
  const [sourceFields, setSourceFields] = useState<SourceField[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showPreview, setShowPreview] = useState<string | null>(null);

  // Fetch field analysis and AI suggestions
  const analysisQuery = useQuery({
    queryKey: ["fieldAnalysis", sessionData?.id],
    queryFn: async () => {
      if (!sessionData?.id) throw new Error("No session");

      const response = await apiRequest("POST", "/api/mapping/analyze", {
        sessionId: sessionData.id,
      });

      return response;
    },
    enabled: !!sessionData?.id && sourceFields.length === 0,
  });

  // Process analysis results
  useEffect(() => {
    if (analysisQuery.data) {
      setSourceFields(analysisQuery.data.sourceFields || []);
      setFieldMappings(analysisQuery.data.suggestions || []);
    }
  }, [analysisQuery.data, setFieldMappings]);

  // Manual field mapping update
  const updateMapping = (sourceField: string, targetField: string) => {
    const existing = fieldMappings.find(
      (m: FieldMapping) => m.sourceField === sourceField,
    );
    const updated = fieldMappings.filter(
      (m: FieldMapping) => m.sourceField !== sourceField,
    );

    if (targetField) {
      updated.push({
        sourceField,
        targetField,
        confidence: existing?.confidence || 1.0,
        isManual: true,
      });
    }

    setFieldMappings(updated);
  };

  // Bulk actions
  const handleBulkAction = async (action: string) => {
    setIsAnalyzing(true);

    try {
      switch (action) {
        case "accept-high-confidence":
          // Accept all mappings with >90% confidence
          const acceptedMappings = fieldMappings.map((mapping: FieldMapping) =>
            mapping.confidence >= 0.9
              ? { ...mapping, isManual: true }
              : mapping,
          );
          setFieldMappings(acceptedMappings);
          toast({
            title: "High Confidence Mappings Accepted",
            description: "All mappings with >90% confidence have been accepted",
          });
          break;

        case "clear-all":
          setFieldMappings([]);
          toast({
            title: "All Mappings Cleared",
            description: "You can now map fields manually",
          });
          break;

        case "auto-map":
          // Re-run AI analysis
          if (sessionData?.id) {
            const response = await apiRequest("POST", "/api/mapping/analyze", {
              sessionId: sessionData.id,
              forceReanalysis: true,
            });
            setFieldMappings(response.suggestions || []);
            toast({
              title: "AI Re-analysis Complete",
              description:
                "Field mappings have been updated based on AI analysis",
            });
          }
          break;
      }
    } catch (error: any) {
      toast({
        title: "Action Failed",
        description: error.message || "Failed to perform bulk action",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Get mapping for a source field
  const getMappingFor = (sourceField: string) => {
    return fieldMappings.find((m) => m.sourceField === sourceField);
  };

  // Check if all required fields are mapped
  const requiredFields = TARGET_FIELDS.filter((f) => f.required);
  const mappedRequiredFields = requiredFields.filter((rf) =>
    fieldMappings.some((m) => m.targetField === rf.name),
  );
  const canProceed = mappedRequiredFields.length === requiredFields.length;

  if (analysisQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="mr-2 h-5 w-5 animate-pulse text-primary" />
              AI is analyzing your fields...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-4 p-3 border rounded-lg"
                >
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-9 w-40" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (analysisQuery.error) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to analyze fields. Please try refreshing or contact support.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Mapping Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <Brain className="mr-2 h-5 w-5" />
                  Field Mapping
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Map your file fields to product attributes. AI suggestions are
                  provided with confidence scores.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction("accept-high-confidence")}
                  disabled={isAnalyzing}
                >
                  <Zap className="mr-2 h-4 w-4" />
                  Accept High Confidence
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction("auto-map")}
                  disabled={isAnalyzing}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Re-analyze
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction("clear-all")}
                  disabled={isAnalyzing}
                >
                  Clear All
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Mapping Status */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{sourceFields.length}</div>
                <div className="text-sm text-muted-foreground">
                  Source Fields
                </div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{fieldMappings.length}</div>
                <div className="text-sm text-muted-foreground">
                  Mapped Fields
                </div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {mappedRequiredFields.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Required Mapped
                </div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {requiredFields.length - mappedRequiredFields.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Required Missing
                </div>
              </div>
            </div>

            {/* Required Fields Status */}
            {!canProceed && (
              <Alert className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">
                    Missing Required Field Mappings:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {requiredFields
                      .filter(
                        (rf) =>
                          !fieldMappings.some((m) => m.targetField === rf.name),
                      )
                      .map((field) => (
                        <Badge key={field.name} variant="destructive">
                          {field.label}
                        </Badge>
                      ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Mapping Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/4">Source Field</TableHead>
                    <TableHead className="w-1/4">Sample Data</TableHead>
                    <TableHead className="w-1/6">Confidence</TableHead>
                    <TableHead className="w-1/4">Target Field</TableHead>
                    <TableHead className="w-12">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sourceFields.map((field) => {
                    const mapping = getMappingFor(field.name);
                    const isRequired =
                      mapping &&
                      TARGET_FIELDS.find(
                        (tf) => tf.name === mapping.targetField,
                      )?.required;

                    return (
                      <TableRow key={field.name}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{field.name}</span>
                            {isRequired && (
                              <Badge variant="outline" className="text-xs">
                                Required
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {field.type} • {field.valueCount} values
                          </p>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            {field.sampleValues
                              .slice(0, 3)
                              .map((value, index) => (
                                <div
                                  key={index}
                                  className="text-sm font-mono text-muted-foreground"
                                >
                                  {String(value).length > 20
                                    ? `${String(value).substring(0, 20)}...`
                                    : String(value)}
                                </div>
                              ))}
                          </div>
                        </TableCell>

                        <TableCell>
                          {mapping && (
                            <ConfidenceIndicator
                              confidence={mapping.confidence}
                            />
                          )}
                        </TableCell>

                        <TableCell>
                          <Select
                            value={mapping?.targetField || ""}
                            onValueChange={(value) =>
                              updateMapping(field.name, value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select target field..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">No mapping</SelectItem>
                              {TARGET_FIELDS.map((targetField) => (
                                <SelectItem
                                  key={targetField.name}
                                  value={targetField.name}
                                  disabled={fieldMappings.some(
                                    (m) =>
                                      m.targetField === targetField.name &&
                                      m.sourceField !== field.name,
                                  )}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span>{targetField.label}</span>
                                    {targetField.required && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs ml-2"
                                      >
                                        Required
                                      </Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>

                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setShowPreview(
                                    showPreview === field.name
                                      ? null
                                      : field.name,
                                  )
                                }
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Preview field data</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Field Preview */}
            {showPreview && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-sm">
                    Field Preview: {showPreview}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {sourceFields
                      .find((f) => f.name === showPreview)
                      ?.sampleValues.slice(0, 12)
                      .map((value, index) => (
                        <div
                          key={index}
                          className="p-2 bg-muted/50 rounded font-mono text-xs"
                        >
                          {String(value)}
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Field Definitions Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <HelpCircle className="mr-2 h-5 w-5" />
              Field Definitions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-40">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TARGET_FIELDS.map((field) => (
                  <div
                    key={field.name}
                    className="flex items-start space-x-3 p-2"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">
                          {field.label}
                        </span>
                        {field.required && (
                          <Badge variant="outline" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Type: {field.type}
                        {field.description && ` • ${field.description}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Success Message */}
        {canProceed && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              All required fields are mapped! You can proceed to the data
              preview step.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </TooltipProvider>
  );
};

export default FieldMappingStep;
