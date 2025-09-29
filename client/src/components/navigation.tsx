import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Crown, Search, Bell } from "lucide-react";
import { Link } from "wouter";

export default function Navigation() {
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link
              href="/"
              className="flex items-center space-x-3"
              data-testid="link-home"
            >
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Crown className="text-white h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Queen.one</h1>
                <p className="text-xs text-muted-foreground">SKU Store</p>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center space-x-6">
              <Link
                href="/"
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors duration-[var(--motion-duration-fast)]"
                data-testid="link-dashboard"
              >
                Dashboard
              </Link>
              <Link
                href="/brands"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-[var(--motion-duration-fast)]"
                data-testid="link-brands"
              >
                Brands
              </Link>
              <Link
                href="/products"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-[var(--motion-duration-fast)]"
                data-testid="link-products"
              >
                Products
              </Link>
              <a
                href="#"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-[var(--motion-duration-fast)]"
                data-testid="link-assets"
              >
                Assets
              </a>
              <a
                href="#"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-[var(--motion-duration-fast)]"
                data-testid="link-syndication"
              >
                Syndication
              </a>
            </nav>
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

            <Button
              variant="ghost"
              size="sm"
              className="relative"
              data-testid="button-notifications"
            >
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-warning rounded-full"></span>
            </Button>

            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                {(user as any)?.profileImageUrl ? (
                  <img
                    src={(user as any).profileImageUrl}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-primary-foreground text-sm font-semibold">
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
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground transition-colors duration-[var(--motion-duration-fast)]"
                data-testid="button-logout"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
