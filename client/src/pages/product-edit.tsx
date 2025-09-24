import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useRoute, useLocation } from "wouter";
import { ChannelsTab } from "@/components/channels/ChannelsTab";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navigation from "@/components/navigation";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
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
  ArrowLeft,
  Save,
  Eye,
  Settings,
  Image,
  Search,
  Layers,
  Globe,
  History,
  ChevronRight,
  Package,
  Upload,
  X,
  Edit2,
  Trash2,
  FileImage,
  Video,
  File,
  Plus,
  Loader2,
  Brain,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Form validation schema
const productEditSchema = z.object({
  name: z
    .string()
    .min(1, "Product name is required")
    .max(255, "Product name is too long"),
  slug: z
    .string()
    .min(1, "URL slug is required")
    .max(255, "URL slug is too long")
    .regex(
      /^[a-z0-9-]+$/,
      "URL slug can only contain lowercase letters, numbers, and hyphens",
    ),
  shortDescription: z
    .string()
    .max(1000, "Short description is too long")
    .optional(),
  longDescription: z.string().optional(),
  story: z.string().optional(),
  brandId: z.number().min(1, "Brand selection is required"),
  sku: z.string().max(100, "SKU is too long").optional(),
  status: z.enum(["draft", "review", "live", "archived"], {
    errorMap: () => ({ message: "Please select a valid status" }),
  }),
  isVariant: z.boolean().default(false),
  // Pricing with proper validation
  price: z
    .string()
    .optional()
    .refine(
      (val) => !val || !isNaN(parseFloat(val)),
      "Price must be a valid number",
    )
    .refine((val) => !val || parseFloat(val) >= 0, "Price must be positive"),
  compareAtPrice: z
    .string()
    .optional()
    .refine(
      (val) => !val || !isNaN(parseFloat(val)),
      "Compare price must be a valid number",
    )
    .refine(
      (val) => !val || parseFloat(val) >= 0,
      "Compare price must be positive",
    ),
  // Inventory fields
  stock: z.number().min(0, "Stock must be positive").optional(),
  lowStockThreshold: z.number().min(0, "Threshold must be positive").optional(),
  // SEO fields for Phase 3.4 SEO Tab Enhancement
  metaTitle: z
    .string()
    .max(60, "Meta title should be under 60 characters for optimal SEO")
    .optional(),
  metaDescription: z
    .string()
    .max(160, "Meta description should be under 160 characters for optimal SEO")
    .optional(),
  canonicalUrl: z
    .string()
    .url("Must be a valid URL")
    .max(500, "URL is too long")
    .optional()
    .or(z.literal("")),
  ogTitle: z
    .string()
    .max(60, "Open Graph title should be under 60 characters")
    .optional(),
  ogDescription: z
    .string()
    .max(160, "Open Graph description should be under 160 characters")
    .optional(),
  ogImage: z
    .string()
    .url("Must be a valid image URL")
    .max(500, "URL is too long")
    .optional()
    .or(z.literal("")),
  focusKeywords: z.string().max(500, "Keywords are too long").optional(),
});

type ProductEditForm = z.infer<typeof productEditSchema>;

