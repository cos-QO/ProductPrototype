import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CloudUpload, Loader2 } from "lucide-react";

const brandFormSchema = z.object({
  name: z
    .string()
    .min(1, "Brand name is required")
    .max(255, "Brand name must be less than 255 characters"),
  description: z.string().optional(),
  story: z.string().optional(),
  category: z.string().min(1, "Category is required"),
});

type BrandFormData = z.infer<typeof brandFormSchema>;

export default function BrandRegistrationForm() {
  const { toast } = useToast();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const form = useForm<BrandFormData>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: {
      name: "",
      description: "",
      story: "",
      category: "",
    },
  });

  const createBrandMutation = useMutation({
    mutationFn: async (data: BrandFormData) => {
      const formData = new FormData();
      formData.append("name", data.name);
      if (data.description) formData.append("description", data.description);
      if (data.story) formData.append("story", data.story);
      formData.append("category", data.category);
      if (logoFile) formData.append("logo", logoFile);

      const response = await fetch("/api/brands", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Brand registered successfully!",
      });
      form.reset();
      setLogoFile(null);
    },
    onError: (error) => {
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
        description: "Failed to register brand. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        setLogoFile(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (PNG, JPG, etc.)",
          variant: "destructive",
        });
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      setLogoFile(files[0]);
    }
  };

  const onSubmit = (data: BrandFormData) => {
    createBrandMutation.mutate(data);
  };

  return (
    <Card
      className="bg-card border-border"
      data-testid="brand-registration-form"
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Brand Registration</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary/80 transition-colors duration-[var(--motion-duration-fast)]"
            data-testid="button-view-all-brands"
          >
            View All <span className="ml-1">→</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Brand Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter brand name"
                      {...field}
                      data-testid="input-brand-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="story"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Brand Story
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell your brand's story..."
                      rows={3}
                      className="resize-none"
                      {...field}
                      data-testid="textarea-brand-story"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Category
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-brand-category">
                        <SelectValue placeholder="Select category..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="fashion-apparel">
                        Fashion & Apparel
                      </SelectItem>
                      <SelectItem value="home-garden">Home & Garden</SelectItem>
                      <SelectItem value="electronics">Electronics</SelectItem>
                      <SelectItem value="health-beauty">
                        Health & Beauty
                      </SelectItem>
                      <SelectItem value="sports-outdoors">
                        Sports & Outdoors
                      </SelectItem>
                      <SelectItem value="toys-games">Toys & Games</SelectItem>
                      <SelectItem value="automotive">Automotive</SelectItem>
                      <SelectItem value="books-media">Books & Media</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium">Brand Logo</label>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-[var(--motion-duration-fast)] cursor-pointer ${
                  dragActive
                    ? "border-info bg-info/5"
                    : "border-border hover:border-info/50"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById("logo-upload")?.click()}
                data-testid="dropzone-brand-logo"
              >
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-logo-file"
                />
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
                  <CloudUpload className="text-muted-foreground h-6 w-6" />
                </div>
                {logoFile ? (
                  <div>
                    <p className="text-sm font-medium text-success mb-2">
                      {logoFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Click to change or drag a new file
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Drop your logo here, or{" "}
                      <span className="text-info">browse</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG up to 10MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-semibold"
              disabled={createBrandMutation.isPending}
              data-testid="button-register-brand"
            >
              {createBrandMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering Brand...
                </>
              ) : (
                "Register Brand"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
