import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, CreditCard, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const tierData: Record<string, { name: string; price: number; priceLabel: string; benefits: string[] }> = {
  referrer: {
    name: "Referrer",
    price: 3000,
    priceLabel: "₦3,000/year",
    benefits: [
      "Earn commissions on every referral",
      "Access to referral dashboard",
      "Unique referral link & tracking",
      "Community chat access",
      "Monthly payout via bank transfer",
    ],
  },
  co_owner: {
    name: "Co-Owner",
    price: 30000,
    priceLabel: "₦30,000/year",
    benefits: [
      "Everything in Referrer plan",
      "Co-branded course storefront",
      "Higher commission rates (up to 40%)",
      "Priority support & mentorship",
      "Access to premium courses library",
      "Revenue sharing on sub-referrals",
    ],
  },
  white_label_owner: {
    name: "White-Label Owner",
    price: 100000,
    priceLabel: "₦100,000/year",
    benefits: [
      "Everything in Co-Owner plan",
      "Fully branded platform (your logo & domain)",
      "Custom course uploads",
      "Unlimited sub-accounts",
      "Dedicated account manager",
      "API access & integrations",
      "Keep up to 70% of revenue",
    ],
  },
};

const MembershipCheckout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tierKey = searchParams.get("tier") || "referrer";
  const tier = tierData[tierKey] || tierData.referrer;
  const [loading, setLoading] = useState<string | null>(null);

  const saveMembership = async (paymentRef: string) => {
    if (!user) return;
    const now = new Date();
    const expiry = new Date(now);
    expiry.setFullYear(expiry.getFullYear() + 1);

    const { error } = await supabase.from("memberships").insert({
      user_id: user.id,
      tier: tierKey,
      amount_paid: tier.price,
      payment_ref: paymentRef,
      start_date: now.toISOString(),
      expiry_date: expiry.toISOString(),
      status: "active",
    });

    if (error) {
      toast({ title: "Error saving membership", description: error.message, variant: "destructive" });
      return false;
    }

    // Update profile role to match tier
    await supabase.from("profiles").update({ role: tierKey }).eq("id", user.id);

    return true;
  };

  const handlePaystack = () => {
    const key = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    if (!key) {
      toast({ title: "Paystack not configured", description: "Public key missing.", variant: "destructive" });
      return;
    }
    setLoading("paystack");

    const handler = (window as any).PaystackPop?.setup({
      key,
      email: user?.email,
      amount: tier.price * 100, // kobo
      currency: "NGN",
      ref: `PS_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      callback: async (response: any) => {
        const success = await saveMembership(response.reference);
        setLoading(null);
        if (success) {
          toast({ title: "Payment successful!", description: "Welcome aboard!" });
          const dest = tierKey === "co_owner" ? "/dashboard/co-owner" : tierKey === "whitelabel_owner" ? "/dashboard/whitelabel" : tierKey === "referrer" ? "/dashboard/coming-soon" : "/dashboard";
          navigate(dest);
        }
      },
      onClose: () => {
        setLoading(null);
        toast({ title: "Payment cancelled", variant: "destructive" });
      },
    });
    handler?.openIframe();
  };

  const handleFlutterwave = () => {
    const key = import.meta.env.VITE_FLW_PUBLIC_KEY;
    if (!key) {
      toast({ title: "Flutterwave not configured", description: "Public key missing.", variant: "destructive" });
      return;
    }
    setLoading("flutterwave");

    (window as any).FlutterwaveCheckout?.({
      public_key: key,
      tx_ref: `FLW_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      amount: tier.price,
      currency: "NGN",
      customer: { email: user?.email },
      customizations: {
        title: "Skill2Cash Membership",
        description: `${tier.name} Plan`,
      },
      callback: async (response: any) => {
        if (response.status === "successful" || response.status === "completed") {
          const success = await saveMembership(response.transaction_id?.toString() || response.tx_ref);
          setLoading(null);
          if (success) {
            toast({ title: "Payment successful!", description: "Welcome aboard!" });
            const dest = tierKey === "co_owner" ? "/dashboard/co-owner" : tierKey === "whitelabel_owner" ? "/dashboard/whitelabel" : tierKey === "referrer" ? "/dashboard/coming-soon" : "/dashboard";
            navigate(dest);
          }
        } else {
          setLoading(null);
          toast({ title: "Payment failed", variant: "destructive" });
        }
      },
      onclose: () => {
        setLoading(null);
      },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="font-heading text-3xl font-bold text-primary-foreground">
            Skill<span className="text-accent">2</span>Cash
          </h1>
          <p className="mt-2 text-primary-foreground/70">Complete your membership</p>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="text-center">
            <Badge className="mx-auto mb-2 bg-accent text-accent-foreground w-fit">{tier.name}</Badge>
            <CardTitle className="font-heading text-3xl">{tier.priceLabel}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ul className="space-y-3">
              {tier.benefits.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-card-foreground">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  {b}
                </li>
              ))}
            </ul>

            <div className="space-y-3 pt-4">
              <Button
                className="w-full bg-[hsl(160_60%_40%)] hover:bg-[hsl(160_60%_35%)] text-accent-foreground"
                size="lg"
                onClick={handlePaystack}
                disabled={!!loading}
              >
                {loading === "paystack" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 h-4 w-4" />
                )}
                Pay with Paystack
              </Button>
              <Button
                className="w-full bg-[hsl(30_90%_55%)] hover:bg-[hsl(30_90%_48%)] text-accent-foreground"
                size="lg"
                onClick={handleFlutterwave}
                disabled={!!loading}
              >
                {loading === "flutterwave" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 h-4 w-4" />
                )}
                Pay with Flutterwave
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MembershipCheckout;
