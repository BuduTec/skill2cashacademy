import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary p-4">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
          <Search className="h-10 w-10 text-accent" />
        </div>
        <h1 className="font-heading text-6xl font-bold text-primary-foreground">404</h1>
        <p className="mt-4 text-xl text-primary-foreground/70">Page not found</p>
        <p className="mt-2 text-sm text-primary-foreground/50">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className="mt-8 inline-block">
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90" size="lg">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