export default function ProductEdit() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/products/:id/edit");
  const productId = params?.id ? parseInt(params.id) : null;
  const [activeTab, setActiveTab] = useState("general");
  const [completionProgress, setCompletionProgress] = useState(0);
  const [mediaAssets, setMediaAssets] = useState<any[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<{
    [key: string]: number;
  }>({});
  const [isDragOver, setIsDragOver] = useState(false);
  const [editingMedia, setEditingMedia] = useState<any>(null);
  const [editForm, setEditForm] = useState<{
    assetType: string;
    altText: string;
  }>({ assetType: "", altText: "" });

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Redirect if no product ID
  useEffect(() => {
    if (!productId) {
      toast({
        title: "Error",
        description: "Invalid product ID",
        variant: "destructive",
      });
      navigate("/products");
    }
  }, [productId, navigate, toast]);

  // Fetch product data
  const { data: product, isLoading: productLoading } = useQuery<any>({
    queryKey: ["/api/products", productId],
    enabled: !!productId,
    retry: false,
  });

  // Fetch brands for dropdown
  const { data: brands } = useQuery<any[]>({
    queryKey: ["/api/brands"],
    retry: false,
  });

  // Fetch media assets for product
  const { data: fetchedMediaAssets, refetch: refetchMedia } = useQuery<any[]>({
    queryKey: ["/api/media-assets", productId],
    queryFn: () =>
      apiRequest("GET", `/api/media-assets?productId=${productId}`),
    enabled: !!productId,
    retry: false,
  });

  // Update local media state when data loads
  useEffect(() => {
    if (fetchedMediaAssets) {
      setMediaAssets(fetchedMediaAssets);
    }
  }, [fetchedMediaAssets]);

  // Form setup
  const form = useForm<ProductEditForm>({
    resolver: zodResolver(productEditSchema),
    mode: "onChange", // Enable real-time validation
    defaultValues: {
      name: "",
      slug: "",
      shortDescription: "",
      longDescription: "",
      story: "",
      brandId: 0,
      sku: "",
      status: "draft",
      isVariant: false,
      price: "",
      compareAtPrice: "",
      stock: undefined,
      lowStockThreshold: undefined,
      // SEO field defaults
      metaTitle: "",
      metaDescription: "",
      canonicalUrl: "",
      ogTitle: "",
      ogDescription: "",
      ogImage: "",
      focusKeywords: "",
    },
  });

  // Update form when product data loads
  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name || "",
        slug: product.slug || "",
        shortDescription: product.shortDescription || "",
        longDescription: product.longDescription || "",
        story: product.story || "",
        brandId: product.brandId || 0,
        sku: product.sku || "",
        status: product.status || "draft",
        isVariant: product.isVariant || false,
        // Convert prices from cents to dollars for display
        price: product.price ? (product.price / 100).toFixed(2) : "",
        compareAtPrice: product.compareAtPrice
          ? (product.compareAtPrice / 100).toFixed(2)
          : "",
        stock: product.stock || undefined,
        lowStockThreshold: product.lowStockThreshold || undefined,
        // SEO fields from database
        metaTitle: product.metaTitle || "",
        metaDescription: product.metaDescription || "",
        canonicalUrl: product.canonicalUrl || "",
        ogTitle: product.ogTitle || "",
        ogDescription: product.ogDescription || "",
        ogImage: product.ogImage || "",
        focusKeywords: product.focusKeywords || "",
      });
    }
  }, [product, form]);

  // Calculate completion progress
  useEffect(() => {
    const watchedValues = form.watch();
    const requiredFields = ["name", "slug", "brandId"];
    const optionalFields = [
      "shortDescription",
      "longDescription",
      "story",
      "sku",
      "metaTitle",
      "metaDescription",
      "canonicalUrl",
      "ogTitle",
      "ogDescription",
      "focusKeywords",
      "weight",
      "dimensions",
      "material",
      "color",
      "price",
    ];

    const requiredComplete = requiredFields.every((field) => {
      const value = watchedValues[field as keyof typeof watchedValues];
      if (typeof value === "string") {
        return value.trim() !== "";
      } else if (typeof value === "number") {
        return value > 0;
      } else if (typeof value === "boolean") {
        return true; // boolean fields don't affect required completion
      }
      return false;
    });

    const optionalComplete = optionalFields.filter((field) => {
      const value = watchedValues[field as keyof typeof watchedValues];
      return value && typeof value === "string" && value.trim() !== "";
    }).length;

    // Factor in media assets completion (5% bonus for having media)
    const hasMedia = mediaAssets.length > 0;
    const mediaBonus = hasMedia ? 5 : 0;

    const totalProgress = requiredComplete
      ? 40 + (optionalComplete / optionalFields.length) * 60 + mediaBonus
      : (optionalComplete / optionalFields.length) * 40 + mediaBonus;
    setCompletionProgress(Math.round(Math.min(totalProgress, 100)));
  }, [form.watch(), mediaAssets]);

  // Generate slug from name with improved validation
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
      .substring(0, 255); // Ensure max length
  };

  // Format price for display
  const formatPrice = (value: string) => {
    if (!value) return "";
    const num = parseFloat(value);
    return isNaN(num) ? value : num.toFixed(2);
  };

  // Check for unsaved changes
  const hasUnsavedChanges = form.formState.isDirty;

  // Warn user about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest(
        "PATCH",
        `/api/products/${productId}`,
        data,
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products", productId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/counts"] });
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
      navigate("/products");
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error?.message || "Failed to update product",
        variant: "destructive",
      });
    },
  });

  // Media upload mutation
  const uploadMediaMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("media", file);
      });

      return apiRequest("POST", `/api/products/${productId}/media`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: (data) => {
      setMediaAssets((prev) => [...prev, ...data.assets]);
      refetchMedia();
      toast({
        title: "Success",
        description: "Media uploaded successfully",
      });
    },
    onError: (error: any) => {
      console.error("Media upload error:", error);

      // Provide specific error messages based on error type
      let title = "Upload Failed";
      let description = "Unknown error occurred";

      if (error?.response?.status === 413) {
        title = "Files Too Large";
        description =
          "One or more files exceed the server's size limit. Please reduce file sizes and try again.";
      } else if (error?.response?.status === 415) {
        title = "Unsupported File Type";
        description =
          "One or more files are not supported. Please use JPEG, PNG, GIF, WebP, MP4, WebM, or PDF files.";
      } else if (error?.response?.status === 429) {
        title = "Too Many Uploads";
        description =
          "You're uploading too quickly. Please wait a moment and try again.";
      } else if (error?.response?.status === 507) {
        title = "Storage Full";
        description =
          "Server storage is full. Please contact support or try again later.";
      } else if (error?.response?.status >= 500) {
        title = "Server Error";
        description =
          "The server encountered an error while processing your upload. Please try again.";
      } else if (error?.message) {
        description = error.message;
      }

      toast({
        title,
        description,
        variant: "destructive",
      });
    },
  });

  // Media update mutation
  const updateMediaMutation = useMutation({
    mutationFn: async ({
      mediaId,
      updates,
    }: {
      mediaId: number;
      updates: any;
    }) => {
      return apiRequest(
        "PUT",
        `/api/products/${productId}/media/${mediaId}`,
        updates,
      );
    },
    onSuccess: (updatedAsset) => {
      setMediaAssets((prev) =>
        prev.map((asset) =>
          asset.id === updatedAsset.id ? updatedAsset : asset,
        ),
      );
      refetchMedia();
      toast({
        title: "Success",
        description: "Media updated successfully",
      });
    },
    onError: (error: any) => {
      console.error("Media update error:", error);

      let title = "Update Failed";
      let description = "Failed to update media properties";

      if (error?.response?.status === 404) {
        title = "Media Not Found";
        description =
          "The media file you're trying to update no longer exists.";
      } else if (error?.response?.status === 403) {
        title = "Permission Denied";
        description = "You don't have permission to update this media file.";
      } else if (error?.response?.status >= 500) {
        title = "Server Error";
        description = "The server encountered an error. Please try again.";
      } else if (error?.message) {
        description = error.message;
      }

      toast({
        title,
        description,
        variant: "destructive",
      });
    },
  });

  // Media delete mutation
  const deleteMediaMutation = useMutation({
    mutationFn: async (mediaId: number) => {
      return apiRequest(
        "DELETE",
        `/api/products/${productId}/media/${mediaId}`,
      );
    },
    onSuccess: (_, mediaId) => {
      setMediaAssets((prev) => prev.filter((asset) => asset.id !== mediaId));
      refetchMedia();
      toast({
        title: "Success",
        description: "Media deleted successfully",
      });
    },
    onError: (error: any) => {
      console.error("Media delete error:", error);

      let title = "Delete Failed";
      let description = "Failed to delete media file";

      if (error?.response?.status === 404) {
        title = "Media Not Found";
        description =
          "The media file you're trying to delete no longer exists.";
      } else if (error?.response?.status === 403) {
        title = "Permission Denied";
        description = "You don't have permission to delete this media file.";
      } else if (error?.response?.status === 409) {
        title = "File In Use";
        description =
          "This media file is currently being used and cannot be deleted.";
      } else if (error?.response?.status >= 500) {
        title = "Server Error";
        description =
          "The server encountered an error while deleting the file. Please try again.";
      } else if (error?.message) {
        description = error.message;
      }

      toast({
        title,
        description,
        variant: "destructive",
      });
    },
  });

  // Media handling functions
  const handleFileUpload = (files: FileList) => {
    if (!files || files.length === 0) return;

    const supportedTypes = {
      image: [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/bmp",
        "image/tiff",
      ],
      video: ["video/mp4", "video/mpeg", "video/quicktime", "video/webm"],
      document: ["application/pdf"],
    };

    const allSupportedTypes = [
      ...supportedTypes.image,
      ...supportedTypes.video,
      ...supportedTypes.document,
    ];

    // Validate file types and sizes with detailed feedback
    const validFiles: File[] = [];
    let errorCount = 0;

    Array.from(files).forEach((file) => {
      // Check file type
      if (!allSupportedTypes.includes(file.type)) {
        errorCount++;
        const suggestedTypes =
          file.name.toLowerCase().includes("image") ||
          file.name.match(/\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i)
            ? supportedTypes.image.join(", ")
            : "JPEG, PNG, GIF, WebP, MP4, WebM, PDF";

        toast({
          title: "Unsupported File Type",
          description: `"${file.name}" (${file.type}) is not supported. Please use: ${suggestedTypes}`,
          variant: "destructive",
        });
        return;
      }

      // Check file size with contextual limits
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB for video, 10MB for others
      const maxSizeLabel = isVideo ? "50MB" : "10MB";

      if (file.size > maxSize) {
        errorCount++;
        toast({
          title: "File Too Large",
          description: `"${file.name}" (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds ${maxSizeLabel} limit for ${isImage ? "images" : isVideo ? "videos" : "documents"}`,
          variant: "destructive",
        });
        return;
      }

      // Check for empty files
      if (file.size === 0) {
        errorCount++;
        toast({
          title: "Empty File",
          description: `"${file.name}" appears to be empty (0 bytes)`,
          variant: "destructive",
        });
        return;
      }

      validFiles.push(file);
    });

    // Provide summary feedback
    if (errorCount > 0 && validFiles.length === 0) {
      toast({
        title: "Upload Failed",
        description: `${errorCount} file(s) failed validation. Please fix the issues and try again.`,
        variant: "destructive",
      });
      return;
    }

    if (errorCount > 0 && validFiles.length > 0) {
      toast({
        title: "Partial Upload",
        description: `${validFiles.length} file(s) will be uploaded. ${errorCount} file(s) were skipped due to errors.`,
        variant: "default",
      });
    }

    if (validFiles.length > 0) {
      const fileList = validFiles.reduce((dt, file) => {
        dt.items.add(file);
        return dt;
      }, new DataTransfer()).files;

      uploadMediaMutation.mutate(fileList);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files) {
      handleFileUpload(files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFileUpload(files);
    }
  };

  const handleDeleteMedia = (mediaId: number) => {
    deleteMediaMutation.mutate(mediaId);
  };

  const handleUpdateMedia = (mediaId: number, updates: any) => {
    updateMediaMutation.mutate({ mediaId, updates });
  };

  const openEditDialog = (asset: any) => {
    setEditingMedia(asset);
    setEditForm({
      assetType: asset.assetType || "product",
      altText: asset.altText || "",
    });
  };

  const closeEditDialog = () => {
    setEditingMedia(null);
    setEditForm({ assetType: "", altText: "" });
  };

  const saveMediaChanges = () => {
    if (editingMedia && editForm) {
      handleUpdateMedia(editingMedia.id, {
        assetType: editForm.assetType,
        altText: editForm.altText,
      });
      closeEditDialog();
    }
  };

  const getAssetTypeIcon = (assetType: string, mimeType?: string) => {
    if (mimeType?.startsWith("video/")) {
      return <Video className="h-4 w-4" />;
    }
    if (mimeType?.startsWith("image/")) {
      return <FileImage className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // SEO Helper Functions for Phase 3.4 Enhancement
  const calculateSeoScore = (formData: any) => {
    let score = 0;

    // Meta title (20 points)
    if (formData.metaTitle) {
      score += 15;
      if (formData.metaTitle.length >= 30 && formData.metaTitle.length <= 60) {
        score += 5; // Bonus for optimal length
      }
    }

    // Meta description (20 points)
    if (formData.metaDescription) {
      score += 15;
      if (
        formData.metaDescription.length >= 120 &&
        formData.metaDescription.length <= 160
      ) {
        score += 5; // Bonus for optimal length
      }
    }

    // Product name/title optimization (15 points)
    if (formData.name && formData.name.length >= 10) {
      score += 15;
    }

    // Focus keywords (15 points)
    if (formData.focusKeywords && formData.focusKeywords.length > 0) {
      score += 15;
    }

    // Open Graph tags (15 points)
    if (formData.ogTitle && formData.ogDescription) {
      score += 15;
    }

    // Canonical URL (10 points)
    if (formData.canonicalUrl) {
      score += 10;
    }

    // Product description richness (5 points)
    if (formData.longDescription && formData.longDescription.length > 100) {
      score += 5;
    }

    return Math.min(100, score);
  };

  const getSeoRecommendations = (formData: any, score: number) => {
    const recommendations = [];

    if (!formData.metaTitle) {
      recommendations.push({
        type: "error",
        message: "Add a meta title to improve search visibility",
        priority: "high",
      });
    } else if (formData.metaTitle.length < 30) {
      recommendations.push({
        type: "warning",
        message: "Meta title is too short - aim for 30-60 characters",
        priority: "medium",
      });
    } else if (formData.metaTitle.length > 60) {
      recommendations.push({
        type: "warning",
        message: "Meta title is too long - may be truncated in search results",
        priority: "medium",
      });
    }

    if (!formData.metaDescription) {
      recommendations.push({
        type: "error",
        message: "Add a meta description to improve click-through rates",
        priority: "high",
      });
    } else if (formData.metaDescription.length < 120) {
      recommendations.push({
        type: "warning",
        message: "Meta description is too short - aim for 120-160 characters",
        priority: "medium",
      });
    } else if (formData.metaDescription.length > 160) {
      recommendations.push({
        type: "warning",
        message: "Meta description is too long - may be truncated",
        priority: "medium",
      });
    }

    if (!formData.focusKeywords) {
      recommendations.push({
        type: "info",
        message: "Add focus keywords to target specific search terms",
        priority: "low",
      });
    }

    if (!formData.ogTitle || !formData.ogDescription) {
      recommendations.push({
        type: "info",
        message: "Add Open Graph tags for better social media sharing",
        priority: "low",
      });
    }

    if (!formData.canonicalUrl && formData.slug) {
      recommendations.push({
        type: "info",
        message: `Consider setting canonical URL to avoid duplicate content`,
        priority: "low",
      });
    }

    return recommendations;
  };

  const generatePreviewData = (formData: any) => {
    const baseUrl = window.location.origin;

    return {
      google: {
        title: formData.metaTitle || formData.name || "Untitled Product",
        description:
          formData.metaDescription ||
          formData.shortDescription ||
          "No description available",
        url: `${baseUrl}/products/${formData.slug || "product-slug"}`,
        displayUrl: `${window.location.hostname}/products/${formData.slug || "product-slug"}`,
      },
      social: {
        title:
          formData.ogTitle ||
          formData.metaTitle ||
          formData.name ||
          "Untitled Product",
        description:
          formData.ogDescription ||
          formData.metaDescription ||
          formData.shortDescription ||
          "No description available",
        image: formData.ogImage || "/placeholder-og-image.jpg",
      },
    };
  };

  const onSubmit = (data: ProductEditForm) => {
    console.log("Form submitted with data:", data);

    // Prepare data for API - server handles conversion to cents
    const submitData = {
      name: data.name.trim(),
      slug: data.slug.trim(),
      shortDescription: data.shortDescription?.trim() || null,
      longDescription: data.longDescription?.trim() || null,
      story: data.story?.trim() || null,
      brandId: data.brandId,
      sku: data.sku?.trim() || null,
      status: data.status,
      isVariant: data.isVariant,
      // Send prices as strings - server will convert to cents
      price: data.price?.trim() || null,
      compareAtPrice: data.compareAtPrice?.trim() || null,
      stock: data.stock || null,
      lowStockThreshold: data.lowStockThreshold || null,
      // SEO fields
      metaTitle: data.metaTitle?.trim() || null,
      metaDescription: data.metaDescription?.trim() || null,
      canonicalUrl: data.canonicalUrl?.trim() || null,
      ogTitle: data.ogTitle?.trim() || null,
      ogDescription: data.ogDescription?.trim() || null,
      ogImage: data.ogImage?.trim() || null,
      focusKeywords: data.focusKeywords?.trim() || null,
    };

    console.log("Submitting to API:", submitData);
    updateProductMutation.mutate(submitData);
  };

  if (isLoading || !isAuthenticated) {
    return null;
  }

  if (productLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navigation />
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-64 mb-4"></div>
              <div className="h-96 bg-muted rounded"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navigation />
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 p-6">
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
              <p className="text-muted-foreground mb-6">
                The product you're looking for doesn't exist or you don't have
                access to it.
              </p>
              <Button onClick={() => navigate("/products")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Products
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <div className="flex min-h-screen">
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Enhanced Header */}
            <div className="bg-card border rounded-lg p-6 mb-6">
              {/* Breadcrumbs */}
              <div className="flex items-center text-sm text-muted-foreground mb-4">
                <span>Products</span>
                <ChevronRight className="mx-2 h-4 w-4" />
                <span>{product?.name || "Loading..."}</span>
                <ChevronRight className="mx-2 h-4 w-4" />
                <span className="text-foreground">Edit</span>
              </div>

              {/* Product Identity */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">
                      {product?.name || "Product"}
                    </h1>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-sm text-muted-foreground">
                        SKU: {product?.sku || "Not set"}
                      </span>
                      <Badge
                        variant={
                          product?.status === "live"
                            ? "default"
                            : product?.status === "review"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {product?.status || "draft"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/products")}
                    className="flex items-center"
                    data-testid="button-back-to-products"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Products
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex items-center"
                    data-testid="button-preview-product"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </Button>
                  <Button
                    type="submit"
                    form="product-edit-form"
                    className="flex items-center gradient-primary text-white hover:opacity-90"
                    disabled={updateProductMutation.isPending}
                    data-testid="button-save-product"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {updateProductMutation.isPending
                      ? "Saving..."
                      : "Save Changes"}
                  </Button>
                </div>
              </div>

              {/* Completion Progress */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">
                    Product Information Completeness
                  </span>
                  <span className="font-medium">{completionProgress}%</span>
                </div>
                <Progress value={completionProgress} className="h-2" />
              </div>
            </div>

            {/* Edit Form */}
            <form
              id="product-edit-form"
              onSubmit={form.handleSubmit(onSubmit, (errors) => {
                console.log("Form validation errors:", errors);
                toast({
                  title: "Validation Error",
                  description: "Please check the form for errors",
                  variant: "destructive",
                });
              })}
              className="space-y-6"
            >
              {/* Tabbed PIM Interface */}
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-7 mb-6">
                  <TabsTrigger
                    value="general"
                    className="flex items-center space-x-2"
                    data-testid="tab-general"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">General</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="attributes"
                    className="flex items-center space-x-2"
                    data-testid="tab-attributes"
                  >
                    <Layers className="h-4 w-4" />
                    <span className="hidden sm:inline">Attributes</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="variants"
                    className="flex items-center space-x-2"
                    data-testid="tab-variants"
                  >
                    <Package className="h-4 w-4" />
                    <span className="hidden sm:inline">Variants</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="frames"
                    className="flex items-center space-x-2"
                    data-testid="tab-frames"
                  >
                    <Image className="h-4 w-4" />
                    <span className="hidden sm:inline">frames</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="geo"
                    className="flex items-center space-x-2"
                    data-testid="tab-geo"
                  >
                    <Brain className="h-4 w-4" />
                    <span className="hidden sm:inline">GEO</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="channels"
                    className="flex items-center space-x-2"
                    data-testid="tab-channels"
                  >
                    <Globe className="h-4 w-4" />
                    <span className="hidden sm:inline">Channels</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="history"
                    className="flex items-center space-x-2"
                    data-testid="tab-history"
                  >
                    <History className="h-4 w-4" />
                    <span className="hidden sm:inline">History</span>
                  </TabsTrigger>
                </TabsList>

                {/* General Tab */}
                <TabsContent value="general" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                      {/* Basic Information */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Basic Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label htmlFor="name">
                              Product Name *{" "}
                              <span className="text-xs text-muted-foreground">
                                (max 255 chars)
                              </span>
                            </Label>
                            <Input
                              id="name"
                              {...form.register("name")}
                              onChange={(e) => {
                                form.setValue("name", e.target.value, {
                                  shouldValidate: true,
                                });
                                // Auto-generate slug only if slug is empty or matches generated pattern
                                const currentSlug = form.watch("slug");
                                if (
                                  !currentSlug ||
                                  currentSlug ===
                                    generateSlug(form.watch("name") || "")
                                ) {
                                  form.setValue(
                                    "slug",
                                    generateSlug(e.target.value),
                                    { shouldValidate: true },
                                  );
                                }
                              }}
                              placeholder="Enter product name"
                              className={
                                form.formState.errors.name
                                  ? "border-destructive"
                                  : ""
                              }
                              data-testid="input-product-name"
                            />
                            <div className="flex justify-between mt-1">
                              <div>
                                {form.formState.errors.name && (
                                  <p className="text-sm text-destructive">
                                    {form.formState.errors.name.message}
                                  </p>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {form.watch("name")?.length || 0}/255
                              </span>
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="slug">
                              URL Slug *{" "}
                              <span className="text-xs text-muted-foreground">
                                (lowercase, numbers, hyphens only)
                              </span>
                            </Label>
                            <Input
                              id="slug"
                              {...form.register("slug")}
                              onChange={(e) => {
                                const cleanSlug = e.target.value
                                  .toLowerCase()
                                  .replace(/[^a-z0-9-]/g, "");
                                form.setValue("slug", cleanSlug, {
                                  shouldValidate: true,
                                });
                              }}
                              placeholder="product-url-slug"
                              className={
                                form.formState.errors.slug
                                  ? "border-destructive"
                                  : ""
                              }
                              data-testid="input-product-slug"
                            />
                            <div className="flex justify-between mt-1">
                              <div>
                                {form.formState.errors.slug && (
                                  <p className="text-sm text-destructive">
                                    {form.formState.errors.slug.message}
                                  </p>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {form.watch("slug")?.length || 0}/255
                              </span>
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="sku">
                              SKU{" "}
                              <span className="text-xs text-muted-foreground">
                                (optional, max 100 chars)
                              </span>
                            </Label>
                            <Input
                              id="sku"
                              {...form.register("sku")}
                              onChange={(e) => {
                                form.setValue("sku", e.target.value, {
                                  shouldValidate: true,
                                });
                              }}
                              placeholder="Product SKU"
                              data-testid="input-product-sku"
                            />
                            <div className="flex justify-between mt-1">
                              <div className="min-h-[1rem]">
                                {" "}
                                {/* Reserve space for errors */}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {form.watch("sku")?.length || 0}/100
                              </span>
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="shortDescription">
                              Short Description{" "}
                              <span className="text-xs text-muted-foreground">
                                (max 1000 chars)
                              </span>
                            </Label>
                            <Textarea
                              id="shortDescription"
                              {...form.register("shortDescription")}
                              onChange={(e) => {
                                form.setValue(
                                  "shortDescription",
                                  e.target.value,
                                  { shouldValidate: true },
                                );
                              }}
                              placeholder="Brief product description for listings and previews"
                              rows={3}
                              className={
                                form.formState.errors.shortDescription
                                  ? "border-destructive"
                                  : ""
                              }
                              data-testid="textarea-short-description"
                            />
                            <div className="flex justify-between mt-1">
                              <div>
                                {form.formState.errors.shortDescription && (
                                  <p className="text-sm text-destructive">
                                    {
                                      form.formState.errors.shortDescription
                                        .message
                                    }
                                  </p>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {form.watch("shortDescription")?.length || 0}
                                /1000
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Detailed Content */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Detailed Content</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label htmlFor="longDescription">
                              Long Description
                            </Label>
                            <Textarea
                              id="longDescription"
                              {...form.register("longDescription")}
                              placeholder="Detailed product description with features and benefits"
                              rows={6}
                              data-testid="textarea-long-description"
                            />
                          </div>

                          <div>
                            <Label htmlFor="story">Product Story</Label>
                            <Textarea
                              id="story"
                              {...form.register("story")}
                              placeholder="Tell the story behind this product - inspiration, craftsmanship, heritage"
                              rows={6}
                              data-testid="textarea-product-story"
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Pricing Information */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Pricing</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="price">Price ($)</Label>
                              <Input
                                id="price"
                                {...form.register("price")}
                                type="number"
                                step="0.01"
                                min="0"
                                onChange={(e) => {
                                  form.setValue(
                                    "price",
                                    formatPrice(e.target.value),
                                    { shouldValidate: true },
                                  );
                                }}
                                placeholder="29.99"
                                className={
                                  form.formState.errors.price
                                    ? "border-destructive"
                                    : ""
                                }
                                data-testid="input-price"
                              />
                              {form.formState.errors.price && (
                                <p className="text-sm text-destructive mt-1">
                                  {form.formState.errors.price.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="compareAtPrice">
                                Compare At Price ($)
                              </Label>
                              <Input
                                id="compareAtPrice"
                                {...form.register("compareAtPrice")}
                                type="number"
                                step="0.01"
                                min="0"
                                onChange={(e) => {
                                  form.setValue(
                                    "compareAtPrice",
                                    formatPrice(e.target.value),
                                    { shouldValidate: true },
                                  );
                                }}
                                placeholder="39.99"
                                className={
                                  form.formState.errors.compareAtPrice
                                    ? "border-destructive"
                                    : ""
                                }
                                data-testid="input-compare-at-price"
                              />
                              {form.formState.errors.compareAtPrice && (
                                <p className="text-sm text-destructive mt-1">
                                  {form.formState.errors.compareAtPrice.message}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Inventory Management */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                            <div>
                              <Label htmlFor="stock">Stock Quantity</Label>
                              <Input
                                id="stock"
                                {...form.register("stock", {
                                  valueAsNumber: true,
                                })}
                                type="number"
                                min="0"
                                placeholder="100"
                                data-testid="input-stock"
                              />
                            </div>
                            <div>
                              <Label htmlFor="lowStockThreshold">
                                Low Stock Alert
                              </Label>
                              <Input
                                id="lowStockThreshold"
                                {...form.register("lowStockThreshold", {
                                  valueAsNumber: true,
                                })}
                                type="number"
                                min="0"
                                placeholder="10"
                                data-testid="input-low-stock-threshold"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                      {/* Publication Settings */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Publication</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label htmlFor="status">Status</Label>
                            <Select
                              value={form.watch("status")}
                              onValueChange={(value) =>
                                form.setValue("status", value as any, {
                                  shouldValidate: true,
                                })
                              }
                            >
                              <SelectTrigger
                                data-testid="select-product-status"
                                className={
                                  form.formState.errors.status
                                    ? "border-destructive"
                                    : ""
                                }
                              >
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="review">Review</SelectItem>
                                <SelectItem value="live">Live</SelectItem>
                                <SelectItem value="archived">
                                  Archived
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            {form.formState.errors.status && (
                              <p className="text-sm text-destructive mt-1">
                                {form.formState.errors.status.message}
                              </p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="brandId">Brand *</Label>
                            <Select
                              value={form.watch("brandId")?.toString() || ""}
                              onValueChange={(value) =>
                                form.setValue("brandId", parseInt(value), {
                                  shouldValidate: true,
                                })
                              }
                            >
                              <SelectTrigger
                                data-testid="select-product-brand"
                                className={
                                  form.formState.errors.brandId
                                    ? "border-destructive"
                                    : ""
                                }
                              >
                                <SelectValue
                                  placeholder={
                                    brands
                                      ? "Select brand"
                                      : "Loading brands..."
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {brands && brands.length > 0 ? (
                                  (brands as any[]).map((brand: any) => (
                                    <SelectItem
                                      key={brand.id}
                                      value={brand.id.toString()}
                                    >
                                      {brand.name}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="" disabled>
                                    No brands available
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            {form.formState.errors.brandId && (
                              <p className="text-sm text-destructive mt-1">
                                {form.formState.errors.brandId.message}
                              </p>
                            )}
                            {!brands && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Loading brands...
                              </p>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              id="isVariant"
                              checked={form.watch("isVariant")}
                              onCheckedChange={(checked) =>
                                form.setValue("isVariant", checked)
                              }
                              data-testid="switch-is-variant"
                            />
                            <Label htmlFor="isVariant">Product Variant</Label>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Save Actions */}
                      <Card>
                        <CardContent className="pt-6">
                          <div className="space-y-3">
                            <Button
                              type="submit"
                              className="w-full gradient-primary text-white hover:opacity-90"
                              disabled={
                                updateProductMutation.isPending ||
                                !form.formState.isValid
                              }
                              data-testid="button-save-product"
                            >
                              <Save className="mr-2 h-4 w-4" />
                              {updateProductMutation.isPending
                                ? "Saving..."
                                : "Save Changes"}
                            </Button>

                            {hasUnsavedChanges && (
                              <p className="text-xs text-amber-600 text-center">
                                You have unsaved changes
                              </p>
                            )}

                            <Button
                              type="button"
                              variant="outline"
                              className="w-full"
                              onClick={() => navigate("/products")}
                              disabled={updateProductMutation.isPending}
                              data-testid="button-cancel-edit"
                            >
                              Cancel
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Product Info */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Product Info</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-muted-foreground">
                          <div>
                            <strong>Created:</strong>{" "}
                            {new Date(product.createdAt).toLocaleDateString()}
                          </div>
                          <div>
                            <strong>Updated:</strong>{" "}
                            {new Date(product.updatedAt).toLocaleDateString()}
                          </div>
                          <div>
                            <strong>ID:</strong> {product.id}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                {/* Attributes Tab */}
                <TabsContent value="attributes" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Product Specifications</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="weight">Weight</Label>
                          <Input
                            id="weight"
                            {...form.register("weight")}
                            placeholder="e.g. 250g"
                            data-testid="input-weight"
                          />
                        </div>
                        <div>
                          <Label htmlFor="dimensions">Dimensions</Label>
                          <Input
                            id="dimensions"
                            {...form.register("dimensions")}
                            placeholder="e.g. 40mm x 12mm"
                            data-testid="input-dimensions"
                          />
                        </div>
                        <div>
                          <Label htmlFor="material">Material</Label>
                          <Input
                            id="material"
                            {...form.register("material")}
                            placeholder="e.g. Stainless Steel"
                            data-testid="input-material"
                          />
                        </div>
                        <div>
                          <Label htmlFor="color">Color</Label>
                          <Input
                            id="color"
                            {...form.register("color")}
                            placeholder="e.g. Black"
                            data-testid="input-color"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Variants Tab */}
                <TabsContent value="variants" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Product Variants</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-4" />
                        <p>Variant management coming soon</p>
                        <p className="text-sm">
                          Manage color, size, and other product variations
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Frames Tab */}
                <TabsContent value="frames" className="space-y-6">
                  {/* Upload Zone */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Upload frames
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                          isDragOver
                            ? "border-primary bg-primary/5"
                            : "border-muted-foreground/25 hover:border-muted-foreground/50"
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-lg font-medium mb-2">
                          Drag and drop files here
                        </p>
                        <p className="text-sm text-muted-foreground mb-4">
                          Support for images, videos, and documents up to 10MB
                          each
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            document.getElementById("media-upload")?.click()
                          }
                          disabled={uploadMediaMutation.isPending}
                        >
                          {uploadMediaMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 h-4 w-4" />
                              Choose Files
                            </>
                          )}
                        </Button>
                        <input
                          id="media-upload"
                          type="file"
                          multiple
                          accept="image/*,video/*,.pdf"
                          onChange={handleFileInput}
                          className="hidden"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Media Gallery */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileImage className="h-5 w-5" />
                          frame Assets
                        </div>
                        <Badge variant="secondary">
                          {mediaAssets.length}{" "}
                          {mediaAssets.length === 1 ? "file" : "files"}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {mediaAssets.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileImage className="h-12 w-12 mx-auto mb-4" />
                          <p>No frames uploaded yet</p>
                          <p className="text-sm">
                            Upload some images, videos, or documents to get
                            started
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {mediaAssets.map((asset) => (
                            <div
                              key={asset.id}
                              className="relative group border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                            >
                              {/* Media Preview */}
                              <div className="aspect-square bg-muted flex items-center justify-center">
                                {asset.mimeType?.startsWith("image/") ? (
                                  <img
                                    src={asset.url}
                                    alt={asset.altText || asset.originalName}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target =
                                        e.target as HTMLImageElement;
                                      target.src =
                                        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZjNmNGY2Ii8+CjxwYXRoIGQ9Im04IDVhMyAzIDAgMCAwLTMgM3Y4YTMgMyAwIDAgMCAzIDNoOGEzIDMgMCAwIDAgMy0zVjhhMyAzIDAgMCAwLTMtM0g4em0tMSAzYTEgMSAwIDAgMSAxLTFoOGExIDEgMCAwIDEgMSAxdjguOTdMMTUuNjEgMTMuNGEyIDIgMCAwIDAtMi44MyAwTDkuNDEgMTcgNyA5djBaTTkgMTBhMSAxIDAgMSAxLTIgMCAxIDEgMCAwIDEgMiAwWiIgZmlsbD0iIzljYTNhZiIvPgo8L3N2Zz4K";
                                    }}
                                  />
                                ) : (
                                  <div className="flex flex-col items-center justify-center p-4">
                                    {getAssetTypeIcon(
                                      asset.assetType,
                                      asset.mimeType,
                                    )}
                                    <p className="text-xs text-center mt-2 truncate w-full">
                                      {asset.originalName}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Media Info */}
                              <div className="p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <Badge
                                    variant={
                                      asset.assetType === "hero"
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {asset.assetType}
                                  </Badge>
                                  <div className="flex gap-1">
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => openEditDialog(asset)}
                                        >
                                          <Edit2 className="h-3 w-3" />
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>Edit Media</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <div>
                                            <Label htmlFor="assetType">
                                              Asset Type
                                            </Label>
                                            <Select
                                              value={editForm.assetType}
                                              onValueChange={(value) => {
                                                setEditForm((prev) => ({
                                                  ...prev,
                                                  assetType: value,
                                                }));
                                              }}
                                            >
                                              <SelectTrigger>
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="hero">
                                                  Hero
                                                </SelectItem>
                                                <SelectItem value="product">
                                                  Product
                                                </SelectItem>
                                                <SelectItem value="lifestyle">
                                                  Lifestyle
                                                </SelectItem>
                                                <SelectItem value="brand">
                                                  Brand
                                                </SelectItem>
                                                <SelectItem value="video">
                                                  Video
                                                </SelectItem>
                                                <SelectItem value="document">
                                                  Document
                                                </SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          {asset.mimeType?.startsWith(
                                            "image/",
                                          ) && (
                                            <div>
                                              <Label htmlFor="altText">
                                                Alt Text
                                              </Label>
                                              <Input
                                                id="altText"
                                                value={editForm.altText}
                                                onChange={(e) => {
                                                  setEditForm((prev) => ({
                                                    ...prev,
                                                    altText: e.target.value,
                                                  }));
                                                }}
                                                placeholder="Describe this image for accessibility"
                                              />
                                            </div>
                                          )}
                                          <div className="grid grid-cols-2 gap-4">
                                            <div>
                                              <Label>File Size</Label>
                                              <p className="text-sm text-muted-foreground">
                                                {formatFileSize(asset.fileSize)}
                                              </p>
                                            </div>
                                            <div>
                                              <Label>Type</Label>
                                              <p className="text-sm text-muted-foreground">
                                                {asset.mimeType}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                        <DialogFooter>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            onClick={closeEditDialog}
                                          >
                                            Cancel
                                          </Button>
                                          <Button
                                            type="button"
                                            onClick={saveMediaChanges}
                                            disabled={
                                              updateMediaMutation.isPending
                                            }
                                          >
                                            {updateMediaMutation.isPending ? (
                                              <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Saving...
                                              </>
                                            ) : (
                                              <>
                                                <Save className="mr-2 h-4 w-4" />
                                                Save Changes
                                              </>
                                            )}
                                          </Button>
                                        </DialogFooter>
                                      </DialogContent>
                                    </Dialog>

                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-destructive hover:text-destructive"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>
                                            Delete Media
                                          </AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete "
                                            {asset.originalName}"? This action
                                            cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>
                                            Cancel
                                          </AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() =>
                                              handleDeleteMedia(asset.id)
                                            }
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          >
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {asset.originalName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(asset.fileSize)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* GEO Tab - Phase 3.4 Enhanced Implementation */}
                <TabsContent value="geo" className="space-y-6">
                  {(() => {
                    const watchedValues = form.watch();
                    const seoScore = calculateSeoScore(watchedValues);
                    const recommendations = getSeoRecommendations(
                      watchedValues,
                      seoScore,
                    );
                    const previewData = generatePreviewData(watchedValues);

                    return (
                      <>
                        {/* SEO Score Overview */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Brain className="h-5 w-5" />
                                GEO Optimization
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                  Score:
                                </span>
                                <Badge
                                  variant={
                                    seoScore >= 80
                                      ? "default"
                                      : seoScore >= 60
                                        ? "secondary"
                                        : "outline"
                                  }
                                  className={
                                    seoScore >= 80
                                      ? "bg-green-100 text-green-800"
                                      : seoScore >= 60
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-red-100 text-red-800"
                                  }
                                >
                                  {seoScore}/100
                                </Badge>
                              </div>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <Progress value={seoScore} className="h-3" />
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div className="text-center">
                                  <div className="font-medium text-muted-foreground">
                                    Meta Tags
                                  </div>
                                  <div
                                    className={
                                      watchedValues.metaTitle &&
                                      watchedValues.metaDescription
                                        ? "text-green-600"
                                        : "text-red-600"
                                    }
                                  >
                                    {watchedValues.metaTitle &&
                                    watchedValues.metaDescription
                                      ? "✓ Complete"
                                      : "✗ Incomplete"}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium text-muted-foreground">
                                    Keywords
                                  </div>
                                  <div
                                    className={
                                      watchedValues.focusKeywords
                                        ? "text-green-600"
                                        : "text-yellow-600"
                                    }
                                  >
                                    {watchedValues.focusKeywords
                                      ? "✓ Set"
                                      : "⚠ Missing"}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium text-muted-foreground">
                                    Social Tags
                                  </div>
                                  <div
                                    className={
                                      watchedValues.ogTitle &&
                                      watchedValues.ogDescription
                                        ? "text-green-600"
                                        : "text-yellow-600"
                                    }
                                  >
                                    {watchedValues.ogTitle &&
                                    watchedValues.ogDescription
                                      ? "✓ Complete"
                                      : "⚠ Incomplete"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Left Column - SEO Fields */}
                          <div className="space-y-6">
                            {/* Basic SEO Fields */}
                            <Card>
                              <CardHeader>
                                <CardTitle>Basic GEO</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div>
                                  <div className="flex justify-between items-center mb-1">
                                    <Label htmlFor="metaTitle">
                                      Meta Title *
                                    </Label>
                                    <span
                                      className={`text-xs ${
                                        (watchedValues.metaTitle?.length || 0) >
                                        60
                                          ? "text-red-600"
                                          : (watchedValues.metaTitle?.length ||
                                                0) >= 30
                                            ? "text-green-600"
                                            : "text-yellow-600"
                                      }`}
                                    >
                                      {watchedValues.metaTitle?.length || 0}/60
                                    </span>
                                  </div>
                                  <Input
                                    id="metaTitle"
                                    {...form.register("metaTitle")}
                                    onChange={(e) => {
                                      form.setValue(
                                        "metaTitle",
                                        e.target.value,
                                        {
                                          shouldValidate: true,
                                        },
                                      );
                                    }}
                                    placeholder="Compelling title for search results"
                                    className={
                                      form.formState.errors.metaTitle
                                        ? "border-destructive"
                                        : ""
                                    }
                                    data-testid="input-meta-title"
                                  />
                                  <div className="flex justify-between mt-1">
                                    <div>
                                      {form.formState.errors.metaTitle && (
                                        <p className="text-sm text-destructive">
                                          {
                                            form.formState.errors.metaTitle
                                              .message
                                          }
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <div className="flex justify-between items-center mb-1">
                                    <Label htmlFor="metaDescription">
                                      Meta Description *
                                    </Label>
                                    <span
                                      className={`text-xs ${
                                        (watchedValues.metaDescription
                                          ?.length || 0) > 160
                                          ? "text-red-600"
                                          : (watchedValues.metaDescription
                                                ?.length || 0) >= 120
                                            ? "text-green-600"
                                            : "text-yellow-600"
                                      }`}
                                    >
                                      {watchedValues.metaDescription?.length ||
                                        0}
                                      /160
                                    </span>
                                  </div>
                                  <Textarea
                                    id="metaDescription"
                                    {...form.register("metaDescription")}
                                    onChange={(e) => {
                                      form.setValue(
                                        "metaDescription",
                                        e.target.value,
                                        {
                                          shouldValidate: true,
                                        },
                                      );
                                    }}
                                    placeholder="Compelling description that appears in search results"
                                    rows={3}
                                    className={
                                      form.formState.errors.metaDescription
                                        ? "border-destructive"
                                        : ""
                                    }
                                    data-testid="textarea-meta-description"
                                  />
                                  {form.formState.errors.metaDescription && (
                                    <p className="text-sm text-destructive mt-1">
                                      {
                                        form.formState.errors.metaDescription
                                          .message
                                      }
                                    </p>
                                  )}
                                </div>

                                <div>
                                  <Label htmlFor="focusKeywords">
                                    Focus Keywords
                                  </Label>
                                  <Input
                                    id="focusKeywords"
                                    {...form.register("focusKeywords")}
                                    onChange={(e) => {
                                      form.setValue(
                                        "focusKeywords",
                                        e.target.value,
                                        {
                                          shouldValidate: true,
                                        },
                                      );
                                    }}
                                    placeholder="primary keyword, secondary keyword"
                                    data-testid="input-focus-keywords"
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Comma-separated keywords to target in search
                                  </p>
                                </div>

                                <div>
                                  <Label htmlFor="canonicalUrl">
                                    Canonical URL
                                  </Label>
                                  <Input
                                    id="canonicalUrl"
                                    {...form.register("canonicalUrl")}
                                    onChange={(e) => {
                                      form.setValue(
                                        "canonicalUrl",
                                        e.target.value,
                                        {
                                          shouldValidate: true,
                                        },
                                      );
                                    }}
                                    placeholder="https://example.com/products/product-slug"
                                    className={
                                      form.formState.errors.canonicalUrl
                                        ? "border-destructive"
                                        : ""
                                    }
                                    data-testid="input-canonical-url"
                                  />
                                  {form.formState.errors.canonicalUrl && (
                                    <p className="text-sm text-destructive mt-1">
                                      {
                                        form.formState.errors.canonicalUrl
                                          .message
                                      }
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Prevents duplicate content issues
                                  </p>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Open Graph Tags */}
                            <Card>
                              <CardHeader>
                                <CardTitle>Social Media (Open Graph)</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div>
                                  <div className="flex justify-between items-center mb-1">
                                    <Label htmlFor="ogTitle">
                                      Open Graph Title
                                    </Label>
                                    <span className="text-xs text-muted-foreground">
                                      {watchedValues.ogTitle?.length || 0}/60
                                    </span>
                                  </div>
                                  <Input
                                    id="ogTitle"
                                    {...form.register("ogTitle")}
                                    onChange={(e) => {
                                      form.setValue("ogTitle", e.target.value, {
                                        shouldValidate: true,
                                      });
                                    }}
                                    placeholder="Title for social media sharing"
                                    className={
                                      form.formState.errors.ogTitle
                                        ? "border-destructive"
                                        : ""
                                    }
                                    data-testid="input-og-title"
                                  />
                                  {form.formState.errors.ogTitle && (
                                    <p className="text-sm text-destructive mt-1">
                                      {form.formState.errors.ogTitle.message}
                                    </p>
                                  )}
                                </div>

                                <div>
                                  <div className="flex justify-between items-center mb-1">
                                    <Label htmlFor="ogDescription">
                                      Open Graph Description
                                    </Label>
                                    <span className="text-xs text-muted-foreground">
                                      {watchedValues.ogDescription?.length || 0}
                                      /160
                                    </span>
                                  </div>
                                  <Textarea
                                    id="ogDescription"
                                    {...form.register("ogDescription")}
                                    onChange={(e) => {
                                      form.setValue(
                                        "ogDescription",
                                        e.target.value,
                                        {
                                          shouldValidate: true,
                                        },
                                      );
                                    }}
                                    placeholder="Description for social media sharing"
                                    rows={3}
                                    className={
                                      form.formState.errors.ogDescription
                                        ? "border-destructive"
                                        : ""
                                    }
                                    data-testid="textarea-og-description"
                                  />
                                  {form.formState.errors.ogDescription && (
                                    <p className="text-sm text-destructive mt-1">
                                      {
                                        form.formState.errors.ogDescription
                                          .message
                                      }
                                    </p>
                                  )}
                                </div>

                                <div>
                                  <Label htmlFor="ogImage">
                                    Open Graph Image URL
                                  </Label>
                                  <Input
                                    id="ogImage"
                                    {...form.register("ogImage")}
                                    onChange={(e) => {
                                      form.setValue("ogImage", e.target.value, {
                                        shouldValidate: true,
                                      });
                                    }}
                                    placeholder="https://example.com/image.jpg"
                                    className={
                                      form.formState.errors.ogImage
                                        ? "border-destructive"
                                        : ""
                                    }
                                    data-testid="input-og-image"
                                  />
                                  {form.formState.errors.ogImage && (
                                    <p className="text-sm text-destructive mt-1">
                                      {form.formState.errors.ogImage.message}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Recommended: 1200x630px image
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Right Column - Previews and Recommendations */}
                          <div className="space-y-6">
                            {/* Search Preview */}
                            <Card>
                              <CardHeader>
                                <CardTitle>Search Preview</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="border rounded-lg p-4 bg-muted/30">
                                  <div className="space-y-1">
                                    <div className="text-blue-600 text-lg font-medium hover:underline cursor-pointer">
                                      {previewData.google.title}
                                    </div>
                                    <div className="text-green-700 text-sm">
                                      {previewData.google.displayUrl}
                                    </div>
                                    <div className="text-gray-600 text-sm">
                                      {previewData.google.description}
                                    </div>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                  Preview of how this will appear in Google
                                  search results
                                </p>
                              </CardContent>
                            </Card>

                            {/* Social Media Preview */}
                            <Card>
                              <CardHeader>
                                <CardTitle>Social Media Preview</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="border rounded-lg p-4 bg-muted/30">
                                  <div className="aspect-video bg-gray-200 rounded mb-3 flex items-center justify-center text-gray-500 text-sm">
                                    {previewData.social.image !==
                                    "/placeholder-og-image.jpg" ? (
                                      <img
                                        src={previewData.social.image}
                                        alt="OG Preview"
                                        className="w-full h-full object-cover rounded"
                                        onError={(e) => {
                                          (
                                            e.target as HTMLImageElement
                                          ).style.display = "none";
                                          (
                                            e.target as HTMLImageElement
                                          ).nextElementSibling!.textContent =
                                            "Image preview unavailable";
                                        }}
                                      />
                                    ) : (
                                      "No image set"
                                    )}
                                    <span className="hidden">
                                      Image preview unavailable
                                    </span>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="font-semibold text-sm">
                                      {previewData.social.title}
                                    </div>
                                    <div className="text-gray-600 text-sm">
                                      {previewData.social.description}
                                    </div>
                                    <div className="text-gray-500 text-xs uppercase">
                                      {window.location.hostname}
                                    </div>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                  Preview for Facebook, Twitter, and other
                                  social platforms
                                </p>
                              </CardContent>
                            </Card>

                            {/* SEO Recommendations */}
                            <Card>
                              <CardHeader>
                                <CardTitle>GEO Recommendations</CardTitle>
                              </CardHeader>
                              <CardContent>
                                {recommendations.length === 0 ? (
                                  <div className="text-center py-4 text-green-600">
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                        ✓
                                      </div>
                                      <span className="font-medium">
                                        Great job!
                                      </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      Your GEO setup looks good
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {recommendations.map((rec, index) => (
                                      <div
                                        key={index}
                                        className={`flex gap-3 p-3 rounded-lg ${
                                          rec.type === "error"
                                            ? "bg-red-50 border border-red-200"
                                            : rec.type === "warning"
                                              ? "bg-yellow-50 border border-yellow-200"
                                              : "bg-blue-50 border border-blue-200"
                                        }`}
                                      >
                                        <div
                                          className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                                            rec.type === "error"
                                              ? "bg-red-200 text-red-800"
                                              : rec.type === "warning"
                                                ? "bg-yellow-200 text-yellow-800"
                                                : "bg-blue-200 text-blue-800"
                                          }`}
                                        >
                                          {rec.type === "error"
                                            ? "!"
                                            : rec.type === "warning"
                                              ? "⚠"
                                              : "i"}
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-sm font-medium">
                                            {rec.message}
                                          </p>
                                          <Badge
                                            variant="outline"
                                            className={`mt-1 text-xs ${
                                              rec.priority === "high"
                                                ? "border-red-300 text-red-700"
                                                : rec.priority === "medium"
                                                  ? "border-yellow-300 text-yellow-700"
                                                  : "border-blue-300 text-blue-700"
                                            }`}
                                          >
                                            {rec.priority} priority
                                          </Badge>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </TabsContent>

                {/* Channels Tab */}
                <TabsContent value="channels" className="space-y-6">
                  <ChannelsTab productId={productId} product={product} />
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Change History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-muted-foreground">
                        <History className="h-12 w-12 mx-auto mb-4" />
                        <p>Change tracking coming soon</p>
                        <p className="text-sm">
                          View detailed audit trail of all product modifications
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
