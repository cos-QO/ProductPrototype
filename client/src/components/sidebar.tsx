import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Crown, 
  Box, 
  BarChart3, 
  TrendingUp, 
  Images, 
  Layers, 
  Share, 
  Code, 
  Store,
  ChartPie
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const [location] = useLocation();

  // Fetch dynamic counts for sidebar badges
  const { data: counts } = useQuery({
    queryKey: ["/api/dashboard/counts"],
    retry: false,
  });

  const navigation = [
    {
      section: "Overview",
      items: [
        { name: "Dashboard", href: "/", icon: ChartPie, current: location === "/" },
        { name: "Analytics", href: "/analytics", icon: TrendingUp, current: location === "/analytics" },
      ]
    },
    {
      section: "Catalog",
      items: [
        { name: "Brands", href: "/brands", icon: Crown, current: location === "/brands", badge: counts?.brands?.toString() || "0" },
        { name: "Products", href: "/products", icon: Box, current: location === "/products", badge: counts?.products?.toString() || "0" },
        { name: "Media Assets", href: "/assets", icon: Images, current: location === "/assets" },
        { name: "Product Families", href: "/families", icon: Layers, current: location === "/families" },
      ]
    },
    {
      section: "Distribution",
      items: [
        { name: "Syndication", href: "/syndication", icon: Share, current: location === "/syndication" },
        { name: "API Management", href: "/api", icon: Code, current: location === "/api" },
        { name: "Retail Partners", href: "/partners", icon: Store, current: location === "/partners" },
      ]
    }
  ];

  return (
    <aside className="w-64 bg-card border-r border-border p-6 hidden lg:block" data-testid="sidebar">
      <div className="space-y-8">
        {navigation.map((section) => (
          <div key={section.section}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              {section.section}
            </h3>
            <nav className="space-y-2">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link 
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center space-x-3 text-sm font-medium rounded-lg px-3 py-2 transition-colors",
                      item.current 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                    data-testid={`link-sidebar-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className={cn(
                        "ml-auto text-xs px-2 py-1 rounded-full",
                        item.current 
                          ? "bg-accent text-accent-foreground" 
                          : "bg-muted text-muted-foreground"
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  );
}
