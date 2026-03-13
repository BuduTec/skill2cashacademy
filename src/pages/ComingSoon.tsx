import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Rocket, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ComingSoon = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="font-heading text-xl font-bold">
            Skill<span className="text-accent">2</span>Cash
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container flex items-center justify-center py-24">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-16 space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
              <Rocket className="h-8 w-8 text-accent" />
            </div>
            <h1 className="font-heading text-2xl font-bold">Coming Soon</h1>
            <p className="text-muted-foreground">
              Your {profile?.role === "white_label_owner" ? "White-Label Owner" : "Affiliate"} dashboard is being built. 
              We'll notify you when it's ready!
            </p>
            <Link to="/courses">
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                Browse Courses
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ComingSoon;
