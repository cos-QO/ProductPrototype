import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Box, Share, Clock, ArrowRight } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
                <Crown className="text-white h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Queen.one</h1>
                <p className="text-xs text-muted-foreground">SKU Store</p>
              </div>
            </div>
            
            <Button 
              onClick={handleLogin}
              className="gradient-primary text-white hover:opacity-90"
              data-testid="button-login"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="gradient-primary rounded-2xl p-8 mb-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
            <div className="relative z-10">
              <h1 className="text-5xl font-bold text-white mb-4">Achieve Hexellence</h1>
              <p className="text-xl text-white/80 mb-8">Every product has a story. Let's tell yours.</p>
              <p className="text-lg text-white/70 mb-8">
                The centralized platform that serves as the single source of truth for all 
                product and brand-related data, content, and assets.
              </p>
              <Button 
                onClick={handleLogin}
                size="lg"
                className="bg-white text-primary hover:bg-white/90 font-semibold"
                data-testid="button-get-started"
              >
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <Card className="bg-card border-border">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Crown className="text-primary h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">Brand Registry</h3>
                <p className="text-sm text-muted-foreground">
                  Register and manage brands with complete ownership governance
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Box className="text-accent h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">Product Management</h3>
                <p className="text-sm text-muted-foreground">
                  Centralize all product data with rich storytelling content
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Share className="text-blue-400 h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">Omni-Channel Syndication</h3>
                <p className="text-sm text-muted-foreground">
                  Distribute content across all retail channels seamlessly
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Clock className="text-green-400 h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">Rapid Time-to-Market</h3>
                <p className="text-sm text-muted-foreground">
                  Launch products faster with streamlined workflows
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Features List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">For Brand Owners</h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <span>Complete control over brand content and storytelling</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <span>Centralized media asset management</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <span>API access for custom integrations</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <span>Retailer permission management</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">For Retailers</h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-accent rounded-full mt-2"></div>
                    <span>Access to enriched product content</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-accent rounded-full mt-2"></div>
                    <span>Custom content layering capabilities</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-accent rounded-full mt-2"></div>
                    <span>Bundle and kit creation tools</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-accent rounded-full mt-2"></div>
                    <span>Real-time syndication updates</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 backdrop-blur-sm px-6 py-8 text-center">
        <div className="max-w-4xl mx-auto">
          <p className="text-muted-foreground text-sm">
            © 2025 Queen.one. Transforming commerce through storytelling.
          </p>
        </div>
      </footer>
    </div>
  );
}
