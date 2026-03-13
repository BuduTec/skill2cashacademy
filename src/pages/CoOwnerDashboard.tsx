import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  LogOut, Store, BookOpen, Users, DollarSign, Link2, Copy, Save, Loader2,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import DashboardHeader from "@/components/DashboardHeader";

interface StoreRecord {
  id?: string;
  store_slug: string;
  logo_url: string;
  bio: string;
  brand_color: string;
}

interface PlatformCourse {
  id: string;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  price: number;
  level: string;
  category: string;
}

interface StudentRecord {
  id: string;
  user_id: string;
  course_title: string;
  enrolled_at: string;
  full_name: string | null;
  email: string;
}

interface EarningRecord {
  id: string;
  amount: number;
  created_at: string;
  payment_ref: string;
  student_email: string;
}

const CoOwnerDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const [store, setStore] = useState<StoreRecord>({
    store_slug: "", logo_url: "", bio: "", brand_color: "#E94560",
  });
  const [storeSaving, setStoreSaving] = useState(false);
  const [storeLoading, setStoreLoading] = useState(true);

  const [courses, setCourses] = useState<PlatformCourse[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [earnings, setEarnings] = useState<EarningRecord[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchStore();
    fetchCourses();
    fetchStudents();
    fetchEarnings();
  }, [user]);

  const fetchStore = async () => {
    const { data } = await supabase
      .from("co_owner_stores")
      .select("*")
      .eq("user_id", user!.id)
      .maybeSingle();
    if (data) setStore(data as any);
    setStoreLoading(false);
  };

  const fetchCourses = async () => {
    const { data } = await supabase
      .from("courses")
      .select("id, title, slug, thumbnail_url, price, level, category")
      .eq("published", true)
      .order("created_at", { ascending: false });
    setCourses((data as PlatformCourse[]) || []);
  };

  const fetchStudents = async () => {
    const { data } = await supabase
      .from("enrollments")
      .select("id, user_id, created_at, courses(title), profiles(full_name)")
      .eq("co_owner_id", user!.id)
      .order("created_at", { ascending: false });

    if (data) {
      const mapped: StudentRecord[] = data.map((e: any) => ({
        id: e.id,
        user_id: e.user_id,
        course_title: e.courses?.title || "—",
        enrolled_at: e.created_at,
        full_name: e.profiles?.full_name || "—",
        email: "",
      }));
      setStudents(mapped);
    }
  };

  const fetchEarnings = async () => {
    const { data } = await supabase
      .from("payments")
      .select("id, amount, created_at, payment_ref, student_email")
      .eq("co_owner_id", user!.id)
      .order("created_at", { ascending: false });

    if (data) {
      setEarnings(data as EarningRecord[]);
      setTotalEarned(data.reduce((sum: number, p: any) => sum + (p.amount || 0), 0));
    }
  };

  const saveStore = async () => {
    setStoreSaving(true);
    const payload = {
      user_id: user!.id,
      store_slug: store.store_slug,
      logo_url: store.logo_url,
      bio: store.bio,
      brand_color: store.brand_color,
    };

    const { error } = store.id
      ? await supabase.from("co_owner_stores").update(payload).eq("id", store.id)
      : await supabase.from("co_owner_stores").insert(payload);

    setStoreSaving(false);
    if (error) {
      toast({ title: "Error saving store", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Store saved!" });
      fetchStore();
    }
  };

  const storeUrl = `${window.location.origin}/store/${store.store_slug}`;

  const copyLink = () => {
    navigator.clipboard.writeText(storeUrl);
    toast({ title: "Link copied!" });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container py-8">
        <h1 className="font-heading text-3xl font-bold mb-6">
          Welcome, {profile?.full_name || "Co-Owner"}! 🏪
        </h1>

        <Tabs defaultValue="store" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="store" className="gap-1"><Store className="h-4 w-4 hidden sm:block" /> My Store</TabsTrigger>
            <TabsTrigger value="catalogue" className="gap-1"><BookOpen className="h-4 w-4 hidden sm:block" /> Courses</TabsTrigger>
            <TabsTrigger value="students" className="gap-1"><Users className="h-4 w-4 hidden sm:block" /> Students</TabsTrigger>
            <TabsTrigger value="earnings" className="gap-1"><DollarSign className="h-4 w-4 hidden sm:block" /> Earnings</TabsTrigger>
            <TabsTrigger value="referral" className="gap-1"><Link2 className="h-4 w-4 hidden sm:block" /> Referral</TabsTrigger>
          </TabsList>

          {/* MY STORE */}
          <TabsContent value="store">
            <Card>
              <CardHeader>
                <CardTitle>My Store Settings</CardTitle>
                <CardDescription>Customize your co-branded storefront</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {storeLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-accent" />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Store Slug</Label>
                        <Input
                          placeholder="my-store"
                          value={store.store_slug}
                          onChange={(e) => setStore({ ...store, store_slug: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">Your URL: {storeUrl}</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Brand Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={store.brand_color}
                            onChange={(e) => setStore({ ...store, brand_color: e.target.value })}
                            className="h-10 w-16 p-1"
                          />
                          <Input
                            value={store.brand_color}
                            onChange={(e) => setStore({ ...store, brand_color: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Logo URL</Label>
                      <Input
                        placeholder="https://..."
                        value={store.logo_url}
                        onChange={(e) => setStore({ ...store, logo_url: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bio</Label>
                      <Textarea
                        placeholder="Tell your students about yourself..."
                        value={store.bio}
                        onChange={(e) => setStore({ ...store, bio: e.target.value })}
                        rows={4}
                      />
                    </div>
                    <Button onClick={saveStore} disabled={storeSaving} className="bg-accent text-accent-foreground hover:bg-accent/90">
                      {storeSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save Store
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* COURSE CATALOGUE */}
          <TabsContent value="catalogue">
            <Card>
              <CardHeader>
                <CardTitle>Course Catalogue</CardTitle>
                <CardDescription>Courses available for you to sell</CardDescription>
              </CardHeader>
              <CardContent>
                {courses.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No courses available yet.</p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {courses.map((c) => (
                      <Card key={c.id} className="overflow-hidden">
                        <div className="aspect-video bg-muted">
                          {c.thumbnail_url ? (
                            <img src={c.thumbnail_url} alt={c.title} className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4 space-y-2">
                          <h3 className="font-heading font-semibold line-clamp-2">{c.title}</h3>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-accent">₦{c.price?.toLocaleString()}</span>
                            <Badge variant="secondary" className="text-xs">{c.level}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* MY STUDENTS */}
          <TabsContent value="students">
            <Card>
              <CardHeader>
                <CardTitle>My Students</CardTitle>
                <CardDescription>Students enrolled through your store</CardDescription>
              </CardHeader>
              <CardContent>
                {students.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No students enrolled yet. Share your referral link!</p>
                ) : (
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Course</TableHead>
                          <TableHead>Enrolled</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">{s.full_name}</TableCell>
                            <TableCell>{s.course_title}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(s.enrolled_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* EARNINGS */}
          <TabsContent value="earnings">
            <div className="space-y-6">
              <Card className="border-accent/30">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="rounded-full bg-accent/10 p-3">
                    <DollarSign className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Earned</p>
                    <p className="font-heading text-3xl font-bold">₦{totalEarned.toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                  {earnings.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No earnings yet.</p>
                  ) : (
                    <div className="overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Student</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {earnings.map((e) => (
                            <TableRow key={e.id}>
                              <TableCell className="text-muted-foreground">
                                {new Date(e.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell>{e.student_email || "—"}</TableCell>
                              <TableCell className="font-mono text-xs">{e.payment_ref}</TableCell>
                              <TableCell className="text-right font-medium">₦{e.amount.toLocaleString()}</TableCell>
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

          {/* REFERRAL LINK */}
          <TabsContent value="referral">
            <Card>
              <CardHeader>
                <CardTitle>Your Referral Link</CardTitle>
                <CardDescription>Share this link to earn commissions on enrollments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input value={storeUrl} readOnly className="font-mono text-sm" />
                  <Button onClick={copyLink} variant="outline" className="shrink-0">
                    <Copy className="mr-2 h-4 w-4" /> Copy
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  When students visit your store and enroll, you earn commissions automatically.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CoOwnerDashboard;
