import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="fixed top-0 w-full z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-serif font-bold text-xl">P</span>
          </div>
          <span className="font-serif text-xl font-bold tracking-wide">PropIQ</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Modules</a>
          <a href="#comparison" className="hover:text-foreground transition-colors">Compare</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          <Link href="/demo" className="hover:text-foreground transition-colors" style={{ color: "#C9A84C", fontWeight: 600 }}>Try Demo</Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" className="hidden sm:flex text-muted-foreground hover:text-foreground">Log in</Button>
          </Link>
          <Link href="/signup">
            <Button>Analyse a Property</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
