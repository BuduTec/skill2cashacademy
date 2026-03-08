import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, BookOpen, Users, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const getRoleLabel = () => {
    switch (profile?.role) {
      case "admin": return "Administrator";
      case "instructor": return "Instructor";
      default: return "Student";
    }
  };

  const getRoleIcon = () => {
    switch (profile?.role) {
      case "admin": return <Settings className="h-5 w-5" />;
      case "instructor": return <Users className="h-5 w-5" />;
      default: return <BookOpen className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <h1 className="font-heading text-xl font-bold">
            Skill<span className="text-accent">2</span>Cash
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="mb-8">
          <h2 className="font-heading text-3xl font-bold">
            Welcome back, {profile?.full_name || "there"}! 👋
          </h2>
          <div className="mt-2 flex items-center gap-2 text-muted-foreground">
            {getRoleIcon()}
            <span className="rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
              {getRoleLabel()}
            </span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">My Courses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Your enrolled courses will appear here.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Track your learning progress here.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">Certificates</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Your earned certificates will appear here.</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
