import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Crown, Search, Bell, Menu } from "lucide-react";
import { Link } from "wouter";

interface NavigationProps {
  onMenuToggle?: () => void;
}

export default function Navigation({ onMenuToggle }: NavigationProps) {
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 text-muted-foreground hover:text-primary transition-colors duration-200"
              data-testid="button-mobile-menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link
              href="/"
              className="flex items-center space-x-3"
              data-testid="link-home"
            >
              <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
                <Crown className="text-white h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Queen.one</h1>
                <p className="text-xs text-muted-foreground">SKU Store</p>
              </div>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search products, brands..."
                className="pl-10 pr-4 py-2 w-64"
                data-testid="input-global-search"
              />
            </div>

            <button
              className="relative p-2 text-muted-foreground hover:text-primary transition-colors duration-200"
              data-testid="button-notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute bottom-0 left-0 w-2.5 h-2.5 bg-warning rounded-full transform translate-x-1 -translate-y-1"></span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 gradient-accent rounded-full flex items-center justify-center">
                {(user as any)?.profileImageUrl ? (
                  <img
                    src={(user as any).profileImageUrl}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-accent-foreground text-sm font-semibold">
                    {(user as any)?.firstName?.charAt(0) ||
                      (user as any)?.email?.charAt(0) ||
                      "U"}
                  </span>
                )}
              </div>
              <div className="hidden lg:block">
                <p className="text-sm font-medium" data-testid="text-user-name">
                  {(user as any)?.firstName && (user as any)?.lastName
                    ? `${(user as any).firstName} ${(user as any).lastName}`
                    : (user as any)?.email || "User"}
                </p>
                <p
                  className="text-xs text-muted-foreground capitalize"
                  data-testid="text-user-role"
                >
                  {(user as any)?.role?.replace("_", " ") || "Brand Owner"}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm font-medium"
                data-testid="button-logout"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
