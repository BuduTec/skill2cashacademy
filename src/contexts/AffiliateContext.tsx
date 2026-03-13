import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface AffiliateContextType {
  hasAffiliate: boolean;
  currentView: "primary" | "affiliate";
  toggleView: () => void;
  loading: boolean;
}

const AffiliateContext = createContext<AffiliateContextType>({
  hasAffiliate: false,
  currentView: "primary",
  toggleView: () => {},
  loading: true,
});

export const AffiliateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [hasAffiliate, setHasAffiliate] = useState(false);
  const [currentView, setCurrentView] = useState<"primary" | "affiliate">("primary");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setHasAffiliate(false);
      setCurrentView("primary");
      setLoading(false);
      return;
    }

    const checkAffiliate = async () => {
      const { data } = await supabase
        .from("affiliate_accounts")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      setHasAffiliate(!!data);
      setLoading(false);
    };

    checkAffiliate();
  }, [user]);

  const toggleView = () => {
    setCurrentView((v) => (v === "primary" ? "affiliate" : "primary"));
  };

  return (
    <AffiliateContext.Provider value={{ hasAffiliate, currentView, toggleView, loading }}>
      {children}
    </AffiliateContext.Provider>
  );
};

export const useAffiliate = () => useContext(AffiliateContext);
