// Phase 3.5: Variant Generator Component
import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  DollarSign,
  Hash,
  Package2,
  AlertTriangle,
  Loader2,
  Zap,
} from "lucide-react";

interface VariantGeneratorProps {
  productId: number;
  product: any;
  productOptions: any[];
  onGenerate: (count: number) => void;
}

interface VariantGenerationConfig {
  generateAllCombinations: boolean;
  selectedOptions: {
    optionId: number;
    values: number[];
  }[];
  pricing: {
    strategy: 'inherit' | 'adjust' | 'individual';
    basePrice?: number;
    adjustments?: { [combination: string]: number };
  };
  inventory: {
    strategy: 'track' | 'unlimited';
    defaultStock?: number;
    stockPerVariant?: { [combination: string]: number };
  };
  naming: {
    pattern: string;
    includeParentName: boolean;
  };
  skuGeneration: {
    strategy: 'auto' | 'manual' | 'pattern';
    pattern?: string;
    separator?: string;
  };
}

export function VariantGenerator({ 
  productId, 
  product, 
  productOptions, 
  onGenerate 
}: VariantGeneratorProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<VariantGenerationConfig>({
    generateAllCombinations: true,
    selectedOptions: productOptions.map(po => ({
      optionId: po.option.id,
      values: po.option.values.map((v: any) => v.id),
    })),
    pricing: {
      strategy: 'inherit',
    },
    inventory: {
      strategy: 'track',
      defaultStock: 0,
    },
    naming: {
      pattern: '{parent_name} - {variant_options}',
      includeParentName: true,
    },
    skuGeneration: {
      strategy: 'auto',
      separator: '-',
    },
  });

  const [previewVariants, setPreviewVariants] = useState<any[]>([]);
  const [activeStep, setActiveStep] = useState(0);

  // Calculate potential variant combinations
  const calculateCombinations = () => {
    if (!config.generateAllCombinations) return 0;
    
    return config.selectedOptions.reduce((total, option) => {
      const selectedValuesCount = option.values.length;
      return total === 0 ? selectedValuesCount : total * selectedValuesCount;
    }, 0);
  };

  const totalCombinations = calculateCombinations();

  // Generate variants mutation
  const generateVariantsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/products/${productId}/variants/generate`, {
        config
      });
    },
    onSuccess: (data) => {
      onGenerate(data.variants?.length || 0);
      toast({
        title: "Success",
        description: data.message || "Variants generated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to generate variants",
        variant: "destructive",
      });
    },
  });

  const handleOptionValueToggle = (optionId: number, valueId: number) => {
    setConfig(prev => ({
      ...prev,
      selectedOptions: prev.selectedOptions.map(option => {
        if (option.optionId === optionId) {
          const values = option.values.includes(valueId)
            ? option.values.filter(id => id !== valueId)
            : [...option.values, valueId];
          return { ...option, values };
        }
        return option;
      }),
    }));
  };

  const handleSelectAllValues = (optionId: number, allValues: number[]) => {
    setConfig(prev => ({
      ...prev,
      selectedOptions: prev.selectedOptions.map(option => {
        if (option.optionId === optionId) {
          return { ...option, values: allValues };
        }
        return option;
      }),
    }));
  };

  const handleDeselectAllValues = (optionId: number) => {
    setConfig(prev => ({
      ...prev,
      selectedOptions: prev.selectedOptions.map(option => {
        if (option.optionId === optionId) {
          return { ...option, values: [] };
        }
        return option;
      }),
    }));
  };

  const getSelectedValuesText = (optionId: number) => {
    const option = config.selectedOptions.find(o => o.optionId === optionId);
    const productOption = productOptions.find(po => po.option.id === optionId);
    
    if (!option || !productOption) return '';
    
    const selectedValues = productOption.option.values.filter((v: any) => 
      option.values.includes(v.id)
    );
    
    return selectedValues.map((v: any) => v.displayValue).join(', ');
  };

  const isConfigValid = () => {
    return config.selectedOptions.some(option => option.values.length > 0) &&
           totalCombinations > 0 &&
           totalCombinations <= 100; // Reasonable limit
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

  const steps = [
    { id: 0, title: "Select Options", description: "Choose which option values to include" },
    { id: 1, title: "Configure Pricing", description: "Set pricing strategy for variants" },
    { id: 2, title: "Configure Inventory", description: "Set inventory tracking for variants" },
    { id: 3, title: "Configure Naming", description: "Set how variants are named and SKUs generated" },
    { id: 4, title: "Review & Generate", description: "Review configuration and generate variants" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium mb-2">Generate Product Variants</h3>
        <p className="text-sm text-muted-foreground">
          Configure how variants should be generated for {product.name}
        </p>
      </div>

      {/* Step Navigation */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center space-x-2">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <button
                onClick={() => setActiveStep(step.id)}
                className={`flex items-center space-x-2 px-3 py-1 rounded text-sm ${
                  activeStep === step.id 
                    ? 'bg-blue-100 text-blue-900 border border-blue-200' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                  activeStep === step.id ? 'bg-blue-500 text-white' : 'bg-muted'
                }`}>
                  {index + 1}
                </span>
                <span className="hidden sm:inline">{step.title}</span>
              </button>
              {index < steps.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </React.Fragment>
          ))}
        </div>

        <Badge variant="outline" className="text-sm">
          {totalCombinations} potential variants
        </Badge>
      </div>

      <Tabs value={activeStep.toString()} onValueChange={(value) => setActiveStep(parseInt(value))}>
        {/* Step 1: Select Options */}
        <TabsContent value="0" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Select Option Values
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {productOptions.map((productOption: any) => {
                const option = productOption.option;
                const selectedValues = config.selectedOptions.find(o => o.optionId === option.id)?.values || [];
                
                return (
                  <Card key={option.id} className="border">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label className="text-base font-medium">{option.displayName}</Label>
                          <Badge variant="secondary" className="text-xs">
                            {selectedValues.length}/{option.values.length}
                          </Badge>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectAllValues(option.id, option.values.map((v: any) => v.id))}
                          >
                            Select All
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeselectAllValues(option.id)}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {option.values.map((value: any) => (
                          <div
                            key={value.id}
                            className={`flex items-center space-x-2 p-2 rounded border cursor-pointer transition-colors ${
                              selectedValues.includes(value.id)
                                ? 'bg-blue-50 border-blue-200'
                                : 'bg-muted/30 hover:bg-muted/50'
                            }`}
                            onClick={() => handleOptionValueToggle(option.id, value.id)}
                          >
                            <Checkbox
                              checked={selectedValues.includes(value.id)}
                              onChange={() => handleOptionValueToggle(option.id, value.id)}
                            />
                            <div className="flex-1">
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
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 2: Pricing Configuration */}
        <TabsContent value="1" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={config.pricing.strategy}
                onValueChange={(value) => setConfig(prev => ({
                  ...prev,
                  pricing: { ...prev.pricing, strategy: value as any }
                }))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="inherit" id="inherit" />
                  <Label htmlFor="inherit">Inherit from parent product</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="adjust" id="adjust" />
                  <Label htmlFor="adjust">Apply price adjustments</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="individual" id="individual" />
                  <Label htmlFor="individual">Set individual prices</Label>
                </div>
              </RadioGroup>

              {config.pricing.strategy === 'adjust' && (
                <div>
                  <Label>Default Price Adjustment</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={config.pricing.basePrice || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      pricing: { ...prev.pricing, basePrice: parseFloat(e.target.value) || 0 }
                    }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Amount to add/subtract from parent price (can be negative)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 3: Inventory Configuration */}
        <TabsContent value="2" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package2 className="h-5 w-5" />
                Inventory Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={config.inventory.strategy}
                onValueChange={(value) => setConfig(prev => ({
                  ...prev,
                  inventory: { ...prev.inventory, strategy: value as any }
                }))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="track" id="track" />
                  <Label htmlFor="track">Track inventory per variant</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="unlimited" id="unlimited" />
                  <Label htmlFor="unlimited">Unlimited stock (no tracking)</Label>
                </div>
              </RadioGroup>

              {config.inventory.strategy === 'track' && (
                <div>
                  <Label>Default Stock Level</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={config.inventory.defaultStock || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      inventory: { ...prev.inventory, defaultStock: parseInt(e.target.value) || 0 }
                    }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Initial stock level for all generated variants
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 4: Naming Configuration */}
        <TabsContent value="3" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Naming & SKU Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Variant Naming Pattern</Label>
                <Input
                  value={config.naming.pattern}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    naming: { ...prev.naming, pattern: e.target.value }
                  }))}
                  placeholder="{parent_name} - {variant_options}"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use {"{parent_name}"} and {"{variant_options}"} as placeholders
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={config.naming.includeParentName}
                  onCheckedChange={(checked) => setConfig(prev => ({
                    ...prev,
                    naming: { ...prev.naming, includeParentName: !!checked }
                  }))}
                />
                <Label>Include parent product name in variant names</Label>
              </div>

              <Separator />

              <div>
                <Label>SKU Generation Strategy</Label>
                <RadioGroup
                  value={config.skuGeneration.strategy}
                  onValueChange={(value) => setConfig(prev => ({
                    ...prev,
                    skuGeneration: { ...prev.skuGeneration, strategy: value as any }
                  }))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="auto" id="auto-sku" />
                    <Label htmlFor="auto-sku">Auto-generate from parent SKU</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pattern" id="pattern-sku" />
                    <Label htmlFor="pattern-sku">Use custom pattern</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="manual" id="manual-sku" />
                    <Label htmlFor="manual-sku">Manual entry after generation</Label>
                  </div>
                </RadioGroup>
              </div>

              {config.skuGeneration.strategy === 'pattern' && (
                <div>
                  <Label>SKU Pattern</Label>
                  <Input
                    value={config.skuGeneration.pattern || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      skuGeneration: { ...prev.skuGeneration, pattern: e.target.value }
                    }))}
                    placeholder="{parent_sku}-{option_codes}"
                  />
                </div>
              )}

              <div>
                <Label>SKU Separator</Label>
                <Select
                  value={config.skuGeneration.separator}
                  onValueChange={(value) => setConfig(prev => ({
                    ...prev,
                    skuGeneration: { ...prev.skuGeneration, separator: value }
                  }))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-">Hyphen (-)</SelectItem>
                    <SelectItem value="_">Underscore (_)</SelectItem>
                    <SelectItem value=".">Dot (.)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 5: Review & Generate */}
        <TabsContent value="4" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Review Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Configuration Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Selected Options</h4>
                  <div className="space-y-2">
                    {config.selectedOptions.map((option) => {
                      const productOption = productOptions.find(po => po.option.id === option.optionId);
                      if (!productOption || option.values.length === 0) return null;
                      
                      return (
                        <div key={option.optionId} className="text-sm">
                          <span className="font-medium">{productOption.option.displayName}:</span> {getSelectedValuesText(option.optionId)}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Configuration</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Pricing:</span> {config.pricing.strategy}</div>
                    <div><span className="font-medium">Inventory:</span> {config.inventory.strategy}</div>
                    <div><span className="font-medium">SKU Generation:</span> {config.skuGeneration.strategy}</div>
                  </div>
                </div>
              </div>

              {/* Warning for many variants */}
              {totalCombinations > 20 && (
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900">
                        High Number of Variants
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        You're about to generate {totalCombinations} variants. This might take a moment and create many products.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error states */}
              {!isConfigValid() && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-900">Configuration Issues</p>
                      <ul className="text-xs text-red-700 mt-1 list-disc list-inside">
                        {totalCombinations === 0 && <li>No option values selected</li>}
                        {totalCombinations > 100 && <li>Too many combinations (max 100)</li>}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Navigation and Actions */}
      <div className="flex items-center justify-between border-t pt-4">
        <div>
          {activeStep > 0 && (
            <Button variant="outline" onClick={() => setActiveStep(activeStep - 1)}>
              Previous Step
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeStep < steps.length - 1 ? (
            <Button onClick={() => setActiveStep(activeStep + 1)}>
              Next Step
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={() => generateVariantsMutation.mutate()}
              disabled={!isConfigValid() || generateVariantsMutation.isPending}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {generateVariantsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Generate {totalCombinations} Variants
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}