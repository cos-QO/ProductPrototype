import { useState } from "react";
import Navigation from "@/components/navigation";
import Sidebar from "@/components/sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Mobile menu handlers
  const handleMenuToggle = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  const handleMenuClose = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation onMenuToggle={handleMenuToggle} />

      <div className="flex min-h-screen">
        <Sidebar isOpen={isMobileMenuOpen} onClose={handleMenuClose} />

        {/* Main Content */}
        <main className="flex-1 w-full">{children}</main>
      </div>
    </div>
  );
}
