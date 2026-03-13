import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  BarChart3, BookOpen, Copy, DollarSign, ExternalLink, Link2,
  Loader2, MessageSquare, MousePointerClick, TrendingUp, Wallet,
} from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";

interface AffiliateAccount {
  id: string;
  user_id: string;
  referral_code: string;
  commission_percent: number;
  total_clicks: number;
  total_conversions: number;
  total_earned: number;
}

interface AffiliateCourse {
  id: string;
  title: string;
  thumbnail_url: string | null;
  slug: string;
  display_price: number;
}

interface AffiliateLink {
  id: string;
  unique_link_code: string;
  clicks: number;
  conversions: number;
  earned: number;
  courses: { id: string; title: string; thumbnail_url: string | null; slug: string };
}

interface AffiliatePayment {
  paid_at: string;
  amount: number;
  status: string;
  course_title: string;
}

interface WithdrawalRequest {
  created_at: string;
  amount: number;
  bank_name: string;
  account_number: string;
  status: string;
}

const BASE_URL = "https://skill2cashacademy.lovable.app";

const AffiliateDashboard = () => {
  const { user } = useAuth();
  const [account, setAccount] = useState<AffiliateAccount | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);

  // Courses tab
  const [courses, setCourses] = useState<AffiliateCourse[]>([]);
  const [linkedCourseIds, setLinkedCourseIds] = useState<Map<string, string>>(new Map());
  const [coursesLoading, setCoursesLoading] = useState(true);

  // Links tab
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);

  // Earnings tab
  const [payments, setPayments] = useState<AffiliatePayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);

  // Withdrawal tab
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(true);
  const [withdrawForm, setWithdrawForm] = useState({
    amount: "", bank_name: "", account_number: "", account_name: "",
  });
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [availableBalance, setAvailableBalance] = useState(0);

  useEffect(() => {
    if (user) initAccount();
  }, [user]);

  const initAccount = async () => {
    setAccountLoading(true);
    let { data: acc } = await supabase
      .from("affiliate_accounts")
      .select("*")
      .eq("user_id", user!.id)
      .single();

    if (!acc) {
      // Auto-create affiliate account
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user!.id)
        .single();

      const cleanName = (profile?.full_name || "USER")
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 8)
        .toUpperCase();
      const suffix = Math.floor(1000 + Math.random() * 9000).toString();
      const referralCode = cleanName + suffix;

      const { data: setting } = await supabase
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_key", "default_affiliate_commission")
        .single();
      const commission = parseFloat(setting?.setting_value || "10") || 10;

      const { data: newAccount } = await supabase
        .from("affiliate_accounts")
        .insert({
          user_id: user!.id,
          referral_code: referralCode,
          commission_percent: commission,
        })
        .select()
        .single();

      acc = newAccount;
    }

    setAccount(acc as AffiliateAccount);
    setAccountLoading(false);

    if (acc) {
      fetchCourses(acc as AffiliateAccount);
      fetchLinks(acc as AffiliateAccount);
      fetchPayments(acc as AffiliateAccount);
      fetchWithdrawals();
    }
  };

  const fetchCourses = async (acc: AffiliateAccount) => {
    setCoursesLoading(true);

    const { data: directCourses } = await supabase
      .from("courses")
      .select("id, title, thumbnail_url, slug, price")
      .eq("is_affiliate_enabled", true)
      .eq("status", "published");

    const { data: coOwnerCourses } = await supabase
      .from("co_owner_course_prices")
      .select("course_id, custom_price, courses(id, title, thumbnail_url, slug, price)")
      .eq("is_affiliate_enabled", true);

    const courseMap = new Map<string, AffiliateCourse>();
    directCourses?.forEach((c: any) =>
      courseMap.set(c.id, { ...c, display_price: c.price })
    );
    coOwnerCourses?.forEach((cp: any) => {
      const c = cp.courses;
      if (c && !courseMap.has(c.id)) {
        courseMap.set(c.id, { ...c, display_price: cp.custom_price || c.price });
      }
    });
    setCourses(Array.from(courseMap.values()));

    // Existing links
    const { data: existingLinks } = await supabase
      .from("affiliate_course_links")
      .select("course_id, unique_link_code")
      .eq("affiliate_id", acc.id);

    const linkMap = new Map<string, string>();
    existingLinks?.forEach((l: any) => linkMap.set(l.course_id, l.unique_link_code));
    setLinkedCourseIds(linkMap);
    setCoursesLoading(false);
  };

  const fetchLinks = async (acc: AffiliateAccount) => {
    setLinksLoading(true);
    const { data } = await supabase
      .from("affiliate_course_links")
      .select("id, unique_link_code, clicks, conversions, earned, courses(id, title, thumbnail_url, slug)")
      .eq("affiliate_id", acc.id)
      .order("created_at", { ascending: false });
    setLinks((data as any[]) || []);
    setLinksLoading(false);
  };

  const fetchPayments = async (acc: AffiliateAccount) => {
    setPaymentsLoading(true);
    const { data } = await supabase
      .from("payments")
      .select("paid_at, amount, status, courses(title)")
      .eq("affiliate_account_id", acc.id)
      .order("paid_at", { ascending: false });

    setPayments(
      (data || []).map((p: any) => ({
        paid_at: p.paid_at,
        amount: p.amount,
        status: p.status,
        course_title: p.courses?.title || "—",
      }))
    );
    setPaymentsLoading(false);
  };

  const fetchWithdrawals = async () => {
    setWithdrawalsLoading(true);
    const { data } = await supabase
      .from("withdrawal_requests")
      .select("created_at, amount, bank_name, account_number, status")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    setWithdrawals((data as WithdrawalRequest[]) || []);

    const lockedAmount = (data || [])
      .filter((r: any) => ["pending", "approved"].includes(r.status))
      .reduce((sum: number, r: any) => sum + Number(r.amount), 0);

    setAvailableBalance(Number(account?.total_earned || 0) - lockedAmount);
    setWithdrawalsLoading(false);
  };

  // Recalculate available balance when account changes
  useEffect(() => {
    if (account && withdrawals.length >= 0) {
      const lockedAmount = withdrawals
        .filter((r) => ["pending", "approved"].includes(r.status))
        .reduce((sum, r) => sum + Number(r.amount), 0);
      setAvailableBalance(Number(account.total_earned) - lockedAmount);
    }
  }, [account, withdrawals]);

  const generateLink = async (course: AffiliateCourse) => {
    if (!account) return;
    const linkCode = account.referral_code + "-" + course.slug;

    const { data: newLink } = await supabase
      .from("affiliate_course_links")
      .insert({
        affiliate_id: account.id,
        course_id: course.id,
        unique_link_code: linkCode,
      })
      .select()
      .single();

    if (newLink) {
      const shareUrl = `${BASE_URL}/courses/${course.slug}?ref=${linkCode}`;
      navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link copied! Share it to start earning." });
      setLinkedCourseIds(new Map(linkedCourseIds.set(course.id, linkCode)));
    }
  };

  const copyLink = (slug: string, linkCode: string) => {
    const url = `${BASE_URL}/courses/${slug}?ref=${linkCode}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Copied!" });
  };

  const shareWhatsApp = (title: string, slug: string, linkCode: string) => {
    const url = `${BASE_URL}/courses/${slug}?ref=${linkCode}`;
    const message = encodeURIComponent(`I found a great course for you: ${title}. Check it out here: ${url}`);
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  const submitWithdrawal = async () => {
    const amount = parseFloat(withdrawForm.amount);
    if (!amount || amount < 100) {
      toast({ title: "Minimum withdrawal is ₦100", variant: "destructive" });
      return;
    }
    if (amount > availableBalance) {
      toast({ title: `Amount exceeds your available balance of ₦${availableBalance.toLocaleString()}`, variant: "destructive" });
      return;
    }
    if (!/^\d{10}$/.test(withdrawForm.account_number)) {
      toast({ title: "Account number must be exactly 10 digits", variant: "destructive" });
      return;
    }
    if (!withdrawForm.bank_name.trim() || !withdrawForm.account_name.trim()) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }

    setWithdrawSubmitting(true);
    const { error } = await supabase.from("withdrawal_requests").insert({
      user_id: user!.id,
      amount,
      bank_name: withdrawForm.bank_name.trim(),
      account_number: withdrawForm.account_number.trim(),
      account_name: withdrawForm.account_name.trim(),
      status: "pending",
    });
    setWithdrawSubmitting(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Withdrawal request submitted. Admin will process within 2-3 business days." });
      setWithdrawForm({ amount: "", bank_name: "", account_number: "", account_name: "" });
      fetchWithdrawals();
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "completed": return "bg-green-500/10 text-green-700 border-green-200";
      case "pending": return "bg-amber-500/10 text-amber-700 border-amber-200";
      case "approved": return "bg-green-500/10 text-green-700 border-green-200";
      case "rejected": case "failed": return "bg-red-500/10 text-red-700 border-red-200";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (accountLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  const referralLink = `${BASE_URL}?ref=${account?.referral_code}`;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container py-8">
        <h1 className="font-heading text-3xl font-bold mb-6">Affiliate Dashboard 🤝</h1>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="overview" className="gap-1"><BarChart3 className="h-4 w-4 hidden sm:block" /> Overview</TabsTrigger>
            <TabsTrigger value="courses" className="gap-1"><BookOpen className="h-4 w-4 hidden sm:block" /> Courses</TabsTrigger>
            <TabsTrigger value="links" className="gap-1"><Link2 className="h-4 w-4 hidden sm:block" /> My Links</TabsTrigger>
            <TabsTrigger value="marketing" className="gap-1"><MessageSquare className="h-4 w-4 hidden sm:block" /> Marketing</TabsTrigger>
            <TabsTrigger value="earnings" className="gap-1"><DollarSign className="h-4 w-4 hidden sm:block" /> Earnings</TabsTrigger>
            <TabsTrigger value="withdrawal" className="gap-1"><Wallet className="h-4 w-4 hidden sm:block" /> Withdrawal</TabsTrigger>
          </TabsList>

          {/* ── OVERVIEW ── */}
          <TabsContent value="overview">
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className="rounded-full bg-accent/10 p-3"><MousePointerClick className="h-5 w-5 text-accent" /></div>
                    <div><p className="text-sm text-muted-foreground">Total Clicks</p><p className="font-heading text-2xl font-bold">{account?.total_clicks || 0}</p></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className="rounded-full bg-accent/10 p-3"><TrendingUp className="h-5 w-5 text-accent" /></div>
                    <div><p className="text-sm text-muted-foreground">Conversions</p><p className="font-heading text-2xl font-bold">{account?.total_conversions || 0}</p></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className="rounded-full bg-accent/10 p-3"><DollarSign className="h-5 w-5 text-accent" /></div>
                    <div><p className="text-sm text-muted-foreground">Total Earned</p><p className="font-heading text-2xl font-bold">₦{(account?.total_earned || 0).toLocaleString()}</p></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className="rounded-full bg-accent/10 p-3"><BarChart3 className="h-5 w-5 text-accent" /></div>
                    <div>
                      <p className="text-sm text-muted-foreground">Conversion Rate</p>
                      <p className="font-heading text-2xl font-bold">
                        {account && account.total_clicks > 0
                          ? ((account.total_conversions / account.total_clicks) * 100).toFixed(1)
                          : "0"}%
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-accent/30">
                <CardContent className="p-6 space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Your Referral Code</p>
                  <div className="flex items-center gap-3">
                    <code className="rounded-md bg-muted px-4 py-2 font-mono text-lg font-bold">{account?.referral_code}</code>
                    <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(account?.referral_code || ""); toast({ title: "Code copied!" }); }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2 items-center mt-2">
                    <Input value={referralLink} readOnly className="font-mono text-sm" />
                    <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(referralLink); toast({ title: "Link copied!" }); }}>
                      <Copy className="mr-1 h-4 w-4" /> Copy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── AFFILIATE COURSES ── */}
          <TabsContent value="courses">
            <Card>
              <CardHeader>
                <CardTitle>Affiliate Courses</CardTitle>
                <CardDescription>Courses you can promote and earn commissions on</CardDescription>
              </CardHeader>
              <CardContent>
                {coursesLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
                ) : courses.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No affiliate courses available yet.</p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {courses.map((c) => {
                      const linkCode = linkedCourseIds.get(c.id);
                      return (
                        <Card key={c.id} className="overflow-hidden">
                          <div className="h-[200px] bg-muted">
                            {c.thumbnail_url ? (
                              <img src={c.thumbnail_url} alt={c.title} className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                              <div className="flex h-full items-center justify-center"><BookOpen className="h-10 w-10 text-muted-foreground/30" /></div>
                            )}
                          </div>
                          <CardContent className="p-4 space-y-3">
                            <h3 className="font-heading font-semibold line-clamp-2">{c.title}</h3>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-accent">₦{c.display_price?.toLocaleString()}</span>
                              <Badge variant="secondary" className="text-xs">Commission: {account?.commission_percent}%</Badge>
                            </div>
                            {linkCode ? (
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="flex-1" onClick={() => copyLink(c.slug, linkCode)}>
                                  <Copy className="mr-1 h-3 w-3" /> Copy Link
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => shareWhatsApp(c.title, c.slug, linkCode)}>
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button size="sm" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => generateLink(c)}>
                                <Link2 className="mr-1 h-3 w-3" /> Get Affiliate Link
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── MY LINKS ── */}
          <TabsContent value="links">
            <Card>
              <CardHeader>
                <CardTitle>My Affiliate Links</CardTitle>
                <CardDescription>Track performance of your generated links</CardDescription>
              </CardHeader>
              <CardContent>
                {linksLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
                ) : links.length === 0 ? (
                  <div className="text-center py-12 space-y-4">
                    <p className="text-muted-foreground">You haven't generated any affiliate links yet.</p>
                    <p className="text-sm text-muted-foreground">Go to Affiliate Courses to get started.</p>
                  </div>
                ) : (
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Course</TableHead>
                          <TableHead>Link</TableHead>
                          <TableHead className="text-center">Clicks</TableHead>
                          <TableHead className="text-center">Conversions</TableHead>
                          <TableHead className="text-right">Earned</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {links.map((l) => {
                          const fullUrl = `${BASE_URL}/courses/${l.courses.slug}?ref=${l.unique_link_code}`;
                          return (
                            <TableRow key={l.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {l.courses.thumbnail_url && (
                                    <img src={l.courses.thumbnail_url} alt="" className="h-10 w-10 rounded object-cover" />
                                  )}
                                  <span className="font-medium line-clamp-1">{l.courses.title}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-mono text-xs text-muted-foreground line-clamp-1 max-w-[200px] block" title={fullUrl}>
                                  {fullUrl.substring(0, 40)}...
                                </span>
                              </TableCell>
                              <TableCell className="text-center">{l.clicks}</TableCell>
                              <TableCell className="text-center">{l.conversions}</TableCell>
                              <TableCell className="text-right font-medium">₦{(l.earned || 0).toLocaleString()}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="ghost" onClick={() => copyLink(l.courses.slug, l.unique_link_code)}>
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => shareWhatsApp(l.courses.title, l.courses.slug, l.unique_link_code)}>
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── MARKETING MATERIALS ── */}
          <TabsContent value="marketing">
            <div className="space-y-6">
              <Card className="border-accent/30">
                <CardContent className="p-6 text-center">
                  <p className="text-lg font-heading font-bold">You earn <span className="text-accent">{account?.commission_percent}%</span> commission on every sale</p>
                </CardContent>
              </Card>

              {[
                {
                  title: "WhatsApp / SMS",
                  text: `🎯 Want to earn money from your skills?\nSkill2Cash Academy teaches you exactly how.\nI'm already earning ${account?.commission_percent}% commission recommending it.\nJoin here: ${referralLink} 💪`,
                },
                {
                  title: "Twitter / X",
                  text: `Just discovered Skill2Cash Academy — changing the game for digital earners in Nigeria. Learn in-demand skills, start monetising fast. Sign up: ${referralLink}`,
                },
                {
                  title: "Email / Personal message",
                  text: `Hi, I wanted to share Skill2Cash Academy with you. It's a platform where you can learn digital skills and start earning online. I earn ${account?.commission_percent}% every time someone joins through my link. Check it out: ${referralLink}`,
                },
              ].map((t) => (
                <Card key={t.title}>
                  <CardHeader><CardTitle className="text-base">{t.title}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <pre className="whitespace-pre-wrap text-sm text-muted-foreground bg-muted rounded-md p-4">{t.text}</pre>
                    <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(t.text); toast({ title: "Copied!" }); }}>
                      <Copy className="mr-1 h-4 w-4" /> Copy
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── EARNINGS ── */}
          <TabsContent value="earnings">
            <div className="space-y-6">
              <Card className="border-accent/30">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="rounded-full bg-accent/10 p-3"><DollarSign className="h-6 w-6 text-accent" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Earned</p>
                    <p className="font-heading text-3xl font-bold">₦{(account?.total_earned || 0).toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
                <CardContent>
                  {paymentsLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
                  ) : payments.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No earnings yet. Share your affiliate links to start earning commissions.</p>
                  ) : (
                    <div className="overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Course</TableHead>
                            <TableHead className="text-right">Sale Amount</TableHead>
                            <TableHead className="text-right">My Commission</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments.map((p, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-muted-foreground">
                                {new Date(p.paid_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                              </TableCell>
                              <TableCell>{p.course_title}</TableCell>
                              <TableCell className="text-right">₦{p.amount.toLocaleString()}</TableCell>
                              <TableCell className="text-right font-medium">
                                ₦{Math.round(p.amount * (account?.commission_percent || 10) / 100).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={statusColor(p.status)}>{p.status}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── WITHDRAWAL ── */}
          <TabsContent value="withdrawal">
            <div className="space-y-6">
              <Card className="border-accent/30">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Available Balance</p>
                  <p className="font-heading text-3xl font-bold">₦{availableBalance.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total Earned: ₦{(account?.total_earned || 0).toLocaleString()} · Locked: ₦{((account?.total_earned || 0) - availableBalance).toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              {availableBalance > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Request Withdrawal</CardTitle>
                    <CardDescription>Minimum withdrawal: ₦100</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Amount (₦)</Label>
                        <Input type="number" min={100} max={availableBalance} placeholder="1000"
                          value={withdrawForm.amount} onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Bank Name</Label>
                        <Input placeholder="e.g. First Bank, GTBank, Opay"
                          value={withdrawForm.bank_name} onChange={(e) => setWithdrawForm({ ...withdrawForm, bank_name: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Account Number</Label>
                        <Input placeholder="0123456789" maxLength={10}
                          value={withdrawForm.account_number} onChange={(e) => setWithdrawForm({ ...withdrawForm, account_number: e.target.value.replace(/\D/g, "") })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Account Name</Label>
                        <Input placeholder="Name on your bank account"
                          value={withdrawForm.account_name} onChange={(e) => setWithdrawForm({ ...withdrawForm, account_name: e.target.value })} />
                      </div>
                    </div>
                    <Button onClick={submitWithdrawal} disabled={withdrawSubmitting} className="bg-accent text-accent-foreground hover:bg-accent/90">
                      {withdrawSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                      Submit Withdrawal Request
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No balance available for withdrawal yet.
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader><CardTitle>Previous Requests</CardTitle></CardHeader>
                <CardContent>
                  {withdrawalsLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
                  ) : withdrawals.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No withdrawal requests yet.</p>
                  ) : (
                    <div className="overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Bank</TableHead>
                            <TableHead>Account</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {withdrawals.map((w, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-muted-foreground">
                                {new Date(w.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                              </TableCell>
                              <TableCell className="text-right font-medium">₦{Number(w.amount).toLocaleString()}</TableCell>
                              <TableCell>{w.bank_name}</TableCell>
                              <TableCell className="font-mono text-sm">{w.account_number}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={statusColor(w.status)}>{w.status}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AffiliateDashboard;
