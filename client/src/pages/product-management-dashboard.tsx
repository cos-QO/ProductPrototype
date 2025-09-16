import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Link } from "wouter";
import Navigation from "@/components/navigation";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Filter, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  TrendingUp,
  Box,
  Users,
  Activity,
  FileText,
  Eye,
  Edit,
  MoreHorizontal
} from "lucide-react";

interface DashboardMetrics {
  totalProducts: number;
  completeProducts: number;
  completionPercentage: number;
  pendingApproval: number;
  enrichmentProgress: {
    channel: string;
    progress: number;
    total: number;
  }[];
}

interface TaskItem {
  id: string;
  productId: number;
  productName: string;
  taskType: 'missing_info' | 'approval_needed' | 'enrichment' | 'validation';
  priority: 'high' | 'medium' | 'low';
  assignedTo?: string;
  dueDate: string;
  description: string;
}

interface ActivityItem {
  id: string;
  userId: string;
  userName: string;
  action: string;
  productId?: number;
  productName?: string;
  timestamp: string;
  details: string;
}

export default function ProductManagementDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [workflowFilter, setWorkflowFilter] = useState("all");

  // Redirect if not authenticated
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

  // Fetch dashboard data
  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
    retry: false,
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<TaskItem[]>({
    queryKey: ["/api/dashboard/tasks"],
    retry: false,
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery<ActivityItem[]>({
    queryKey: ["/api/dashboard/activities"],
    retry: false,
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products"],
    retry: false,
  });

  const { data: brands } = useQuery({
    queryKey: ["/api/brands"],
    retry: false,
  });

  const filteredProducts = (products as any[])?.filter((product: any) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || product.status === statusFilter;
    const matchesBrand = brandFilter === "all" || product.brandId.toString() === brandFilter;
    return matchesSearch && matchesStatus && matchesBrand;
  });

  const getTaskPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'missing_info': return <AlertTriangle className="h-4 w-4" />;
      case 'approval_needed': return <CheckCircle className="h-4 w-4" />;
      case 'enrichment': return <TrendingUp className="h-4 w-4" />;
      case 'validation': return <FileText className="h-4 w-4" />;
      default: return <Box className="h-4 w-4" />;
    }
  };

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      
      <div className="flex min-h-screen">
        <Sidebar />
        
        <main className="flex-1 p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2" data-testid="page-title">Product Management Dashboard</h1>
            <p className="text-muted-foreground">Operational hub for efficient product data management</p>
          </div>

          {/* Key Metrics Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card data-testid="metric-total-products">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <Box className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.totalProducts || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Active product catalog
                </p>
              </CardContent>
            </Card>

            <Card data-testid="metric-completion-rate">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.completionPercentage || 0}%</div>
                <Progress value={metrics?.completionPercentage || 0} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  Products with complete information
                </p>
              </CardContent>
            </Card>

            <Card data-testid="metric-pending-approval">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.pendingApproval || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Products awaiting approval
                </p>
              </CardContent>
            </Card>

            <Card data-testid="metric-enrichment-progress">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Enrichment Progress</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics?.enrichmentProgress?.map((channel, index) => (
                    <div key={index}>
                      <div className="flex justify-between text-sm">
                        <span>{channel.channel}</span>
                        <span>{channel.progress}/{channel.total}</span>
                      </div>
                      <Progress value={(channel.progress / channel.total) * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filtering */}
          <Card className="mb-8" data-testid="search-filters">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Quick Search and Filtering
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[300px]">
                  <Input
                    placeholder="Search products by name, SKU, or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                    data-testid="input-search"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]" data-testid="filter-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="review">Under Review</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={brandFilter} onValueChange={setBrandFilter}>
                  <SelectTrigger className="w-[150px]" data-testid="filter-brand">
                    <SelectValue placeholder="Brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {(brands as any[])?.map((brand: any) => (
                      <SelectItem key={brand.id} value={brand.id.toString()}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={workflowFilter} onValueChange={setWorkflowFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="filter-workflow">
                    <SelectValue placeholder="Workflow Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Workflows</SelectItem>
                    <SelectItem value="missing_info">Missing Information</SelectItem>
                    <SelectItem value="needs_approval">Needs Approval</SelectItem>
                    <SelectItem value="enrichment">Enrichment</SelectItem>
                    <SelectItem value="validation">Validation</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" data-testid="button-advanced-filters">
                  <Filter className="h-4 w-4 mr-2" />
                  Advanced
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Main Content Tabs */}
          <Tabs defaultValue="tasks" className="space-y-6">
            <TabsList>
              <TabsTrigger value="tasks" data-testid="tab-tasks">Task Lists</TabsTrigger>
              <TabsTrigger value="products" data-testid="tab-products">Products</TabsTrigger>
              <TabsTrigger value="activity" data-testid="tab-activity">User Activity</TabsTrigger>
            </TabsList>

            {/* Task Lists Tab */}
            <TabsContent value="tasks">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Tasks Needing Attention
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {tasks?.map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`task-${task.id}`}>
                        <div className="flex items-center space-x-4">
                          <div className={`w-2 h-8 rounded ${getTaskPriorityColor(task.priority)}`}></div>
                          <div className="flex items-center space-x-2">
                            {getTaskTypeIcon(task.taskType)}
                            <div>
                              <h4 className="font-medium">{task.productName}</h4>
                              <p className="text-sm text-muted-foreground">{task.description}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}>
                            {task.priority}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{task.dueDate}</span>
                          <Link href={`/products/${task.productId}/edit`}>
                            <Button size="sm" data-testid={`button-edit-${task.productId}`}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Products Tab */}
            <TabsContent value="products">
              <Card>
                <CardHeader>
                  <CardTitle>Product Catalog</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProducts?.map((product: any) => (
                      <Card key={product.id} className="relative" data-testid={`product-card-${product.id}`}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold truncate">{product.name}</h3>
                            <Badge variant={product.status === 'published' ? 'default' : 'secondary'}>
                              {product.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">SKU: {product.sku}</p>
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{product.shortDescription}</p>
                          <div className="flex justify-between items-center">
                            <Link href={`/products/${product.id}/view`}>
                              <Button variant="outline" size="sm" data-testid={`button-view-${product.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                            </Link>
                            <Link href={`/products/${product.id}/edit`}>
                              <Button size="sm" data-testid={`button-edit-product-${product.id}`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* User Activity Tab */}
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity Feed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activities?.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-4 p-4 border rounded-lg" data-testid={`activity-${activity.id}`}>
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{activity.userName}</span>
                            <span className="text-sm text-muted-foreground">{activity.action}</span>
                            {activity.productName && (
                              <Link href={`/products/${activity.productId}/edit`} className="text-sm text-primary hover:underline">
                                {activity.productName}
                              </Link>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{activity.details}</p>
                          <span className="text-xs text-muted-foreground">{activity.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}