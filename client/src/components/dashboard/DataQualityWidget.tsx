import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  AlertTriangle,
  Info,
  TrendingUp,
  ExternalLink,
  Shield,
  Search,
  Image,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: number;
  name: string;
  shortDescription?: string;
  longDescription?: string;
  story?: string;
  price?: number;
  stock?: number;
  sku?: string;
  status: string;
  metaTitle?: string;
  metaDescription?: string;
  seoScore?: number;
}

interface QualityScore {
  overall: number;
  completeness: number;
  seo: number;
  content: number;
  technical: number;
}

interface QualityIssue {
  type: "missing" | "warning" | "improvement";
  category: "basic" | "seo" | "content" | "technical";
  field: string;
  message: string;
  priority: "high" | "medium" | "low";
  productId?: number;
}

// Calculate product completeness score
function calculateProductCompleteness(product: Product): number {
  const requiredFields = ["name", "price", "sku", "shortDescription"];
  const optionalFields = ["longDescription", "story", "stock"];
  const seoFields = ["metaTitle", "metaDescription"];

  let score = 0;
  let maxScore = 0;

  // Required fields (60% weight)
  requiredFields.forEach((field) => {
    maxScore += 15;
    if (product[field as keyof Product]) {
      score += 15;
    }
  });

  // Optional fields (25% weight)
  optionalFields.forEach((field) => {
    maxScore += 8;
    if (product[field as keyof Product]) {
      score += 8;
    }
  });

  // SEO fields (15% weight)
  seoFields.forEach((field) => {
    maxScore += 7.5;
    if (product[field as keyof Product]) {
      score += 7.5;
    }
  });

  return Math.round((score / maxScore) * 100);
}

// Calculate SEO score
function calculateSEOScore(product: Product): number {
  let score = 0;
  let checks = 0;

  // Title check
  checks++;
  if (product.metaTitle) {
    if (product.metaTitle.length >= 30 && product.metaTitle.length <= 60) {
      score += 25;
    } else if (product.metaTitle.length > 0) {
      score += 15;
    }
  }

  // Description check
  checks++;
  if (product.metaDescription) {
    if (
      product.metaDescription.length >= 120 &&
      product.metaDescription.length <= 160
    ) {
      score += 25;
    } else if (product.metaDescription.length > 0) {
      score += 15;
    }
  }

  // Content quality
  checks++;
  if (product.longDescription && product.longDescription.length > 100) {
    score += 25;
  } else if (product.shortDescription && product.shortDescription.length > 50) {
    score += 15;
  }

  // Story content
  checks++;
  if (product.story && product.story.length > 50) {
    score += 25;
  }

  return Math.round(score);
}

// Generate quality issues
function generateQualityIssues(products: Product[]): QualityIssue[] {
  const issues: QualityIssue[] = [];

  products.forEach((product) => {
    // Missing required fields
    if (!product.name) {
      issues.push({
        type: "missing",
        category: "basic",
        field: "name",
        message: "Product name is required",
        priority: "high",
        productId: product.id,
      });
    }

    if (!product.price) {
      issues.push({
        type: "missing",
        category: "basic",
        field: "price",
        message: "Product price is missing",
        priority: "high",
        productId: product.id,
      });
    }

    if (!product.sku) {
      issues.push({
        type: "missing",
        category: "basic",
        field: "sku",
        message: "SKU is missing",
        priority: "high",
        productId: product.id,
      });
    }

    // SEO issues
    if (!product.metaTitle) {
      issues.push({
        type: "missing",
        category: "seo",
        field: "metaTitle",
        message: "SEO title is missing",
        priority: "medium",
        productId: product.id,
      });
    } else if (product.metaTitle.length < 30 || product.metaTitle.length > 60) {
      issues.push({
        type: "warning",
        category: "seo",
        field: "metaTitle",
        message: "SEO title should be 30-60 characters",
        priority: "medium",
        productId: product.id,
      });
    }

    if (!product.metaDescription) {
      issues.push({
        type: "missing",
        category: "seo",
        field: "metaDescription",
        message: "Meta description is missing",
        priority: "medium",
        productId: product.id,
      });
    }

    // Content quality issues
    if (!product.longDescription) {
      issues.push({
        type: "improvement",
        category: "content",
        field: "longDescription",
        message: "Long description improves customer understanding",
        priority: "low",
        productId: product.id,
      });
    }

    if (!product.story) {
      issues.push({
        type: "improvement",
        category: "content",
        field: "story",
        message: "Product story enhances brand storytelling",
        priority: "low",
        productId: product.id,
      });
    }
  });

  return issues;
}

