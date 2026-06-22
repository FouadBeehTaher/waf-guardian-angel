import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "./LanguageToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/use-auth";

export function SiteHeader() {
  const { t } = useI18n();
  const { user, isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <Shield className="h-6 w-6 text-primary" />
          <span className="text-glow">{t.appName}</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link to="/" className="text-muted-foreground hover:text-foreground [&.active]:text-foreground">{t.nav.home}</Link>
          <Link to="/simulator" className="text-muted-foreground hover:text-foreground [&.active]:text-foreground">{t.nav.simulator}</Link>
          <Link to="/docs" className="text-muted-foreground hover:text-foreground [&.active]:text-foreground">{t.nav.docs}</Link>
          {user && isAdmin && (
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground [&.active]:text-foreground">{t.nav.dashboard}</Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          {user ? (
            <Link to={isAdmin ? "/dashboard" : "/auth"}>
              <Button size="sm" variant="default">{t.nav.dashboard}</Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button size="sm" variant="default">{t.nav.signIn}</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
