import { useAuth } from "@/contexts/AuthContext";

export const useRoleDashboardPath = (): string => {
  const { profile } = useAuth();
  const role = profile?.role;

  switch (role) {
    case "co_owner":
      return "/dashboard/co-owner";
    case "white_label_owner":
      return "/dashboard/coming-soon";
    case "referrer":
      return "/dashboard/coming-soon";
    default:
      return "/dashboard";
  }
};
