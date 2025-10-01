import React from "react";
import {
  Badge,
  Button,
  EnhancedBadge,
  EnhancedButton,
  OriginalBadge,
  OriginalButton,
  migrationUtils,
  ThemeTokenResolver,
  tokenResolver,
} from "../components";
import { validateTokenSystem, logTokenValidation } from "./validate-tokens";

// Import comprehensive UI components for testing
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { TimePicker } from "@/components/ui/time-picker";
import { Calendar as DateCalendar } from "@/components/ui/calendar";
import { DatePicker } from "@/components/ui/date-picker";
import { Link } from "@/components/ui/link";
import {
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Calendar,
  Upload,
  MoreHorizontal,
  Search,
  Clock,
  Loader2,
  Spinner,
  Keyboard,
  Plus,
  Edit,
  Trash2,
  Download,
  Settings,
  Heart,
  Timer,
} from "lucide-react";

// Import keyboard shortcuts system
import {
  useKeyboardShortcuts,
  useModalShortcuts,
  createShortcut,
} from "../hooks/useKeyboardShortcuts";

// Import essential missing components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * Component Showcase for testing modular token system
 * This component verifies that:
 * 1. Enhanced components work correctly
 * 2. Backward compatibility is maintained
 * 3. Token resolution works properly
 * 4. UI remains consistent
 */
