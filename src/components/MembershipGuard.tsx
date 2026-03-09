import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface MembershipGuardProps {
  children: React.ReactNode;
}

const MembershipGuard: React.FC<MembershipGuardProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [hasActiveMembership, setHasActiveMembership] = useState(false);

  useEffect(() => {
    const checkMembership = async () => {
      if (!user) {
        setChecking(false);
        return;
      }

      const { data } = await supabase
        .from("memberships")
        .select("id, expiry_date, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gte("expiry_date", new Date().toISOString())
        .order("expiry_date", { ascending: false })
        .limit(1);

      setHasActiveMembership(!!(data && data.length > 0));
      setChecking(false);
    };

    if (!authLoading && user) {
      checkMembership();
    } else if (!authLoading) {
      setChecking(false);
    }
  }, [user, authLoading]);

  if (authLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!hasActiveMembership) {
    // Check if they have any expired membership
    return <Navigate to="/membership/renew" replace />;
  }

  return <>{children}</>;
};

export default MembershipGuard;
