import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAffiliate } from "@/contexts/AffiliateContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, ArrowLeftRight } from "lucide-react";

const roleLabels: Record<string, string> = {
  student: "Student",
  co_owner: "Co-Owner",
  whitelabel_owner: "White-Label Owner",
  referrer: "Affiliate",
  white_label_owner: "White-Label Owner",
  admin: "Admin",
};

const roleToDashboard = (role: string): string => {
  switch (role) {
    case "admin": return "/dashboard/admin";
    case "co_owner": return "/dashboard/co-owner";
    case "whitelabel_owner": return "/dashboard/whitelabel";
    default: return "/dashboard";
  }
};

const DashboardHeader = () => {
  const { user, profile, signOut } = useAuth();
  const { hasAffiliate, currentView, toggleView } = useAffiliate();
  const navigate = useNavigate();
  const location = useLocation();

  const isOnDashboard = location.pathname.startsWith("/dashboard");

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const handleSwitch = () => {
    toggleView();
    if (currentView === "primary") {
      navigate("/dashboard/affiliate");
    } else {
      const role = profile?.role || "student";
      navigate(roleToDashboard(role));
    }
  };

  const roleLabel = roleLabels[profile?.role || "student"] || "Student";

  return (
    <header className="border-b bg-card">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="font-heading text-xl font-bold">
          Skill<span className="text-accent">2</span>Cash
        </Link>
        <div className="flex items-center gap-3">
          {isOnDashboard && hasAffiliate && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSwitch}
              className="border-accent/30 text-accent hover:bg-accent/10 gap-1.5"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {currentView === "primary"
                  ? "Switch to Affiliate View"
                  : `Switch to ${roleLabel} View`}
              </span>
              <span className="sm:hidden">
                {currentView === "primary" ? "Affiliate" : roleLabel}
              </span>
            </Button>
          )}
          <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
