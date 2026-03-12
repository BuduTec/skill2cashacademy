import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const roleToDashboard = (role: string): string => {
  switch (role) {
    case "admin": return "/dashboard/admin";
    case "co_owner": return "/dashboard/co-owner";
    case "whitelabel_owner": return "/dashboard/whitelabel";
    default: return "/dashboard";
  }
};

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      // Wait for the session to be established from the URL hash
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        setError("Authentication failed. Please try again.");
        setTimeout(() => navigate("/login"), 2000);
        return;
      }

      const userId = session.user.id;

      // Query role from profiles table
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      // Check if user has affiliate account
      const { data: affiliate } = await supabase
        .from("affiliate_accounts")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      // Store affiliate status for dashboard switcher
      if (affiliate) {
        sessionStorage.setItem("has_affiliate_account", "true");
      }

      const role = profile?.role || "student";
      navigate(roleToDashboard(role), { replace: true });
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary">
        <p className="text-destructive text-lg">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary">
      <div className="text-center">
        <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <p className="mt-4 text-primary-foreground/70">Signing you in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
