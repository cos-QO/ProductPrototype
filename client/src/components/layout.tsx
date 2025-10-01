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

      <div className="flex h-[calc(100vh-4rem)]">
        <Sidebar isOpen={isMobileMenuOpen} onClose={handleMenuClose} />

        {/* Main Content - scrollable area */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
