import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const MembershipRenew = () => {
  const { profile } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="font-heading text-2xl">Membership Expired</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-muted-foreground">
            Your membership has expired. Renew now to regain access to your dashboard and all features.
          </p>
          <Link to={`/membership/checkout?tier=${profile?.role || "referrer"}`}>
            <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" size="lg">
              Renew Membership <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/" className="block">
            <Button variant="ghost" className="w-full text-muted-foreground">
              Back to Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default MembershipRenew;
