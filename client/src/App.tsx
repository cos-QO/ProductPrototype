import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Brands from "@/pages/brands";
import Products from "@/pages/products";
import ProductEdit from "@/pages/product-edit";
import ProductManagementDashboard from "@/pages/product-management-dashboard";
import ProductDetails from "@/pages/product-details";
import BulkEdit from "@/pages/bulk-edit";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading ? (
        // Show loading state - could add a loading component here
        <Route path="/" component={Landing} />
      ) : isAuthenticated ? (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/product-management" component={ProductManagementDashboard} />
          <Route path="/bulk-edit" component={BulkEdit} />
          <Route path="/brands" component={Brands} />
          <Route path="/products" component={Products} />
          <Route path="/products/:id/edit" component={ProductEdit} />
          <Route path="/products/:id/view" component={ProductDetails} />
          <Route path="/products/:id/manage" component={ProductDetails} />
        </>
      ) : (
        // Not authenticated - show landing for all routes
        <>
          <Route path="/" component={Landing} />
          <Route path="/brands" component={Landing} />
          <Route path="/products" component={Landing} />
          <Route path="/products/:id/edit" component={Landing} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
