// Phase 3.5: Variant Options Manager Component
import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Settings,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Plus,
  Info,
  Palette,
  Ruler,
  Package,
  Image,
} from "lucide-react";

interface VariantOptionsManagerProps {
  productId: number;
  productOptions: any[];
  globalOptions: any[];
  onSave: () => void;
}

export function VariantOptionsManager({ 
  productId, 
  productOptions, 
  globalOptions, 
  onSave 
}: VariantOptionsManagerProps) {
  const { toast } = useToast();
  const [selectedOptions, setSelectedOptions] = useState<number[]>(
    productOptions.map(po => po.optionId)
  );
  const [openOptions, setOpenOptions] = useState<{ [key: number]: boolean }>({});

  // Save product variant options
  const saveOptionsMutation = useMutation({
    mutationFn: async (optionIds: number[]) => {
      return apiRequest("POST", `/api/products/${productId}/variants/options`, {
        optionIds
      });
    },
    onSuccess: () => {
      onSave();
      toast({
        title: "Success",
        description: "Variant options updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update variant options",
        variant: "destructive",
      });
    },
  });

  const handleOptionToggle = (optionId: number) => {
    setSelectedOptions(prev => 
      prev.includes(optionId)
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    );
  };

  const handleSave = () => {
    saveOptionsMutation.mutate(selectedOptions);
  };

  const getOptionIcon = (optionType: string) => {
    switch (optionType) {
      case 'color': return <Palette className="h-4 w-4" />;
      case 'size': return <Ruler className="h-4 w-4" />;
      case 'image': return <Image className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const renderColorSwatch = (value: any) => {
    if (value.hexColor) {
      return (
        <div className="flex items-center gap-2">
          <div 
            className="w-4 h-4 rounded border border-gray-200"
            style={{ backgroundColor: value.hexColor }}
          />
          <span>{value.displayValue}</span>
        </div>
      );
    }
    return value.displayValue;
  };

  if (!globalOptions || globalOptions.length === 0) {
    return (
      <div className="p-8 text-center">
        <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">No Variant Options Available</h3>
        <p className="text-muted-foreground">
          No global variant options have been configured. Contact an administrator to set up variant options.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium mb-2">Configure Variant Options</h3>
        <p className="text-sm text-muted-foreground">
          Select which variant options apply to this product. Each option will allow you to create variations.
        </p>
      </div>

      {/* Selected Options Summary */}
      {selectedOptions.length > 0 && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                {selectedOptions.length} option{selectedOptions.length !== 1 ? 's' : ''} selected
              </p>
              <p className="text-xs text-blue-700 mt-1">
                This will enable creating variants with different combinations of the selected options.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Options List */}
      <div className="space-y-3">
        {globalOptions.map((option: any) => {
          const isSelected = selectedOptions.includes(option.id);
          const isOpen = openOptions[option.id];

          return (
            <Card key={option.id} className={`transition-all ${isSelected ? 'ring-2 ring-blue-500 border-blue-200' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleOptionToggle(option.id)}
                    />
                    <div className="flex items-center gap-2">
                      {getOptionIcon(option.optionType)}
                      <div>
                        <Label className="text-base font-medium">{option.displayName}</Label>
                        {option.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {option.values?.length || 0} values
                    </Badge>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {option.optionType}
                    </Badge>
                    {option.values && option.values.length > 0 && (
                      <Collapsible
                        open={isOpen}
                        onOpenChange={(open) => setOpenOptions(prev => ({ ...prev, [option.id]: open }))}
                      >
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm">
                            {isOpen ? 
                              <ChevronDown className="h-4 w-4" /> : 
                              <ChevronRight className="h-4 w-4" />
                            }
                          </Button>
                        </CollapsibleTrigger>
                      </Collapsible>
                    )}
                  </div>
                </div>
              </CardHeader>

              {/* Option Values */}
              {option.values && option.values.length > 0 && (
                <Collapsible
                  open={isOpen}
                  onOpenChange={(open) => setOpenOptions(prev => ({ ...prev, [option.id]: open }))}
                >
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <Separator className="mb-3" />
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {option.values.map((value: any) => (
                          <div
                            key={value.id}
                            className="flex items-center p-2 rounded border bg-muted/30"
                          >
                            {option.optionType === 'color' ? (
                              renderColorSwatch(value)
                            ) : value.imageUrl ? (
                              <div className="flex items-center gap-2">
                                <img 
                                  src={value.imageUrl} 
                                  alt={value.displayValue}
                                  className="w-4 h-4 rounded object-cover"
                                />
                                <span className="text-sm">{value.displayValue}</span>
                              </div>
                            ) : (
                              <span className="text-sm">{value.displayValue}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </Card>
          );
        })}
      </div>

      {/* Summary and Actions */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedOptions.length === 0 ? (
              "No options selected - variants will not be available"
            ) : selectedOptions.length === 1 ? (
              "1 option selected - variants will be created for this option"
            ) : (
              `${selectedOptions.length} options selected - variants will be created for all combinations`
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedOptions([])}
              disabled={selectedOptions.length === 0}
            >
              Clear All
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveOptionsMutation.isPending}
            >
              {saveOptionsMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Potential Combinations Warning */}
        {selectedOptions.length > 1 && (
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-900">
                  Potential Variants
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  {(() => {
                    const selectedOpts = globalOptions.filter((opt: any) => selectedOptions.includes(opt.id));
                    const totalCombinations = selectedOpts.reduce((acc: number, opt: any) => 
                      acc * (opt.values?.length || 1), 1
                    );
                    return `With the selected options, you could generate up to ${totalCombinations} variant${totalCombinations !== 1 ? 's' : ''}.`;
                  })()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}