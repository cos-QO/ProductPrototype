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
  ChartPie,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
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
        {
          name: "Dashboard",
          href: "/",
          icon: ChartPie,
          current: location === "/",
        },
        {
          name: "Analytics",
          href: "/analytics",
          icon: TrendingUp,
          current: location === "/analytics",
        },
      ],
    },
    {
      section: "Catalog",
      items: [
        {
          name: "Brands",
          href: "/brands",
          icon: Crown,
          current: location === "/brands",
          badge: counts?.brands?.toString() || "0",
        },
        {
          name: "Products",
          href: "/products",
          icon: Box,
          current: location === "/products",
          badge: counts?.products?.toString() || "0",
        },
        {
          name: "Media Assets",
          href: "/assets",
          icon: Images,
          current: location === "/assets",
        },
        {
          name: "Product Families",
          href: "/families",
          icon: Layers,
          current: location === "/families",
        },
      ],
    },
    {
      section: "Distribution",
      items: [
        {
          name: "Syndication",
          href: "/syndication",
          icon: Share,
          current: location === "/syndication",
        },
        {
          name: "API Management",
          href: "/api",
          icon: Code,
          current: location === "/api",
        },
        {
          name: "Retail Partners",
          href: "/partners",
          icon: Store,
          current: location === "/partners",
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "w-64 bg-card border-r border-border p-6 z-50",
          "lg:block lg:relative lg:translate-x-0",
          "fixed top-0 left-0 h-full transition-transform duration-300 ease-in-out lg:transition-none",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "lg:block", // Always visible on desktop
          isOpen ? "block" : "hidden lg:block", // Show/hide based on state on mobile, always show on desktop
        )}
        data-testid="sidebar"
      >
        {/* Mobile close button */}
        <div className="lg:hidden flex justify-end mb-4">
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-primary transition-colors duration-200"
            data-testid="button-close-sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
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
                      onClick={() => onClose?.()} // Close mobile menu when link is clicked
                      className={cn(
                        "flex items-center space-x-3 text-sm font-medium px-3 py-2 transition-colors duration-100 relative",
                        item.current
                          ? "bg-info/10 text-info rounded-r-lg"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors duration-100 rounded-lg",
                      )}
                      data-testid={`link-sidebar-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {item.current && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-info rounded-none" />
                      )}
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                      {item.badge && (
                        <span
                          className={cn(
                            "ml-auto text-xs px-2 py-1 rounded-full",
                            item.current
                              ? "bg-accent text-accent-foreground"
                              : "bg-muted/60 text-muted-foreground",
                          )}
                        >
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
    </>
  );
}