export function ComponentShowcase() {
  const tokenValidation = migrationUtils.validateTokens();
  const componentVersion = migrationUtils.getComponentVersion();

  // Run validation and log to console for debugging
  React.useEffect(() => {
    logTokenValidation();
  }, []);

  // Additional validation using our specific validation function
  const [systemValidation, setSystemValidation] = React.useState(
    validateTokenSystem(),
  );

  // Design system export/import functionality
  const exportDesignSystemAsJSON = () => {
    const designSystemData = {
      tokens: {
        colors: tokenResolver.getAllTokens(),
        typography: componentVersion,
        spacing: migrationUtils.getSpacingTokens?.() || {},
        components: migrationUtils.getComponentTokens?.() || {},
      },
      validation: systemValidation,
      metadata: {
        exportDate: new Date().toISOString(),
        version: componentVersion.tokenSystemVersion,
        enhancedMode: migrationUtils.isEnhancedMode(),
      },
    };

    const blob = new Blob([JSON.stringify(designSystemData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `design-system-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportDesignSystemAsPDF = () => {
    // Add print styles and open print dialog for PDF export
    const printStyles = document.createElement("style");
    printStyles.textContent = `
      @media print {
        .print\\:hidden { display: none !important; }
        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        * { box-shadow: none !important; }
      }
    `;
    document.head.appendChild(printStyles);

    // Open print dialog
    window.print();

    // Clean up
    setTimeout(() => {
      document.head.removeChild(printStyles);
    }, 1000);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/json") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target?.result as string);
          console.log("Design system data imported:", importedData);
          // Here you could apply the imported tokens
          alert(
            "Design system JSON imported successfully! Check console for details.",
          );
        } catch (error) {
          alert("Error parsing JSON file. Please check the file format.");
        }
      };
      reader.readAsText(file);
    } else {
      alert("Please select a valid JSON file.");
    }
    // Reset input
    if (event.target) {
      event.target.value = "";
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Design System Component Showcase</h1>

        {/* Design System Controls */}
        <Card className="w-full print:hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Design System Controls
            </CardTitle>
            <CardDescription>
              Export, import, and manage your design system configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button
                onClick={exportDesignSystemAsJSON}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download as JSON
              </Button>

              <Button
                onClick={exportDesignSystemAsPDF}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export as PDF
              </Button>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="design-system-upload"
                />
                <Button
                  variant="outline"
                  onClick={() =>
                    document.getElementById("design-system-upload")?.click()
                  }
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload JSON
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">System Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-1">Component System</h4>
              <p>
                Enhanced Mode:{" "}
                {migrationUtils.isEnhancedMode() ? "✅ Active" : "❌ Inactive"}
              </p>
              <p>Version: {componentVersion.tokenSystemVersion}</p>
              <p>
                Backward Compatible:{" "}
                {componentVersion.backwardCompatible ? "✅ Yes" : "❌ No"}
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Token System</h4>
              <p>
                Migration Utils Validation:{" "}
                {tokenValidation.valid ? "✅ Valid" : "❌ Invalid"}
              </p>
              <p>
                Token Resolver:{" "}
                {systemValidation.tokenResolver ? "✅ Working" : "❌ Failed"}
              </p>
              <p>
                Theme Resolver:{" "}
                {systemValidation.themeResolver ? "✅ Working" : "❌ Failed"}
              </p>
              <p>
                Status Colors:{" "}
                {systemValidation.statusColorsLoaded
                  ? "✅ Loaded"
                  : "❌ Failed"}
              </p>
              <p>
                Spacing:{" "}
                {systemValidation.spacingLoaded ? "✅ Loaded" : "❌ Failed"}
              </p>
              <p>
                Typography:{" "}
                {systemValidation.typographyLoaded ? "✅ Loaded" : "❌ Failed"}
              </p>
            </div>
          </div>
          {!tokenValidation.valid && (
            <p className="text-destructive mt-2">
              Migration Utils Error: {tokenValidation.error}
            </p>
          )}
          {systemValidation.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-destructive font-medium">
                System Validation Errors:
              </p>
              {systemValidation.errors.map((error, i) => (
                <p key={i} className="text-destructive text-sm ml-2">
                  • {error}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Badge Component Testing */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Badge Components</h2>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Enhanced Badges (New System)</h3>
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="processing">Processing</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>

          <h4 className="font-medium">Enhanced Variants with CSS-in-JS</h4>
          <div className="flex flex-wrap gap-2">
            <EnhancedBadge variant="success" useTokenStyles={true}>
              Success (CSS-in-JS)
            </EnhancedBadge>
            <EnhancedBadge variant="warning" useTokenStyles={true}>
              Warning (CSS-in-JS)
            </EnhancedBadge>
            <EnhancedBadge variant="info" useTokenStyles={true}>
              Info (CSS-in-JS)
            </EnhancedBadge>
            <EnhancedBadge variant="processing" useTokenStyles={true}>
              Processing (CSS-in-JS)
            </EnhancedBadge>
          </div>

          <h4 className="font-medium">Light Variants</h4>
          <div className="flex flex-wrap gap-2">
            <EnhancedBadge variant="success-light" useTokenStyles={true}>
              Success Light
            </EnhancedBadge>
            <EnhancedBadge variant="warning-light" useTokenStyles={true}>
              Warning Light
            </EnhancedBadge>
            <EnhancedBadge variant="info-light" useTokenStyles={true}>
              Info Light
            </EnhancedBadge>
            <EnhancedBadge variant="processing-light" useTokenStyles={true}>
              Processing Light
            </EnhancedBadge>
          </div>

          <h4 className="font-medium">Sizes</h4>
          <div className="flex flex-wrap items-center gap-2">
            <EnhancedBadge variant="success" size="sm">
              Small
            </EnhancedBadge>
            <EnhancedBadge variant="success" size="default">
              Default
            </EnhancedBadge>
            <EnhancedBadge variant="success" size="lg">
              Large
            </EnhancedBadge>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-medium">
            Original Badges (Legacy System)
          </h3>
          <div className="flex flex-wrap gap-2">
            <OriginalBadge variant="default">Default</OriginalBadge>
            <OriginalBadge variant="secondary">Secondary</OriginalBadge>
            <OriginalBadge variant="success">Success</OriginalBadge>
            <OriginalBadge variant="warning">Warning</OriginalBadge>
            <OriginalBadge variant="info">Info</OriginalBadge>
            <OriginalBadge variant="processing">Processing</OriginalBadge>
            <OriginalBadge variant="destructive">Destructive</OriginalBadge>
          </div>
        </div>
      </div>

      {/* Button Component Testing */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Button Components</h2>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Enhanced Buttons (New System)</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="default">Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="success">Success</Button>
            <Button variant="warning">Warning</Button>
            <Button variant="info">Info</Button>
            <Button variant="processing">Processing</Button>
            <Button variant="destructive">Destructive</Button>
          </div>

          <h4 className="font-medium">Gradient Variants</h4>
          <div className="flex flex-wrap gap-2">
            <Button variant="gradient">Gradient Primary</Button>
            <Button variant="gradient-accent">Gradient Accent</Button>
          </div>

          <h4 className="font-medium">Outline Variants</h4>
          <div className="flex flex-wrap gap-2">
            <Button variant="success-outline">Success Outline</Button>
            <Button variant="warning-outline">Warning Outline</Button>
            <Button variant="info-outline">Info Outline</Button>
            <Button variant="processing-outline">Processing Outline</Button>
          </div>

          <h4 className="font-medium">Ghost Variants</h4>
          <div className="flex flex-wrap gap-2">
            <Button variant="success-ghost">Success Ghost</Button>
            <Button variant="warning-ghost">Warning Ghost</Button>
            <Button variant="info-ghost">Info Ghost</Button>
            <Button variant="processing-ghost">Processing Ghost</Button>
          </div>

          <h4 className="font-medium">Sizes</h4>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="default" size="sm">
              Small
            </Button>
            <Button variant="default" size="default">
              Default
            </Button>
            <Button variant="default" size="lg">
              Large
            </Button>
            <Button variant="default" size="xl">
              Extra Large
            </Button>
          </div>

          <h4 className="font-medium">Icon-Only Buttons</h4>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button variant="default" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="icon">
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="destructive" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button variant="success" size="icon">
                <CheckCircle className="h-4 w-4" />
              </Button>
              <Button variant="warning" size="icon">
                <AlertTriangle className="h-4 w-4" />
              </Button>
              <Button variant="info" size="icon">
                <Info className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline-white"
                size="icon"
                className="bg-slate-800"
              >
                <Heart className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost-white"
                size="icon"
                className="bg-slate-800"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <h4 className="font-medium">Buttons with Icons</h4>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button variant="default">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
              <Button variant="secondary">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button variant="success">
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button variant="warning">
                <Timer className="h-4 w-4 mr-2" />
                Pending Review
              </Button>
              <Button variant="info">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Important Action
              </Button>
            </div>
          </div>

          <h4 className="font-medium">Special States</h4>
          <div className="flex flex-wrap gap-2">
            <EnhancedButton variant="success" loading>
              Loading
            </EnhancedButton>
            <EnhancedButton variant="info" startIcon="🔍">
              With Start Icon
            </EnhancedButton>
            <EnhancedButton variant="processing" endIcon="→">
              With End Icon
            </EnhancedButton>
            <EnhancedButton variant="warning" disabled>
              Disabled
            </EnhancedButton>
          </div>

          <h4 className="font-medium">CSS-in-JS Styles</h4>
          <div className="flex flex-wrap gap-2">
            <EnhancedButton variant="success" useTokenStyles={true}>
              Success (CSS-in-JS)
            </EnhancedButton>
            <EnhancedButton variant="warning" useTokenStyles={true}>
              Warning (CSS-in-JS)
            </EnhancedButton>
            <EnhancedButton variant="info" useTokenStyles={true}>
              Info (CSS-in-JS)
            </EnhancedButton>
            <EnhancedButton variant="processing" useTokenStyles={true}>
              Processing (CSS-in-JS)
            </EnhancedButton>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-medium">
            Original Buttons (Legacy System)
          </h3>
          <div className="flex flex-wrap gap-2">
            <OriginalButton variant="default">Default</OriginalButton>
            <OriginalButton variant="secondary">Secondary</OriginalButton>
            <OriginalButton variant="success">Success</OriginalButton>
            <OriginalButton variant="warning">Warning</OriginalButton>
            <OriginalButton variant="info">Info</OriginalButton>
            <OriginalButton variant="processing">Processing</OriginalButton>
            <OriginalButton variant="destructive">Destructive</OriginalButton>
          </div>
        </div>
      </div>

      {/* Typography Scale */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Typography System</h2>
        <TypographyShowcase />
      </div>

      {/* Input Components */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Form Controls & Input States</h2>
        <InputStatesShowcase />
      </div>

      {/* Layout & Spacing */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">
          Layout, Spacing & Border Radius
        </h2>
        <LayoutShowcase />
      </div>

      {/* Status & Feedback */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Status & Feedback Components</h2>
        <StatusFeedbackShowcase />
      </div>

      {/* Data Display */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Data Display Components</h2>
        <DataDisplayShowcase />
      </div>

      {/* Color Palette */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Complete Color Palette</h2>
        <ColorPaletteShowcase />
      </div>

      {/* Foundation Systems */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Foundation Systems</h2>
        <FoundationShowcase />
      </div>

      {/* Essential Missing Components */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Essential Components</h2>
        <EssentialComponentsShowcase />
      </div>

      {/* Icon System */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Icon System</h2>
        <IconSystemShowcase />
      </div>

      {/* Advanced Patterns */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Advanced Patterns</h2>
        <AdvancedPatternsShowcase />
      </div>

      {/* Accessibility Guidelines */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">
          Accessibility & WCAG Compliance
        </h2>
        <AccessibilityShowcase />
      </div>

      {/* Token System Debug Info */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Token System Debug</h2>
        <TokenDebugPanel />
      </div>
    </div>
  );
}

/**
 * Typography showcase demonstrating all font sizes and line heights
 */
function TypographyShowcase() {
  const resolver = React.useMemo(() => ThemeTokenResolver.getInstance(), []);
  const typography = React.useMemo(() => resolver.getTypography(), [resolver]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Font Size Scale</CardTitle>
          <CardDescription>
            Complete typography scale with token values
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(typography.fontSize).map(([key, value]) => (
            <div key={key} className="flex items-center gap-4">
              <div className="w-16 text-sm font-mono">{key}:</div>
              <div className="w-20 text-xs text-muted-foreground">{value}</div>
              <div style={{ fontSize: value }}>
                The quick brown fox jumps over the lazy dog
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line Height Variants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(typography.lineHeight).map(([key, value]) => (
            <div key={key}>
              <div className="text-sm font-mono mb-2">
                {key}: {value}
              </div>
              <div
                className="text-base border-l-2 border-primary pl-4"
                style={{ lineHeight: value }}
              >
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
                enim ad minim veniam, quis nostrud exercitation ullamco laboris.
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Comprehensive input states and form controls showcase
 */
function InputStatesShowcase() {
  const [inputValue, setInputValue] = React.useState("");
  const [checkboxValue, setCheckboxValue] = React.useState(false);
  const [radioValue, setRadioValue] = React.useState("option1");
  const [switchValue, setSwitchValue] = React.useState(false);
  const [sliderValue, setSliderValue] = React.useState([50]);

  return (
    <div className="space-y-6">
      {/* Text Inputs */}
      <Card>
        <CardHeader>
          <CardTitle>Text Input States</CardTitle>
          <CardDescription>
            Various input field states and configurations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Default Input</Label>
              <Input
                placeholder="Enter text here"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Disabled Input</Label>
              <Input placeholder="Disabled input" disabled />
            </div>

            <div className="space-y-2">
              <Label>Error State</Label>
              <Input
                placeholder="Error input"
                className="border-destructive focus-visible:ring-destructive"
              />
              <p className="text-sm text-destructive">This field is required</p>
            </div>

            <div className="space-y-2">
              <Label>Success State</Label>
              <Input
                placeholder="Success input"
                className="border-success focus-visible:ring-success"
              />
              <p className="text-sm text-success">Valid input</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Textarea */}
      <Card>
        <CardHeader>
          <CardTitle>Textarea Variants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Standard Textarea</Label>
            <Textarea placeholder="Enter your message here" />
          </div>
          <div className="space-y-2">
            <Label>Disabled Textarea</Label>
            <Textarea placeholder="Disabled textarea" disabled />
          </div>
        </CardContent>
      </Card>

      {/* Form Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Form Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Select */}
          <div className="space-y-2">
            <Label>Select Dropdown</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="option1">Option 1</SelectItem>
                <SelectItem value="option2">Option 2</SelectItem>
                <SelectItem value="option3">Option 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="checkbox-demo"
              checked={checkboxValue}
              onCheckedChange={setCheckboxValue}
            />
            <Label htmlFor="checkbox-demo">Accept terms and conditions</Label>
          </div>

          {/* Radio Group */}
          <div className="space-y-2">
            <Label>Radio Group</Label>
            <RadioGroup value={radioValue} onValueChange={setRadioValue}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option1" id="radio1" />
                <Label htmlFor="radio1">Option 1</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option2" id="radio2" />
                <Label htmlFor="radio2">Option 2</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option3" id="radio3" />
                <Label htmlFor="radio3">Option 3</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Switch */}
          <div className="flex items-center space-x-2">
            <Switch
              id="switch-demo"
              checked={switchValue}
              onCheckedChange={setSwitchValue}
            />
            <Label htmlFor="switch-demo">Enable notifications</Label>
          </div>

          {/* Slider */}
          <div className="space-y-2">
            <Label>Slider ({sliderValue[0]})</Label>
            <Slider
              value={sliderValue}
              onValueChange={setSliderValue}
              max={100}
              min={0}
              step={1}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Layout, spacing and border radius showcase
 */
function LayoutShowcase() {
  const resolver = React.useMemo(() => ThemeTokenResolver.getInstance(), []);
  const spacing = React.useMemo(() => resolver.getSpacing(), [resolver]);

  return (
    <div className="space-y-6">
      {/* Spacing Scale */}
      <Card>
        <CardHeader>
          <CardTitle>Spacing Scale</CardTitle>
          <CardDescription>
            Consistent spacing tokens used throughout the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(spacing).map(([key, value]) => (
            <div key={key} className="flex items-center gap-4">
              <div className="w-12 text-sm font-mono">{key}:</div>
              <div className="w-16 text-xs text-muted-foreground">{value}</div>
              <div className="bg-primary h-4 border" style={{ width: value }} />
              <div className="text-sm">({value})</div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Border Radius */}
      <Card>
        <CardHeader>
          <CardTitle>Border Radius Scale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center space-y-2">
              <div className="w-20 h-20 mx-auto bg-primary rounded-none" />
              <p className="text-sm">None (0px)</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-20 h-20 mx-auto bg-primary rounded-sm" />
              <p className="text-sm">Small (0.125rem)</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-20 h-20 mx-auto bg-primary rounded-md" />
              <p className="text-sm">Medium (0.375rem)</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-20 h-20 mx-auto bg-primary rounded-lg" />
              <p className="text-sm">Large (0.5rem)</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-20 h-20 mx-auto bg-primary rounded-xl" />
              <p className="text-sm">XL (0.75rem)</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-20 h-20 mx-auto bg-primary rounded-2xl" />
              <p className="text-sm">2XL (1rem)</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-20 h-20 mx-auto bg-primary rounded-3xl" />
              <p className="text-sm">3XL (1.5rem)</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-20 h-20 mx-auto bg-primary rounded-full" />
              <p className="text-sm">Full (50%)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Layout Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Layout Patterns</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Card Grid (Responsive)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-4">
                    <div className="h-20 bg-muted rounded-md mb-3" />
                    <h5 className="font-medium">Card {i}</h5>
                    <p className="text-sm text-muted-foreground">
                      Card description
                    </p>
                  </Card>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Flex Layout Examples</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <span>Space Between</span>
                  <Badge>New</Badge>
                </div>
                <div className="flex items-center gap-2 p-4 border rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">John Doe</p>
                    <p className="text-sm text-muted-foreground">
                      john@example.com
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Status and feedback components showcase
 */
function StatusFeedbackShowcase() {
  return (
    <div className="space-y-6">
      {/* Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Components</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Info</AlertTitle>
            <AlertDescription>
              This is an informational alert with additional context.
            </AlertDescription>
          </Alert>

          <Alert variant="success">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
              Your changes have been saved successfully.
            </AlertDescription>
          </Alert>

          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              Please review your settings before continuing.
            </AlertDescription>
          </Alert>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Something went wrong. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Progress and Loading States */}
      <Card>
        <CardHeader>
          <CardTitle>Progress & Loading States</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>60%</span>
            </div>
            <Progress value={60} className="w-full" />
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="font-medium">Skeleton Loading</h4>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Data display components showcase
 */
function DataDisplayShowcase() {
  const sampleData = [
    { id: 1, name: "Product A", status: "Active", price: "$29.99" },
    { id: 2, name: "Product B", status: "Inactive", price: "$49.99" },
    { id: 3, name: "Product C", status: "Draft", price: "$19.99" },
  ];

  return (
    <div className="space-y-6">
      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Data Table</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.status === "Active"
                          ? "success"
                          : item.status === "Inactive"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{item.price}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Tabs Component</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="account">
            <TabsList>
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="password">Password</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="account" className="space-y-4">
              <h4 className="font-medium">Account Settings</h4>
              <p className="text-sm text-muted-foreground">
                Manage your account settings and preferences.
              </p>
            </TabsContent>
            <TabsContent value="password" className="space-y-4">
              <h4 className="font-medium">Password Settings</h4>
              <p className="text-sm text-muted-foreground">
                Change your password and security settings.
              </p>
            </TabsContent>
            <TabsContent value="settings" className="space-y-4">
              <h4 className="font-medium">General Settings</h4>
              <p className="text-sm text-muted-foreground">
                Configure your general application preferences.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Complete color palette showcase
 */
function ColorPaletteShowcase() {
  const resolver = React.useMemo(() => ThemeTokenResolver.getInstance(), []);
  const statusColors = React.useMemo(
    () => resolver.getStatusColors(),
    [resolver],
  );
  const themeColors = React.useMemo(
    () => resolver.getThemeColors(),
    [resolver],
  );

  return (
    <div className="space-y-6">
      {/* Theme Colors */}
      <Card>
        <CardHeader>
          <CardTitle>Theme Colors</CardTitle>
          <CardDescription>
            Core theme colors used throughout the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(themeColors).map(([name, color]) => {
              // Resolve CSS variables to computed values
              const resolveColorValue = (
                colorValue: any,
              ): { original: string; hex: string } => {
                if (typeof colorValue !== "string") {
                  return { original: "[invalid]", hex: "#000000" };
                }

                if (colorValue.startsWith("var(--")) {
                  // Extract CSS variable name
                  const varName = colorValue.match(/var\((--[^)]+)\)/)?.[1];
                  if (varName) {
                    try {
                      const computedValue = getComputedStyle(
                        document.documentElement,
                      )
                        .getPropertyValue(varName)
                        .trim();
                      return {
                        original: computedValue,
                        hex: getHexFromHSL(computedValue),
                      };
                    } catch (e) {
                      return { original: colorValue, hex: "#000000" };
                    }
                  }
                }

                if (colorValue.startsWith("hsl")) {
                  return {
                    original: colorValue,
                    hex: getHexFromHSL(colorValue),
                  };
                }

                return { original: colorValue, hex: colorValue };
              };

              // Convert HSL to hex for display
              const getHexFromHSL = (hslStr: string) => {
                const match = hslStr.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
                if (!match) return hslStr;

                const h = parseInt(match[1]) / 360;
                const s = parseInt(match[2]) / 100;
                const l = parseInt(match[3]) / 100;

                const hue2rgb = (p: number, q: number, t: number) => {
                  if (t < 0) t += 1;
                  if (t > 1) t -= 1;
                  if (t < 1 / 6) return p + (q - p) * 6 * t;
                  if (t < 1 / 2) return q;
                  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                  return p;
                };

                let r, g, b;
                if (s === 0) {
                  r = g = b = l;
                } else {
                  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                  const p = 2 * l - q;
                  r = hue2rgb(p, q, h + 1 / 3);
                  g = hue2rgb(p, q, h);
                  b = hue2rgb(p, q, h - 1 / 3);
                }

                const toHex = (c: number) => {
                  const hex = Math.round(c * 255).toString(16);
                  return hex.length === 1 ? "0" + hex : hex;
                };

                return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
              };

              const resolvedColor = resolveColorValue(color);
              const displayColor = resolvedColor.hex;

              return (
                <div key={name} className="text-center space-y-2">
                  <div
                    className="w-full h-20 rounded-lg border"
                    style={{ backgroundColor: displayColor }}
                  />
                  <div>
                    <p className="font-medium capitalize">{name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {resolvedColor.original}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {resolvedColor.hex}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Status Colors */}
      <Card>
        <CardHeader>
          <CardTitle>Status Color System</CardTitle>
          <CardDescription>
            Semantic colors for different states and feedback
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(statusColors).map(([statusName, colorSet]) => (
              <div key={statusName} className="space-y-2">
                <h4 className="font-medium capitalize">{statusName}</h4>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                  {Object.entries(colorSet).map(([variant, color]) => (
                    <div key={variant} className="text-center space-y-1">
                      <div
                        className="w-full h-12 rounded border"
                        style={{ backgroundColor: color }}
                      />
                      <div>
                        <p className="text-xs font-medium">{variant}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {color}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Foundation Systems Showcase
 * Demonstrates elevation, motion, grid, and layout systems
 */
function FoundationShowcase() {
  return (
    <div className="space-y-6">
      {/* Elevation/Shadow System */}
      <Card>
        <CardHeader>
          <CardTitle>Elevation & Shadow System</CardTitle>
          <CardDescription>
            Shadow tokens for depth and visual hierarchy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-4">
            {[
              {
                name: "None",
                value: tokenResolver.resolve("{primitive.elevation.none}"),
              },
              {
                name: "Small",
                value: tokenResolver.resolve("{primitive.elevation.sm}"),
              },
              {
                name: "Base",
                value: tokenResolver.resolve("{primitive.elevation.base}"),
              },
              {
                name: "Medium",
                value: tokenResolver.resolve("{primitive.elevation.md}"),
              },
              {
                name: "Large",
                value: tokenResolver.resolve("{primitive.elevation.lg}"),
              },
              {
                name: "X-Large",
                value: tokenResolver.resolve("{primitive.elevation.xl}"),
              },
              {
                name: "2X-Large",
                value: tokenResolver.resolve("{primitive.elevation.2xl}"),
              },
              {
                name: "Inner",
                value: tokenResolver.resolve("{primitive.elevation.inner}"),
              },
            ].map((elevation) => (
              <div key={elevation.name} className="space-y-2">
                <div
                  className="bg-card rounded-lg p-4 h-16 flex items-center justify-center border border-border/50"
                  style={{ boxShadow: elevation.value }}
                >
                  <span className="text-sm font-medium text-foreground">
                    {elevation.name}
                  </span>
                </div>
                <p className="text-xs text-foreground/90 text-center font-medium">
                  {elevation.name}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Motion System */}
      <Card>
        <CardHeader>
          <CardTitle>Motion & Animation System</CardTitle>
          <CardDescription>
            Duration, easing, and timing tokens for consistent animations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Duration Examples */}
            <div>
              <h4 className="font-medium mb-3">Animation Durations</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  {
                    name: "Fast",
                    value: tokenResolver.resolve(
                      "{primitive.motion.duration.fast}",
                    ),
                    description: "Quick interactions (99ms)",
                  },
                  {
                    name: "Medium",
                    value: tokenResolver.resolve(
                      "{primitive.motion.duration.medium}",
                    ),
                    description: "Exit animations (199ms)",
                  },
                  {
                    name: "Default",
                    value: tokenResolver.resolve(
                      "{primitive.motion.duration.default}",
                    ),
                    description: "Most UI elements (299ms)",
                  },
                  {
                    name: "Slow",
                    value: tokenResolver.resolve(
                      "{primitive.motion.duration.slow}",
                    ),
                    description: "Dialogs, modals (399ms)",
                  },
                  {
                    name: "Very Slow",
                    value: tokenResolver.resolve(
                      "{primitive.motion.duration.very-slow}",
                    ),
                    description: "Loaders, progress (599ms)",
                  },
                ].map((duration) => (
                  <div key={duration.name} className="space-y-2">
                    <button
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition-colors"
                      style={{ transitionDuration: duration.value }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "scale(1.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      Hover me
                    </button>
                    <div className="text-center">
                      <p className="text-xs font-medium">{duration.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {duration.value}
                      </p>
                      {duration.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {duration.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Easing Examples */}
            <div>
              <h4 className="font-medium mb-3">Easing Functions</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    name: "Default",
                    value: tokenResolver.resolve(
                      "{primitive.motion.easing.default}",
                    ),
                    description: "Used for buttons, dialogs, drawers",
                  },
                  {
                    name: "Linear",
                    value: tokenResolver.resolve(
                      "{primitive.motion.easing.linear}",
                    ),
                    description: "For progress bars and loaders",
                  },
                  {
                    name: "Bounce",
                    value: tokenResolver.resolve(
                      "{primitive.motion.easing.bounce}",
                    ),
                    description: "For playful interactions",
                  },
                  {
                    name: "Smooth",
                    value: tokenResolver.resolve(
                      "{primitive.motion.easing.smooth}",
                    ),
                    description: "For subtle transitions",
                  },
                ].map((easing) => (
                  <div key={easing.name} className="space-y-2">
                    <div
                      className="w-4 h-4 bg-green-500 rounded-full mx-auto transition-transform duration-1000 hover:translate-x-16"
                      style={{ transitionTimingFunction: easing.value }}
                    />
                    <div className="text-center">
                      <p className="text-xs font-medium">{easing.name}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {easing.value}
                      </p>
                      {easing.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {easing.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Hover over the dots to see easing differences
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid System */}
      <Card>
        <CardHeader>
          <CardTitle>Grid & Layout System</CardTitle>
          <CardDescription>
            CSS Grid and Flexbox utilities with consistent spacing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Grid Examples */}
            <div>
              <h4 className="font-medium mb-3">CSS Grid Templates</h4>
              <div className="space-y-4">
                {[
                  {
                    name: "2 Columns",
                    value: tokenResolver.resolve(
                      "{primitive.layout.grid.columns.2}",
                    ),
                    cols: 2,
                  },
                  {
                    name: "3 Columns",
                    value: tokenResolver.resolve(
                      "{primitive.layout.grid.columns.3}",
                    ),
                    cols: 3,
                  },
                  {
                    name: "4 Columns",
                    value: tokenResolver.resolve(
                      "{primitive.layout.grid.columns.4}",
                    ),
                    cols: 4,
                  },
                  {
                    name: "Auto-fit (Responsive)",
                    value: tokenResolver.resolve(
                      "{primitive.layout.grid.columns.auto-fit}",
                    ),
                    cols: 0,
                  },
                ].map((grid) => (
                  <div key={grid.name} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium">{grid.name}</p>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {grid.value}
                      </code>
                    </div>
                    <div
                      className="grid gap-2"
                      style={{ gridTemplateColumns: grid.value }}
                    >
                      {Array.from({ length: grid.cols || 6 }, (_, i) => (
                        <div
                          key={i}
                          className="bg-primary/10 border border-primary/20 p-2 rounded text-center text-xs font-medium text-foreground"
                        >
                          Item {i + 1}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Spacing Examples */}
            <div>
              <h4 className="font-medium mb-3">Grid Gap Spacing</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    name: "None",
                    value: tokenResolver.resolve(
                      "{primitive.layout.grid.gap.none}",
                    ),
                  },
                  {
                    name: "Small",
                    value: tokenResolver.resolve(
                      "{primitive.layout.grid.gap.sm}",
                    ),
                  },
                  {
                    name: "Medium",
                    value: tokenResolver.resolve(
                      "{primitive.layout.grid.gap.md}",
                    ),
                  },
                  {
                    name: "Large",
                    value: tokenResolver.resolve(
                      "{primitive.layout.grid.gap.lg}",
                    ),
                  },
                ].map((gap) => (
                  <div key={gap.name} className="space-y-2">
                    <div
                      className="grid grid-cols-3"
                      style={{ gap: gap.value }}
                    >
                      {Array.from({ length: 3 }, (_, i) => (
                        <div
                          key={i}
                          className="bg-secondary/20 border border-secondary/30 p-1 rounded text-center text-xs font-medium text-foreground"
                        >
                          {i + 1}
                        </div>
                      ))}
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium">{gap.name}</p>
                      <p className="text-xs text-foreground/70 font-mono">
                        {gap.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Responsive Breakpoints */}
            <div>
              <h4 className="font-medium mb-3">Responsive Breakpoints</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  {
                    name: "Mobile",
                    key: "xs",
                    value: tokenResolver.resolve(
                      "{primitive.layout.breakpoints.xs}",
                    ),
                  },
                  {
                    name: "Small",
                    key: "sm",
                    value: tokenResolver.resolve(
                      "{primitive.layout.breakpoints.sm}",
                    ),
                  },
                  {
                    name: "Medium",
                    key: "md",
                    value: tokenResolver.resolve(
                      "{primitive.layout.breakpoints.md}",
                    ),
                  },
                  {
                    name: "Large",
                    key: "lg",
                    value: tokenResolver.resolve(
                      "{primitive.layout.breakpoints.lg}",
                    ),
                  },
                  {
                    name: "X-Large",
                    key: "xl",
                    value: tokenResolver.resolve(
                      "{primitive.layout.breakpoints.xl}",
                    ),
                  },
                  {
                    name: "2X-Large",
                    key: "2xl",
                    value: tokenResolver.resolve(
                      "{primitive.layout.breakpoints.2xl}",
                    ),
                  },
                ].map((breakpoint) => (
                  <div key={breakpoint.key} className="p-3 border rounded">
                    <p className="font-medium text-sm">{breakpoint.name}</p>
                    <p className="text-xs text-foreground/70 font-mono">
                      {breakpoint.key}: {breakpoint.value}
                    </p>
                    <code className="text-xs bg-muted px-2 py-1 rounded text-foreground/80">
                      @media (min-width: {breakpoint.value})
                    </code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Essential Missing Components Showcase
 * Covers dialogs, navigation, loading states, and form enhancements
 */
function EssentialComponentsShowcase() {
  // State management for dialogs and modals
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isAlertDialogOpen, setIsAlertDialogOpen] = React.useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isCommandOpen, setIsCommandOpen] = React.useState(false);
  const [showShortcutsInfo, setShowShortcutsInfo] = React.useState(false);

  // Global keyboard shortcuts
  useKeyboardShortcuts([
    createShortcut.command(
      "/",
      () => setShowShortcutsInfo(true),
      "Show keyboard shortcuts",
    ),
    createShortcut.command(
      "k",
      () => setIsCommandOpen(true),
      "Open command palette",
    ),
    createShortcut.command("d", () => setIsDialogOpen(true), "Open dialog"),
    createShortcut.commandEscape(
      () => setIsAlertDialogOpen(true),
      "Open delete dialog",
    ),
  ]);

  // Modal-specific shortcuts
  useModalShortcuts(
    isDialogOpen,
    () => setIsDialogOpen(false),
    () => {
      console.log("Dialog submitted via CMD+Enter");
      setIsDialogOpen(false);
    },
  );

  useModalShortcuts(
    isAlertDialogOpen,
    () => setIsAlertDialogOpen(false),
    () => {
      console.log("Alert dialog confirmed via CMD+Enter");
      setIsAlertDialogOpen(false);
    },
  );

  useModalShortcuts(isDrawerOpen, () => setIsDrawerOpen(false));
  useModalShortcuts(isSheetOpen, () => setIsSheetOpen(false));
  useModalShortcuts(isCommandOpen, () => setIsCommandOpen(false));

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Keyboard Shortcuts Info Dialog */}
        <Dialog open={showShortcutsInfo} onOpenChange={setShowShortcutsInfo}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Keyboard className="h-5 w-5" />
                Keyboard Shortcuts
              </DialogTitle>
              <DialogDescription>
                Use these shortcuts to navigate and interact with the design
                system
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Global Shortcuts</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Show shortcuts</span>
                    <code className="bg-muted px-2 py-1 rounded text-xs">
                      ⌘ /
                    </code>
                  </div>
                  <div className="flex justify-between">
                    <span>Open command palette</span>
                    <code className="bg-muted px-2 py-1 rounded text-xs">
                      ⌘ K
                    </code>
                  </div>
                  <div className="flex justify-between">
                    <span>Open dialog</span>
                    <code className="bg-muted px-2 py-1 rounded text-xs">
                      ⌘ D
                    </code>
                  </div>
                  <div className="flex justify-between">
                    <span>Open delete dialog</span>
                    <code className="bg-muted px-2 py-1 rounded text-xs">
                      ⌘ ESC
                    </code>
                  </div>
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Modal Shortcuts</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Close dialog/modal</span>
                    <code className="bg-muted px-2 py-1 rounded text-xs">
                      ESC
                    </code>
                  </div>
                  <div className="flex justify-between">
                    <span>Submit/Approve</span>
                    <code className="bg-muted px-2 py-1 rounded text-xs">
                      ⌘ ENTER
                    </code>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowShortcutsInfo(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Enhanced Loading States */}
        <Card>
          <CardHeader>
            <CardTitle>Enhanced Loading & Feedback States</CardTitle>
            <CardDescription>
              Loading spinners, enhanced skeletons, and state indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Loading Variants */}
              <div>
                <h4 className="font-medium mb-3">Loading Spinners</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-xs">Primary Spinner</p>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto"></div>
                    <p className="text-xs">Border Spinner</p>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="flex space-x-1 justify-center">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                    </div>
                    <p className="text-xs">Dot Spinner</p>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="inline-block animate-pulse">
                      <div className="w-8 h-8 bg-primary rounded-full opacity-75"></div>
                    </div>
                    <p className="text-xs">Pulse Loading</p>
                  </div>
                </div>
              </div>

              {/* Loading Buttons */}
              <div>
                <h4 className="font-medium mb-3">Loading Button States</h4>
                <div className="flex flex-wrap gap-4">
                  <Button disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </Button>
                  <Button disabled variant="secondary">
                    <Clock className="mr-2 h-4 w-4" />
                    Saving Draft...
                  </Button>
                  <Button disabled variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Uploading...
                  </Button>
                </div>
              </div>

              {/* Enhanced Skeletons */}
              <div>
                <h4 className="font-medium mb-3">Enhanced Skeleton Patterns</h4>
                <div className="space-y-4">
                  {/* Product Card Skeleton */}
                  <div className="border rounded-lg p-4">
                    <div className="flex space-x-4">
                      <Skeleton className="h-16 w-16 rounded-md" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </div>

                  {/* Article Skeleton */}
                  <div className="border rounded-lg p-4 space-y-3">
                    <Skeleton className="h-40 w-full rounded-md" />
                    <Skeleton className="h-6 w-2/3" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dialogs & Modals */}
        <Card>
          <CardHeader>
            <CardTitle>Dialogs & Modals</CardTitle>
            <CardDescription>
              Alert dialogs, confirmation dialogs, and modal patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Keyboard Shortcuts Info */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Keyboard className="h-5 w-5" />
                    <div>
                      <h4 className="font-medium">
                        Keyboard Shortcuts Available
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Use keyboard shortcuts to interact with dialogs and
                        modals
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowShortcutsInfo(true)}
                  >
                    View All ⌘/
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                {/* Standard Dialog with Shortcuts */}
                <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
                  Open Dialog <code className="ml-2 text-xs">⌘D</code>
                </Button>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Profile</DialogTitle>
                      <DialogDescription>
                        Make changes to your profile here. Press ESC to close or
                        ⌘+Enter to submit.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                          Name
                        </Label>
                        <Input
                          id="name"
                          defaultValue="John Doe"
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">
                          Email
                        </Label>
                        <Input
                          id="email"
                          defaultValue="john@example.com"
                          className="col-span-3"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel <code className="ml-2 text-xs">ESC</code>
                      </Button>
                      <Button
                        type="submit"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Save changes <code className="ml-2 text-xs">⌘↵</code>
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Alert Dialog with Shortcuts */}
                <Button
                  variant="destructive"
                  onClick={() => setIsAlertDialogOpen(true)}
                >
                  Delete Item <code className="ml-2 text-xs">⌘ESC</code>
                </Button>

                <AlertDialog
                  open={isAlertDialogOpen}
                  onOpenChange={setIsAlertDialogOpen}
                >
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Are you absolutely sure?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. Press ESC to cancel or
                        ⌘+Enter to confirm.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel
                        onClick={() => setIsAlertDialogOpen(false)}
                      >
                        Cancel <code className="ml-2 text-xs">ESC</code>
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => setIsAlertDialogOpen(false)}
                      >
                        Continue <code className="ml-2 text-xs">⌘↵</code>
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Drawer with Shortcuts */}
                <Button variant="outline" onClick={() => setIsDrawerOpen(true)}>
                  Open Drawer
                </Button>

                <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                  <DrawerContent>
                    <DrawerHeader>
                      <DrawerTitle>Settings</DrawerTitle>
                      <DrawerDescription>
                        Configure your application settings. Press ESC to close.
                      </DrawerDescription>
                    </DrawerHeader>
                    <div className="p-4 space-y-4">
                      <div className="space-y-2">
                        <Label>Theme</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a theme" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                            <SelectItem value="system">System</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DrawerFooter>
                      <Button onClick={() => setIsDrawerOpen(false)}>
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsDrawerOpen(false)}
                      >
                        Cancel <code className="ml-2 text-xs">ESC</code>
                      </Button>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>

                {/* Sheet with Shortcuts */}
                <Button variant="outline" onClick={() => setIsSheetOpen(true)}>
                  Open Sheet
                </Button>

                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>User Profile</SheetTitle>
                      <SheetDescription>
                        View and edit your profile information. Press ESC to
                        close.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="profile-name">Name</Label>
                        <Input id="profile-name" placeholder="Your name" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profile-bio">Bio</Label>
                        <Textarea
                          id="profile-bio"
                          placeholder="Tell us about yourself"
                        />
                      </div>
                    </div>
                    <SheetFooter>
                      <Button
                        type="submit"
                        onClick={() => setIsSheetOpen(false)}
                      >
                        Save Profile
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsSheetOpen(false)}
                      >
                        Cancel <code className="ml-2 text-xs">ESC</code>
                      </Button>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Components */}
        <Card>
          <CardHeader>
            <CardTitle>Navigation Components</CardTitle>
            <CardDescription>
              Breadcrumbs, tooltips, dropdown menus, and navigation aids
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Breadcrumbs */}
              <div>
                <h4 className="font-medium mb-3">Breadcrumb Navigation</h4>
                <div className="space-y-2">
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbLink href="#">Home</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbLink href="#">Products</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>Electronics</BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>

                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbLink href="#">Dashboard</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbEllipsis />
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbLink href="#">Category</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>Current Page</BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </div>

              {/* Tooltips */}
              <div>
                <h4 className="font-medium mb-3">Tooltip System</h4>
                <div className="flex flex-wrap gap-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline">Hover for tooltip</Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>This is a helpful tooltip</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Info className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Information about this feature</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary">Beta</Badge>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>This feature is in beta testing</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Dropdown Menus */}
              <div>
                <h4 className="font-medium mb-3">Dropdown Menus</h4>
                <div className="flex flex-wrap gap-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">Actions</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Profile</DropdownMenuItem>
                      <DropdownMenuItem>Settings</DropdownMenuItem>
                      <DropdownMenuItem>Support</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Sign out</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Search className="mr-2 h-4 w-4" />
                        Search
                        <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>Share</DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem>Email</DropdownMenuItem>
                              <DropdownMenuItem>Message</DropdownMenuItem>
                              <DropdownMenuItem>Copy link</DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Enhancements */}
        <Card>
          <CardHeader>
            <CardTitle>Enhanced Form Components</CardTitle>
            <CardDescription>
              Date pickers, hover cards, accordions, and advanced form controls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Date Picker */}
              <div>
                <h4 className="font-medium mb-3">Date & Time Pickers</h4>
                <div className="flex flex-wrap gap-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline">
                        <Calendar className="mr-2 h-4 w-4" />
                        Pick a date
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent mode="single" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Hover Cards */}
              <div>
                <h4 className="font-medium mb-3">Hover Cards</h4>
                <div className="flex gap-4">
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <Button variant="link">@username</Button>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <div className="flex space-x-4">
                        <Avatar>
                          <AvatarFallback>UN</AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold">@username</h4>
                          <p className="text-sm text-muted-foreground">
                            Full-stack developer creating amazing web
                            experiences.
                          </p>
                          <div className="flex items-center pt-2">
                            <Calendar className="mr-2 h-3 w-3 opacity-70" />
                            <span className="text-xs text-muted-foreground">
                              Joined December 2021
                            </span>
                          </div>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
              </div>

              {/* Accordion */}
              <div>
                <h4 className="font-medium mb-3">Accordion Sections</h4>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>Account Settings</AccordionTrigger>
                    <AccordionContent>
                      Manage your account settings including profile
                      information, password changes, and notification
                      preferences.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <AccordionTrigger>Privacy & Security</AccordionTrigger>
                    <AccordionContent>
                      Configure your privacy settings, two-factor
                      authentication, and review security activity on your
                      account.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3">
                    <AccordionTrigger>Billing & Subscriptions</AccordionTrigger>
                    <AccordionContent>
                      View your billing history, manage subscriptions, and
                      update payment methods for your account.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              {/* Pagination */}
              <div>
                <h4 className="font-medium mb-3">Pagination Controls</h4>
                <div className="space-y-4">
                  {/* Basic Pagination */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Basic pagination with previous/next
                    </p>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious href="#" />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink href="#">1</PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink href="#" isActive>
                            2
                          </PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink href="#">3</PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext href="#" />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>

                  {/* Pagination with Ellipsis */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Pagination with ellipsis for large datasets
                    </p>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious href="#" />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink href="#">1</PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink href="#">8</PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink href="#" isActive>
                            9
                          </PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink href="#">10</PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink href="#">20</PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext href="#" />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>

                  {/* Compact Pagination */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Compact pagination for mobile or tight spaces
                    </p>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious href="#" />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink href="#" isActive>
                            5 / 20
                          </PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext href="#" />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                </div>
              </div>

              {/* Date & Time Pickers */}
              <div>
                <h4 className="font-medium mb-3">Date & Time Controls</h4>
                <div className="space-y-6">
                  {/* Date Picker */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Date picker (popover)
                      </p>
                      <DatePicker
                        placeholder="Select a date"
                        onChange={(date) => console.log("Selected date:", date)}
                      />
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Date picker with value
                      </p>
                      <DatePicker
                        value={new Date()}
                        placeholder="Select a date"
                        onChange={(date) => console.log("Selected date:", date)}
                      />
                    </div>
                  </div>

                  {/* Calendar Static */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Static calendar display
                    </p>
                    <div className="border rounded-md p-3 w-fit">
                      <DateCalendar
                        mode="single"
                        selected={new Date()}
                        className="rounded-md border-0 p-0"
                      />
                    </div>
                  </div>

                  {/* Time Pickers */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 24-hour format */}
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        24-hour time picker
                      </p>
                      <TimePicker
                        placeholder="Select time (24h)"
                        format="24"
                        onChange={(time) => console.log("24h time:", time)}
                      />
                    </div>

                    {/* 12-hour format */}
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        12-hour time picker with AM/PM
                      </p>
                      <TimePicker
                        placeholder="Select time (12h)"
                        format="12"
                        onChange={(time) => console.log("12h time:", time)}
                      />
                    </div>

                    {/* With seconds */}
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Time picker with seconds
                      </p>
                      <TimePicker
                        placeholder="Select time with seconds"
                        format="24"
                        includeSeconds
                        onChange={(time) =>
                          console.log("Time with seconds:", time)
                        }
                      />
                    </div>

                    {/* 15-minute steps */}
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        15-minute step increments
                      </p>
                      <TimePicker
                        placeholder="Select time (15min steps)"
                        format="12"
                        step={15}
                        onChange={(time) =>
                          console.log("15min step time:", time)
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Link Components */}
              <div>
                <h4 className="font-medium mb-3">Link Components</h4>
                <div className="space-y-4">
                  {/* Basic Links */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Link variants
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <Link href="#" variant="default">
                        Default Link
                      </Link>
                      <Link href="#" variant="destructive">
                        Destructive Link
                      </Link>
                      <Link href="#" variant="success">
                        Success Link
                      </Link>
                      <Link href="#" variant="warning">
                        Warning Link
                      </Link>
                      <Link href="#" variant="info">
                        Info Link
                      </Link>
                      <Link href="#" variant="muted">
                        Muted Link
                      </Link>
                      <Link href="#" variant="ghost">
                        Ghost Link
                      </Link>
                    </div>
                  </div>

                  {/* Link Sizes */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Link sizes
                    </p>
                    <div className="flex flex-wrap items-center gap-4">
                      <Link href="#" size="sm">
                        Small Link
                      </Link>
                      <Link href="#" size="default">
                        Default Link
                      </Link>
                      <Link href="#" size="lg">
                        Large Link
                      </Link>
                      <Link href="#" size="xl">
                        Extra Large Link
                      </Link>
                    </div>
                  </div>

                  {/* External Links */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      External links (with icon)
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <Link href="https://example.com" external>
                        External Link
                      </Link>
                      <Link
                        href="https://github.com"
                        external
                        variant="success"
                      >
                        GitHub Repository
                      </Link>
                    </div>
                  </div>

                  {/* Underline Options */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Underline options
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <Link href="#" underline="none">
                        No Underline
                      </Link>
                      <Link href="#" underline="hover">
                        Hover Underline
                      </Link>
                      <Link href="#" underline="always">
                        Always Underlined
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

/**
 * Icon System Showcase
 * Comprehensive icon documentation with sizing tokens
 */
function IconSystemShowcase() {
  const iconSizes = {
    xs: 12,
    sm: 16,
    base: 20,
    lg: 24,
    xl: 28,
    "2xl": 32,
    "3xl": 36,
  };

  return (
    <div className="space-y-6">
      {/* Icon Sizes */}
      <Card>
        <CardHeader>
          <CardTitle>Icon Sizing System</CardTitle>
          <CardDescription>
            Consistent icon scales using Lucide React icons
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Object.entries(iconSizes).map(([size, pixels]) => (
              <div key={size} className="text-center space-y-2">
                <div className="flex justify-center items-center h-16">
                  <CheckCircle size={pixels} className="text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium">{size}</p>
                  <p className="text-xs text-muted-foreground">{pixels}px</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Common Icons */}
      <Card>
        <CardHeader>
          <CardTitle>Common Icon Set</CardTitle>
          <CardDescription>
            Frequently used icons from Lucide React library
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 md:grid-cols-12 gap-4">
            {[
              { icon: CheckCircle, name: "Success" },
              { icon: AlertCircle, name: "Error" },
              { icon: Info, name: "Info" },
              { icon: AlertTriangle, name: "Warning" },
              { icon: Search, name: "Search" },
              { icon: Upload, name: "Upload" },
              { icon: Calendar, name: "Calendar" },
              { icon: Clock, name: "Clock" },
              { icon: MoreHorizontal, name: "More" },
              { icon: Loader2, name: "Loading" },
            ].map(({ icon: Icon, name }) => (
              <div key={name} className="text-center space-y-2">
                <div className="flex justify-center items-center h-10">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-xs">{name}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Advanced Patterns Showcase
 * Complex interactions, data visualization, and advanced components
 */
function AdvancedPatternsShowcase() {
  const [isCommandOpen, setIsCommandOpen] = React.useState(false);

  // Command palette shortcuts
  useKeyboardShortcuts([
    createShortcut.command(
      "k",
      () => setIsCommandOpen(true),
      "Open command palette",
    ),
  ]);

  useModalShortcuts(isCommandOpen, () => setIsCommandOpen(false));

  return (
    <div className="space-y-6">
      {/* Command Palette */}
      <Card>
        <CardHeader>
          <CardTitle>Command Palette</CardTitle>
          <CardDescription>
            Search and command interface for power users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Press ⌘K to open the command palette or click below
              </p>
              <Button variant="outline" onClick={() => setIsCommandOpen(true)}>
                Open Command ⌘K
              </Button>
            </div>

            <Command
              className="rounded-lg border"
              style={{ display: isCommandOpen ? "block" : "none" }}
            >
              <CommandInput placeholder="Type a command or search..." />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Suggestions">
                  <CommandItem>
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>Calendar</span>
                  </CommandItem>
                  <CommandItem>
                    <Search className="mr-2 h-4 w-4" />
                    <span>Search Emoji</span>
                  </CommandItem>
                  <CommandItem>
                    <Upload className="mr-2 h-4 w-4" />
                    <span>Upload File</span>
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Settings">
                  <CommandItem>
                    <Info className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                    <CommandShortcut>⌘P</CommandShortcut>
                  </CommandItem>
                  <CommandItem>
                    <Clock className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                    <CommandShortcut>⌘S</CommandShortcut>
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        </CardContent>
      </Card>

      {/* Data Visualization Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Data Visualization Components</CardTitle>
          <CardDescription>
            Chart components and data display patterns (Chart.js integration
            ready)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center">
              <Info className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Chart Components Ready</p>
              <p className="text-sm text-muted-foreground">
                Integration with Chart.js, Recharts, or D3.js can be added here
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Interactions */}
      <Card>
        <CardHeader>
          <CardTitle>Rich Interaction Patterns</CardTitle>
          <CardDescription>
            Complex UI patterns for enhanced user experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center py-8 space-y-4">
              <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                <MoreHorizontal className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Advanced Patterns Available</p>
                <p className="text-sm text-muted-foreground">
                  Drag & drop, virtualization, and complex form patterns can be
                  implemented
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Accessibility & WCAG Compliance Showcase
 * Demonstrates accessible components and guidelines
 */
function AccessibilityShowcase() {
  return (
    <div className="space-y-6">
      {/* Color Contrast Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Color Contrast & WCAG Compliance
          </CardTitle>
          <CardDescription>
            All text meets WCAG AA standards for color contrast (4.5:1 for
            normal text, 3:1 for large text)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Text Contrast Examples */}
            <div>
              <h4 className="font-medium mb-3">Accessible Text Hierarchy</h4>
              <div className="space-y-2">
                <p className="text-foreground">
                  Primary text - High contrast for main content
                </p>
                <p className="text-foreground/90">
                  Secondary text - Good contrast for supporting content
                </p>
                <p className="text-foreground/70">
                  Tertiary text - Sufficient contrast for captions
                </p>
                <p className="text-foreground/50">
                  Disabled text - Meets minimum requirements
                </p>
              </div>
            </div>

            {/* Focus States */}
            <div>
              <h4 className="font-medium mb-3">Focus Management</h4>
              <div className="flex flex-wrap gap-4">
                <Button className="focus:ring-2 focus:ring-primary focus:ring-offset-2">
                  Accessible Focus
                </Button>
                <Button
                  variant="outline"
                  className="focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  High Contrast Ring
                </Button>
                <Button
                  variant="secondary"
                  className="focus:ring-2 focus:ring-accent focus:ring-offset-2"
                >
                  Alternative Focus Color
                </Button>
                <div className="bg-gray-800 p-4 rounded">
                  <Button
                    variant="outline-white"
                    className="focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
                  >
                    White Outline Button
                  </Button>
                </div>
              </div>
              <p className="text-sm text-foreground/70 mt-2">
                All interactive elements have visible focus indicators that meet
                WCAG requirements
              </p>
            </div>

            {/* Touch Target Sizes */}
            <div>
              <h4 className="font-medium mb-3">Touch Target Guidelines</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded">
                  <h5 className="font-medium mb-2">Desktop Minimum</h5>
                  <Button
                    size="sm"
                    className="min-h-[44px] min-w-[44px]"
                    aria-label="Minimum desktop touch target - 44x44 pixels"
                  >
                    44px
                  </Button>
                  <p className="text-xs text-foreground/70 mt-2">
                    44×44px minimum for desktop
                  </p>
                </div>
                <div className="p-4 border rounded">
                  <h5 className="font-medium mb-2">Touch Optimized</h5>
                  <Button
                    className="min-h-[48px] min-w-[48px]"
                    aria-label="Touch-optimized target - 48x48 pixels"
                  >
                    48px
                  </Button>
                  <p className="text-xs text-foreground/70 mt-2">
                    48×48px for mobile devices
                  </p>
                </div>
                <div className="p-4 border rounded">
                  <h5 className="font-medium mb-2">Comfortable</h5>
                  <Button
                    size="lg"
                    className="min-h-[56px] min-w-[56px]"
                    aria-label="Comfortable touch target - 56x56 pixels"
                  >
                    56px
                  </Button>
                  <p className="text-xs text-foreground/70 mt-2">
                    56×56px for comfortable interaction
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Semantic HTML & ARIA */}
      <Card>
        <CardHeader>
          <CardTitle>Semantic HTML & ARIA Labels</CardTitle>
          <CardDescription>
            Proper semantic markup and ARIA attributes for screen readers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-3">Form Accessibility</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="accessible-email">Email Address *</Label>
                  <Input
                    id="accessible-email"
                    type="email"
                    placeholder="Enter your email"
                    aria-describedby="email-help"
                    aria-required="true"
                  />
                  <p
                    id="email-help"
                    className="text-xs text-foreground/70 mt-1"
                  >
                    We'll never share your email with anyone else
                  </p>
                </div>
                <div>
                  <Label htmlFor="accessible-password">Password</Label>
                  <Input
                    id="accessible-password"
                    type="password"
                    aria-describedby="password-requirements"
                    aria-invalid="false"
                  />
                  <p
                    id="password-requirements"
                    className="text-xs text-foreground/70 mt-1"
                  >
                    Must be at least 8 characters with uppercase, lowercase, and
                    numbers
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Navigation Landmarks</h4>
              <div className="p-4 border rounded bg-muted/20">
                <code className="text-sm">
                  {`<nav aria-label="Main navigation">
  <header role="banner">
  <main role="main">
  <aside role="complementary">
  <footer role="contentinfo">`}
                </code>
              </div>
              <p className="text-xs text-foreground/70 mt-2">
                Use semantic HTML elements and ARIA roles for screen reader
                navigation
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keyboard Navigation */}
      <Card>
        <CardHeader>
          <CardTitle>Keyboard Navigation & Shortcuts</CardTitle>
          <CardDescription>
            Full keyboard accessibility with logical tab order
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-3">Tab Order Demonstration</h4>
              <div className="flex flex-wrap gap-4">
                <Button tabIndex={1}>First Tab Stop</Button>
                <Input
                  tabIndex={2}
                  placeholder="Second Tab Stop"
                  className="w-40"
                />
                <Button variant="outline" tabIndex={3}>
                  Third Tab Stop
                </Button>
                <Button variant="secondary" tabIndex={4}>
                  Fourth Tab Stop
                </Button>
              </div>
              <p className="text-xs text-foreground/70 mt-2">
                Press Tab to navigate through interactive elements in logical
                order
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-3">Keyboard Shortcuts</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 border rounded">
                    <span>Show help</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">
                      ⌘ /
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 border rounded">
                    <span>Open command palette</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">
                      ⌘ K
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 border rounded">
                    <span>Close dialog</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">
                      Esc
                    </kbd>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 border rounded">
                    <span>Submit form</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">
                      ⌘ ↵
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 border rounded">
                    <span>Navigate menu</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">
                      ↑ ↓
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 border rounded">
                    <span>Select option</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">
                      Space
                    </kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accessibility Testing Tools */}
      <Card>
        <CardHeader>
          <CardTitle>Testing & Validation</CardTitle>
          <CardDescription>
            Tools and methods for ensuring accessibility compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-3">Recommended Testing Tools</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded">
                  <h5 className="font-medium">Browser Extensions</h5>
                  <ul className="text-sm text-foreground/80 mt-2 space-y-1">
                    <li>• axe DevTools</li>
                    <li>• WAVE Web Accessibility Evaluator</li>
                    <li>• Lighthouse Accessibility Audit</li>
                  </ul>
                </div>
                <div className="p-4 border rounded">
                  <h5 className="font-medium">Screen Readers</h5>
                  <ul className="text-sm text-foreground/80 mt-2 space-y-1">
                    <li>• NVDA (Windows)</li>
                    <li>• VoiceOver (macOS)</li>
                    <li>• JAWS (Windows)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Compliance Checklist</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm">
                    Color contrast ratios meet WCAG AA standards
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm">
                    All interactive elements are keyboard accessible
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm">
                    Focus indicators are clearly visible
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm">
                    Touch targets meet minimum size requirements
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm">
                    Proper ARIA labels and semantic HTML
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Debug panel showing token resolution
 */
function TokenDebugPanel() {
  const resolver = React.useMemo(() => ThemeTokenResolver.getInstance(), []);

  const statusColors = React.useMemo(
    () => resolver.getStatusColors(),
    [resolver],
  );
  const spacing = React.useMemo(() => resolver.getSpacing(), [resolver]);
  const typography = React.useMemo(() => resolver.getTypography(), [resolver]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Status Colors</h3>
        <div className="space-y-1 text-sm font-mono">
          {Object.entries(statusColors).map(([status, colors]) => (
            <details key={status} className="cursor-pointer">
              <summary className="font-medium">{status}</summary>
              <div className="ml-4 mt-1 space-y-1">
                {Object.entries(colors).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="w-16">{key}:</span>
                    <span className="text-xs">{value}</span>
                    {key.includes("background") && (
                      <div
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: value }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>

      <div className="p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Spacing</h3>
        <div className="space-y-1 text-sm font-mono">
          {Object.entries(spacing).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="w-8">{key}:</span>
              <span className="text-xs">{value}</span>
              <div className="bg-primary h-4 border" style={{ width: value }} />
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Typography</h3>
        <div className="space-y-2">
          <div>
            <h4 className="font-medium text-sm">Font Sizes</h4>
            <div className="space-y-1 text-sm font-mono">
              {Object.entries(typography.fontSize).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-8">{key}:</span>
                  <span className="text-xs">{value}</span>
                  <span style={{ fontSize: value }}>Sample</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-medium text-sm">Line Heights</h4>
            <div className="space-y-1 text-sm font-mono">
              {Object.entries(typography.lineHeight).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-16">{key}:</span>
                  <span className="text-xs">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