export function DataQualityWidget() {
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "basic" | "seo" | "content" | "technical"
  >("all");

  const { data: products, isLoading } = useQuery({
    queryKey: ["/api/products"],
    retry: false,
  });

  const qualityMetrics = useMemo(() => {
    if (!products || !Array.isArray(products)) {
      return {
        scores: {
          overall: 0,
          completeness: 0,
          seo: 0,
          content: 0,
          technical: 0,
        },
        issues: [],
        productScores: [],
      };
    }

    const productScores = products.map((product: Product) => ({
      id: product.id,
      name: product.name,
      completeness: calculateProductCompleteness(product),
      seo: calculateSEOScore(product),
    }));

    const avgCompleteness =
      productScores.reduce((sum, p) => sum + p.completeness, 0) /
        productScores.length || 0;
    const avgSEO =
      productScores.reduce((sum, p) => sum + p.seo, 0) / productScores.length ||
      0;

    const issues = generateQualityIssues(products);

    const scores: QualityScore = {
      completeness: Math.round(avgCompleteness),
      seo: Math.round(avgSEO),
      content: Math.round((avgCompleteness + avgSEO) / 2),
      technical: 85, // Mock technical score
      overall: Math.round((avgCompleteness + avgSEO + 85) / 3),
    };

    return { scores, issues, productScores };
  }, [products]);

  const filteredIssues = useMemo(() => {
    return qualityMetrics.issues.filter(
      (issue) =>
        selectedCategory === "all" || issue.category === selectedCategory,
    );
  }, [qualityMetrics.issues, selectedCategory]);

  const issuesByPriority = useMemo(() => {
    const high = filteredIssues.filter((i) => i.priority === "high").length;
    const medium = filteredIssues.filter((i) => i.priority === "medium").length;
    const low = filteredIssues.filter((i) => i.priority === "low").length;
    return { high, medium, low };
  }, [filteredIssues]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Data Quality Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-20 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-success";
    if (score >= 70) return "text-info";
    if (score >= 50) return "text-warning";
    return "text-destructive";
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 90) return "default";
    if (score >= 70) return "secondary";
    if (score >= 50) return "outline";
    return "destructive";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold">
          Data Quality Overview
        </CardTitle>
        <Badge
          variant={getScoreBadgeVariant(qualityMetrics.scores.overall)}
          className="text-sm"
        >
          {qualityMetrics.scores.overall}% Overall
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quality Scores */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Completeness</span>
            </div>
            <div className="space-y-1">
              <Progress
                value={qualityMetrics.scores.completeness}
                className="h-2"
              />
              <div
                className={cn(
                  "text-sm font-bold",
                  getScoreColor(qualityMetrics.scores.completeness),
                )}
              >
                {qualityMetrics.scores.completeness}%
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">SEO Quality</span>
            </div>
            <div className="space-y-1">
              <Progress value={qualityMetrics.scores.seo} className="h-2" />
              <div
                className={cn(
                  "text-sm font-bold",
                  getScoreColor(qualityMetrics.scores.seo),
                )}
              >
                {qualityMetrics.scores.seo}%
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Content</span>
            </div>
            <div className="space-y-1">
              <Progress value={qualityMetrics.scores.content} className="h-2" />
              <div
                className={cn(
                  "text-sm font-bold",
                  getScoreColor(qualityMetrics.scores.content),
                )}
              >
                {qualityMetrics.scores.content}%
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Technical</span>
            </div>
            <div className="space-y-1">
              <Progress
                value={qualityMetrics.scores.technical}
                className="h-2"
              />
              <div
                className={cn(
                  "text-sm font-bold",
                  getScoreColor(qualityMetrics.scores.technical),
                )}
              >
                {qualityMetrics.scores.technical}%
              </div>
            </div>
          </div>
        </div>

        {/* Issues Summary */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium">Quality Issues</h4>
            <div className="flex gap-2">
              {(["all", "basic", "seo", "content", "technical"] as const).map(
                (category) => (
                  <Button
                    key={category}
                    variant={
                      selectedCategory === category ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="h-7 text-xs"
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Button>
                ),
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">
                {issuesByPriority.high}
              </div>
              <div className="text-xs text-muted-foreground">High Priority</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">
                {issuesByPriority.medium}
              </div>
              <div className="text-xs text-muted-foreground">
                Medium Priority
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-info">
                {issuesByPriority.low}
              </div>
              <div className="text-xs text-muted-foreground">Low Priority</div>
            </div>
          </div>

          {/* Issue List */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {filteredIssues.slice(0, 10).map((issue, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
              >
                <div className="flex-shrink-0">
                  {issue.type === "missing" && (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                  {issue.type === "warning" && (
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  )}
                  {issue.type === "improvement" && (
                    <Info className="h-4 w-4 text-info" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {issue.message}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {issue.category} • {issue.field}
                  </div>
                </div>
                <Badge
                  variant={
                    issue.priority === "high"
                      ? "destructive"
                      : issue.priority === "medium"
                        ? "default"
                        : "secondary"
                  }
                  className="text-xs"
                >
                  {issue.priority}
                </Badge>
              </div>
            ))}
          </div>

          {filteredIssues.length > 10 && (
            <div className="text-center mt-4">
              <Button variant="outline" size="sm">
                View All {filteredIssues.length} Issues
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Improvement Recommendations */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3">Quick Wins</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-success/10 border border-success/20">
              <TrendingUp className="h-4 w-4 text-success" />
              <div className="flex-1">
                <div className="text-sm font-medium">
                  Add SEO titles to improve search visibility
                </div>
                <div className="text-xs text-muted-foreground">
                  +{issuesByPriority.medium} products need meta titles
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                +15% SEO
              </Badge>
            </div>

            <div className="flex items-center gap-3 p-2 rounded-lg bg-info/10 border border-info/20">
              <FileText className="h-4 w-4 text-info" />
              <div className="flex-1">
                <div className="text-sm font-medium">
                  Complete missing product descriptions
                </div>
                <div className="text-xs text-muted-foreground">
                  Improve customer understanding and conversion
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                +10% Quality
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
