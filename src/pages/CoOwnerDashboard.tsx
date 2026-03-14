import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import {
  Store, BookOpen, Users, DollarSign, Copy, Save, Loader2,
  BarChart3, Tag, Settings, Lock, Trash2, Upload,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "@/components/DashboardHeader";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// ── types ──
interface StoreRecord {
  id?: string;
  owner_id: string;
  store_slug: string;
  logo_url: string;
  banner_url: string;
  bio: string;
  brand_color: string;
}

interface PlatformCourse {
  id: string;
  title: string;
  thumbnail_url: string | null;
  price: number;
  level: string;
  category: string;
}

interface PriceConfig {
  custom_price: number | null;
  is_affiliate_enabled: boolean;
}

interface StudentRow {
  student_id: string;
  course_id: string;
  full_name: string;
  email: string;
  course_title: string;
  enrolled_at: string;
  progress: number;
  amountPaid: number | null;
}

interface CouponRow {
  id: string;
  code: string;
  discount_percent: number;
  expiry_date: string;
  max_uses: number;
  used_count: number;
}

const getCouponStatus = (expiry: string, used: number, max: number) => {
  if (new Date(expiry) < new Date()) return "expired";
  if (used >= max) return "exhausted";
  return "active";
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  expired: "bg-muted text-muted-foreground",
  exhausted: "bg-yellow-100 text-yellow-800",
};

const CoOwnerDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  // ── Store ──
  const [store, setStore] = useState<StoreRecord>({
    owner_id: "", store_slug: "", logo_url: "", banner_url: "", bio: "", brand_color: "#1A1A2E",
  });
  const [storeSaving, setStoreSaving] = useState(false);
  const [storeLoading, setStoreLoading] = useState(true);
  const [slugError, setSlugError] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);

  // ── Catalogue ──
  const [courses, setCourses] = useState<PlatformCourse[]>([]);
  const [priceMap, setPriceMap] = useState<Map<string, PriceConfig>>(new Map());
  const [customPrices, setCustomPrices] = useState<Map<string, string>>(new Map());
  const [affToggles, setAffToggles] = useState<Map<string, boolean>>(new Map());
  const [savingCourse, setSavingCourse] = useState<string | null>(null);

  // ── Students ──
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);

  // ── Earnings ──
  const [totalEarned, setTotalEarned] = useState(0);
  const [monthlyEarned, setMonthlyEarned] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);

  // ── Analytics ──
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [enrollmentData, setEnrollmentData] = useState<any[]>([]);
  const [topCourses, setTopCourses] = useState<any[]>([]);

  // ── Promotions ──
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [discountPct, setDiscountPct] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [couponSaving, setCouponSaving] = useState(false);
  const [codeError, setCodeError] = useState("");

  // ── Settings ──
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchStore();
    fetchCatalogue();
    fetchStudents();
    fetchEarnings();
    fetchAnalytics();
    fetchCoupons();
  }, [user]);

  // ── STORE ──
  const fetchStore = async () => {
    const { data } = await supabase.from("co_owner_stores").select("*").eq("owner_id", user!.id).maybeSingle();
    if (data) setStore(data as any);
    else setStore((s) => ({ ...s, owner_id: user!.id }));
    setStoreLoading(false);
  };

  const validateSlug = async (slug: string) => {
    if (!slug) { setSlugError(""); return; }
    const { data: existing } = await supabase
      .from("co_owner_stores").select("id").eq("store_slug", slug).neq("owner_id", user!.id).maybeSingle();
    setSlugError(existing ? "This store slug is taken." : "");
  };

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split(".").pop();
    const path = `stores/${user!.id}/${folder}.${ext}`;
    await supabase.storage.from("thumbnails").upload(path, file, { upsert: true });
    const { data } = supabase.storage.from("thumbnails").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    const url = await uploadFile(file, "logo");
    setStore((s) => ({ ...s, logo_url: url }));
    setLogoUploading(false);
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerUploading(true);
    const url = await uploadFile(file, "banner");
    setStore((s) => ({ ...s, banner_url: url }));
    setBannerUploading(false);
  };

  const saveStore = async () => {
    if (slugError) return;
    setStoreSaving(true);
    const { error } = await supabase.from("co_owner_stores").upsert({
      owner_id: user!.id,
      store_slug: store.store_slug,
      logo_url: store.logo_url,
      banner_url: store.banner_url,
      bio: store.bio,
      brand_color: store.brand_color,
    }, { onConflict: "owner_id" });
    setStoreSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Store updated." }); fetchStore(); }
  };

  // ── CATALOGUE ──
  const fetchCatalogue = async () => {
    const { data: platformCourses } = await supabase
      .from("courses").select("id, title, thumbnail_url, price, category, level")
      .eq("is_platform_course", true).eq("status", "published")
      .order("created_at", { ascending: false });
    setCourses((platformCourses as PlatformCourse[]) || []);

    const { data: myPrices } = await supabase
      .from("co_owner_course_prices").select("course_id, custom_price, is_affiliate_enabled").eq("co_owner_id", user!.id);
    const pm = new Map<string, PriceConfig>();
    const cp = new Map<string, string>();
    const at = new Map<string, boolean>();
    myPrices?.forEach((p: any) => {
      pm.set(p.course_id, p);
      cp.set(p.course_id, p.custom_price?.toString() || "");
      at.set(p.course_id, p.is_affiliate_enabled || false);
    });
    setPriceMap(pm);
    setCustomPrices(cp);
    setAffToggles(at);
  };

  const saveCoursePrice = async (courseId: string, defaultPrice: number) => {
    setSavingCourse(courseId);
    const cp = customPrices.get(courseId) || "";
    await supabase.from("co_owner_course_prices").upsert({
      co_owner_id: user!.id,
      course_id: courseId,
      custom_price: Number(cp) || defaultPrice,
      is_affiliate_enabled: affToggles.get(courseId) || false,
    }, { onConflict: "co_owner_id,course_id" });
    setSavingCourse(null);
    toast({ title: "Saved." });
  };

  // ── STUDENTS ──
  const fetchStudents = async () => {
    const { data } = await supabase
      .from("enrollments")
      .select("enrolled_at, student_id, course_id, profiles(full_name, email), courses(title)")
      .eq("co_owner_id", user!.id)
      .order("enrolled_at", { ascending: false });

    const { data: paymentData } = await supabase
      .from("payments").select("payer_id, course_id, amount")
      .eq("co_owner_id", user!.id).eq("status", "completed");
    const payMap = new Map((paymentData || []).map((p: any) => [`${p.payer_id}${p.course_id}`, Number(p.amount)]));

    const rows: StudentRow[] = [];
    for (const e of (data || []) as any[]) {
      const { count: totalCount } = await supabase.from("lessons_view").select("id", { count: "exact", head: true }).eq("course_id", e.course_id);
      const lessonIds = (await supabase.from("lessons_view").select("id").eq("course_id", e.course_id)).data?.map((l: any) => l.id) || [];
      let completedCount = 0;
      if (lessonIds.length > 0) {
        const { count } = await supabase.from("lesson_progress").select("id", { count: "exact", head: true })
          .eq("student_id", e.student_id).eq("completed", true).in("lesson_id", lessonIds);
        completedCount = count || 0;
      }
      rows.push({
        student_id: e.student_id,
        course_id: e.course_id,
        full_name: e.profiles?.full_name || "—",
        email: e.profiles?.email || "—",
        course_title: e.courses?.title || "—",
        enrolled_at: e.enrolled_at,
        progress: (totalCount || 0) > 0 ? Math.round((completedCount / (totalCount || 1)) * 100) : 0,
        amountPaid: payMap.get(`${e.student_id}${e.course_id}`) || null,
      });
    }
    setStudents(rows);
    setStudentsLoading(false);
  };

  // ── EARNINGS ──
  const fetchEarnings = async () => {
    const { data: total } = await supabase.from("payments").select("amount").eq("co_owner_id", user!.id).eq("status", "completed");
    setTotalEarned(total?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0);

    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const { data: monthly } = await supabase.from("payments").select("amount").eq("co_owner_id", user!.id).eq("status", "completed").gte("paid_at", startOfMonth.toISOString());
    setMonthlyEarned(monthly?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0);

    const { count } = await supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("co_owner_id", user!.id);
    setStudentCount(count || 0);

    const { data: txns } = await supabase
      .from("payments").select("paid_at, amount, gateway, status, payer_id, course_id, profiles(full_name), courses(title)")
      .eq("co_owner_id", user!.id).order("paid_at", { ascending: false });
    setTransactions(txns || []);
  };

  // ── ANALYTICS ──
  const fetchAnalytics = async () => {
    const { data: payments } = await supabase.from("payments").select("paid_at, amount").eq("co_owner_id", user!.id).eq("status", "completed");
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      months.push(d.toLocaleString("default", { month: "short", year: "2-digit" }));
    }
    const revMap = new Map<string, number>();
    payments?.forEach((p: any) => {
      const d = new Date(p.paid_at);
      const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
      revMap.set(key, (revMap.get(key) || 0) + Number(p.amount));
    });
    setRevenueData(months.map((m) => ({ month: m, revenue: revMap.get(m) || 0 })));

    const { data: enrollments } = await supabase.from("enrollments").select("course_id, courses(title)").eq("co_owner_id", user!.id);
    const countMap = new Map<string, { title: string; count: number }>();
    enrollments?.forEach((e: any) => {
      const t = e.courses?.title || "Unknown";
      const prev = countMap.get(e.course_id) || { title: t, count: 0 };
      countMap.set(e.course_id, { title: t, count: prev.count + 1 });
    });
    const enrollArr = Array.from(countMap.values()).sort((a, b) => b.count - a.count);
    setEnrollmentData(enrollArr);
    setTopCourses(enrollArr.slice(0, 3));
  };

  // ── COUPONS ──
  const fetchCoupons = async () => {
    const { data } = await supabase.from("coupons").select("id, code, discount_percent, expiry_date, max_uses, used_count, created_at")
      .eq("owner_id", user!.id).order("created_at", { ascending: false });
    setCoupons((data as CouponRow[]) || []);
  };

  const createCoupon = async () => {
    const code = couponCode.toUpperCase();
    if (!/^[A-Z0-9]+$/.test(code) || code.length < 4) { setCodeError("Min 4 chars, letters & numbers only"); return; }
    if (!discountPct || Number(discountPct) < 1 || Number(discountPct) > 100) { toast({ title: "Discount must be 1-100%", variant: "destructive" }); return; }
    if (!expiryDate || new Date(expiryDate) <= new Date()) { toast({ title: "Expiry must be a future date", variant: "destructive" }); return; }
    setCouponSaving(true);
    const { error } = await supabase.from("coupons").insert({
      owner_id: user!.id, code, discount_percent: Number(discountPct),
      expiry_date: expiryDate, max_uses: Number(maxUses) || 1,
    });
    setCouponSaving(false);
    if (error?.code === "23505") toast({ title: "This coupon code already exists.", variant: "destructive" });
    else if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Coupon created." }); setCouponCode(""); setDiscountPct(""); setExpiryDate(""); setMaxUses(""); fetchCoupons(); }
  };

  const deleteCoupon = async (id: string) => {
    await supabase.from("coupons").delete().eq("id", id).eq("owner_id", user!.id);
    setCoupons((prev) => prev.filter((c) => c.id !== id));
    toast({ title: "Coupon deleted." });
  };

  // ── SETTINGS ──
  const changePassword = async () => {
    if (newPassword.length < 8) { toast({ title: "Min 8 characters", variant: "destructive" }); return; }
    if (newPassword !== confirmPassword) { toast({ title: "Passwords don't match", variant: "destructive" }); return; }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Password updated." }); setNewPassword(""); setConfirmPassword(""); }
  };

  const deleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    await supabase.from("co_owner_stores").delete().eq("owner_id", user!.id);
    await signOut();
    navigate("/");
    toast({ title: "Account deactivated. Contact support to complete deletion." });
  };

  const storeUrl = `${window.location.origin}/store/${store.store_slug}`;
  const copyLink = () => { navigator.clipboard.writeText(storeUrl); toast({ title: "Link copied!" }); };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container py-8">
        <h1 className="font-heading text-3xl font-bold mb-6">Welcome, {profile?.full_name || "Co-Owner"}! 🏪</h1>

        <Tabs defaultValue="store" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 lg:w-auto lg:inline-grid">
            <TabsTrigger value="store" className="gap-1"><Store className="h-4 w-4 hidden sm:block" /> My Store</TabsTrigger>
            <TabsTrigger value="catalogue" className="gap-1"><BookOpen className="h-4 w-4 hidden sm:block" /> Catalogue</TabsTrigger>
            <TabsTrigger value="students" className="gap-1"><Users className="h-4 w-4 hidden sm:block" /> Students</TabsTrigger>
            <TabsTrigger value="earnings" className="gap-1"><DollarSign className="h-4 w-4 hidden sm:block" /> Earnings</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1"><BarChart3 className="h-4 w-4 hidden sm:block" /> Analytics</TabsTrigger>
            <TabsTrigger value="promotions" className="gap-1"><Tag className="h-4 w-4 hidden sm:block" /> Promotions</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1"><Settings className="h-4 w-4 hidden sm:block" /> Settings</TabsTrigger>
          </TabsList>

          {/* ── MY STORE ── */}
          <TabsContent value="store">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Store Settings</CardTitle><CardDescription>Customize your co-branded storefront</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  {storeLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div> : (
                    <>
                      <div className="space-y-2">
                        <Label>Store Slug</Label>
                        <Input
                          placeholder="my-store"
                          value={store.store_slug}
                          onChange={(e) => {
                            const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                            setStore({ ...store, store_slug: v });
                          }}
                          onBlur={() => validateSlug(store.store_slug)}
                        />
                        {slugError && <p className="text-sm text-destructive">{slugError}</p>}
                        <p className="text-xs text-muted-foreground">URL: {storeUrl}</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Logo</Label>
                        <div className="flex items-center gap-4">
                          {store.logo_url && <img src={store.logo_url} alt="Logo" className="h-20 w-20 rounded-full object-cover border" />}
                          <Label className="cursor-pointer text-accent text-sm hover:underline">
                            {logoUploading ? "Uploading..." : "Upload Logo"}
                            <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                          </Label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Banner</Label>
                        {store.banner_url && <img src={store.banner_url} alt="Banner" className="w-full h-28 object-cover rounded-lg" />}
                        <Label className="cursor-pointer text-accent text-sm hover:underline">
                          {bannerUploading ? "Uploading..." : "Upload Banner"}
                          <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
                        </Label>
                      </div>
                      <div className="space-y-2">
                        <Label>Brand Color</Label>
                        <div className="flex gap-2">
                          <Input type="color" value={store.brand_color} onChange={(e) => setStore({ ...store, brand_color: e.target.value })} className="h-10 w-16 p-1" />
                          <Input value={store.brand_color} onChange={(e) => setStore({ ...store, brand_color: e.target.value })} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Bio</Label>
                        <Textarea value={store.bio} onChange={(e) => setStore({ ...store, bio: e.target.value })} rows={4} />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={saveStore} disabled={storeSaving || !!slugError} className="bg-accent text-accent-foreground hover:bg-accent/90">
                          {storeSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Store
                        </Button>
                        <Button variant="outline" onClick={copyLink}><Copy className="mr-2 h-4 w-4" /> Copy Link</Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
              {/* Preview */}
              <Card>
                <CardHeader><CardTitle>Store Preview</CardTitle></CardHeader>
                <CardContent>
                  <div className="rounded-lg overflow-hidden border" style={{ backgroundColor: `${store.brand_color}10` }}>
                    {store.banner_url && <img src={store.banner_url} alt="Banner" className="w-full h-36 object-cover" />}
                    <div className="p-6 text-center">
                      {store.logo_url && <img src={store.logo_url} alt="Logo" className="h-16 w-16 rounded-full mx-auto border-2 -mt-14 relative z-10 bg-card object-cover" />}
                      <h3 className="font-heading text-lg font-bold mt-2">{profile?.full_name || "Your Store"}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{store.bio || "Your bio here..."}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── CATALOGUE ── */}
          <TabsContent value="catalogue">
            <Card>
              <CardHeader><CardTitle>Course Catalogue</CardTitle><CardDescription>Set your custom prices for platform courses</CardDescription></CardHeader>
              <CardContent>
                {courses.length === 0 ? <p className="text-muted-foreground text-center py-8">No courses available yet.</p> : (
                  <div className="space-y-4">
                    {courses.map((c) => (
                      <div key={c.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-lg">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {c.thumbnail_url ? <img src={c.thumbnail_url} alt="" className="h-14 w-20 rounded object-cover shrink-0" /> : <div className="h-14 w-20 rounded bg-muted flex items-center justify-center shrink-0"><BookOpen className="h-6 w-6 text-muted-foreground/30" /></div>}
                          <div className="min-w-0">
                            <p className="font-medium truncate">{c.title}</p>
                            <p className="text-xs text-muted-foreground">{c.category} · {c.level}</p>
                            <p className="text-sm text-muted-foreground">Original: ₦{c.price?.toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="space-y-1">
                            <Label className="text-xs">Custom Price</Label>
                            <Input className="w-28" placeholder={`e.g. ${c.price}`}
                              value={customPrices.get(c.id) || ""}
                              onChange={(e) => setCustomPrices(new Map(customPrices.set(c.id, e.target.value)))} />
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch checked={affToggles.get(c.id) || false}
                              onCheckedChange={(v) => setAffToggles(new Map(affToggles.set(c.id, v)))} />
                            <Label className="text-xs">Affiliate</Label>
                          </div>
                          <Button size="sm" onClick={() => saveCoursePrice(c.id, c.price)} disabled={savingCourse === c.id} className="bg-accent text-accent-foreground hover:bg-accent/90">
                            {savingCourse === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── STUDENTS ── */}
          <TabsContent value="students">
            <Card>
              <CardHeader><CardTitle>My Students</CardTitle></CardHeader>
              <CardContent>
                {studentsLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div> : students.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No students enrolled yet.</p>
                ) : (
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Student</TableHead><TableHead>Email</TableHead><TableHead>Course</TableHead><TableHead>Enrolled</TableHead><TableHead>Progress</TableHead><TableHead className="text-right">Paid</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {students.map((s, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{s.full_name}</TableCell>
                            <TableCell>{s.email}</TableCell>
                            <TableCell>{s.course_title}</TableCell>
                            <TableCell>{new Date(s.enrolled_at).toLocaleDateString()}</TableCell>
                            <TableCell><div className="flex items-center gap-2"><Progress value={s.progress} className="h-2 w-20" /><span className="text-xs">{s.progress}%</span></div></TableCell>
                            <TableCell className="text-right">{s.amountPaid != null ? `₦${s.amountPaid.toLocaleString()}` : "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── EARNINGS ── */}
          <TabsContent value="earnings">
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Total Earned", value: `₦${totalEarned.toLocaleString()}`, icon: DollarSign },
                  { label: "This Month", value: `₦${monthlyEarned.toLocaleString()}`, icon: DollarSign },
                  { label: "Total Students", value: studentCount.toString(), icon: Users },
                ].map((s) => (
                  <Card key={s.label} className="border-accent/20">
                    <CardContent className="flex items-center gap-4 p-6">
                      <div className="rounded-full bg-accent/10 p-3"><s.icon className="h-6 w-6 text-accent" /></div>
                      <div><p className="text-sm text-muted-foreground">{s.label}</p><p className="font-heading text-2xl font-bold">{s.value}</p></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card>
                <CardHeader><CardTitle>Transactions</CardTitle></CardHeader>
                <CardContent>
                  {transactions.length === 0 ? <p className="text-muted-foreground text-center py-8">No transactions yet.</p> : (
                    <div className="overflow-auto">
                      <Table>
                        <TableHeader><TableRow>
                          <TableHead>Date</TableHead><TableHead>Student</TableHead><TableHead>Course</TableHead><TableHead>Amount</TableHead><TableHead>Gateway</TableHead><TableHead>Status</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {transactions.map((t: any, i: number) => (
                            <TableRow key={i}>
                              <TableCell>{new Date(t.paid_at).toLocaleDateString()}</TableCell>
                              <TableCell>{t.profiles?.full_name || "—"}</TableCell>
                              <TableCell>{t.courses?.title || "—"}</TableCell>
                              <TableCell className="font-medium">₦{Number(t.amount).toLocaleString()}</TableCell>
                              <TableCell>{t.gateway || "—"}</TableCell>
                              <TableCell><Badge variant={t.status === "completed" ? "default" : "secondary"}>{t.status}</Badge></TableCell>
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

          {/* ── ANALYTICS ── */}
          <TabsContent value="analytics">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Revenue (Last 6 Months)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" /><YAxis />
                      <Tooltip formatter={(v: any) => `₦${Number(v).toLocaleString()}`} />
                      <Line type="monotone" dataKey="revenue" stroke="hsl(349, 79%, 59%)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Enrollments per Course</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={enrollmentData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="title" /><YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(349, 79%, 59%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Top 3 Courses</CardTitle></CardHeader>
                <CardContent>
                  {topCourses.length === 0 ? <p className="text-muted-foreground">No data yet.</p> : (
                    <div className="space-y-3">
                      {topCourses.map((c, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="font-heading text-2xl font-bold text-accent">#{i + 1}</span>
                          <div><p className="font-medium">{c.title}</p><p className="text-sm text-muted-foreground">{c.count} students</p></div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── PROMOTIONS ── */}
          <TabsContent value="promotions">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Create Coupon</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Code</Label>
                    <Input value={couponCode} onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCodeError(""); }} placeholder="e.g. SAVE20" />
                    {codeError && <p className="text-sm text-destructive">{codeError}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Discount %</Label>
                    <Input type="number" min={1} max={100} value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Expiry Date</Label>
                    <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Uses</Label>
                    <Input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
                  </div>
                  <Button onClick={createCoupon} disabled={couponSaving} className="bg-accent text-accent-foreground hover:bg-accent/90">
                    {couponSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Tag className="mr-2 h-4 w-4" />} Create Coupon
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Existing Coupons</CardTitle></CardHeader>
                <CardContent>
                  {coupons.length === 0 ? <p className="text-muted-foreground text-center py-8">No coupons yet.</p> : (
                    <div className="overflow-auto">
                      <Table>
                        <TableHeader><TableRow>
                          <TableHead>Code</TableHead><TableHead>Discount</TableHead><TableHead>Expiry</TableHead><TableHead>Uses</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {coupons.map((c) => {
                            const st = getCouponStatus(c.expiry_date, c.used_count, c.max_uses);
                            return (
                              <TableRow key={c.id}>
                                <TableCell className="font-mono font-medium">{c.code}</TableCell>
                                <TableCell>{c.discount_percent}%</TableCell>
                                <TableCell>{new Date(c.expiry_date).toLocaleDateString()}</TableCell>
                                <TableCell>{c.used_count}/{c.max_uses}</TableCell>
                                <TableCell><Badge className={statusColors[st]}>{st}</Badge></TableCell>
                                <TableCell><Button variant="ghost" size="sm" onClick={() => deleteCoupon(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── SETTINGS ── */}
          <TabsContent value="settings">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Store Settings</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Store Slug</Label>
                    <Input value={store.store_slug} onChange={(e) => setStore({ ...store, store_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} onBlur={() => validateSlug(store.store_slug)} />
                    {slugError && <p className="text-sm text-destructive">{slugError}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Logo</Label>
                    <Label className="cursor-pointer text-accent text-sm hover:underline block">{logoUploading ? "Uploading..." : "Upload New Logo"}<input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} /></Label>
                  </div>
                  <div className="space-y-2">
                    <Label>Banner</Label>
                    <Label className="cursor-pointer text-accent text-sm hover:underline block">{bannerUploading ? "Uploading..." : "Upload New Banner"}<input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} /></Label>
                  </div>
                  <div className="space-y-2">
                    <Label>Brand Color</Label>
                    <div className="flex gap-2"><Input type="color" value={store.brand_color} onChange={(e) => setStore({ ...store, brand_color: e.target.value })} className="h-10 w-16 p-1" /><Input value={store.brand_color} onChange={(e) => setStore({ ...store, brand_color: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2"><Label>Bio</Label><Textarea value={store.bio} onChange={(e) => setStore({ ...store, bio: e.target.value })} rows={3} /></div>
                  <Button onClick={saveStore} disabled={storeSaving} className="bg-accent text-accent-foreground hover:bg-accent/90">
                    {storeSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
                  </Button>
                </CardContent>
              </Card>
              <div className="space-y-6">
                <Card>
                  <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2"><Label>New Password</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 characters" /></div>
                    <div className="space-y-2"><Label>Confirm Password</Label><Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div>
                    <Button onClick={changePassword} disabled={pwSaving} variant="outline">
                      {pwSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />} Update Password
                    </Button>
                  </CardContent>
                </Card>
                <Card className="border-destructive/30">
                  <CardHeader><CardTitle className="text-destructive">Danger Zone</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">Type <strong>DELETE</strong> to confirm account deactivation.</p>
                    <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="Type DELETE" />
                    <Button variant="destructive" disabled={deleteConfirm !== "DELETE"} onClick={deleteAccount}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                    </Button>
                    <p className="text-xs text-muted-foreground">Your account will be deactivated. Contact support to complete deletion.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CoOwnerDashboard;
