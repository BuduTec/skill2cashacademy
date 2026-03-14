import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  BookOpen, PlayCircle, Award, Heart, User, Bell, Download,
  Loader2, Save, Lock, Trophy, Megaphone, Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import DashboardHeader from "@/components/DashboardHeader";
import { jsPDF } from "jspdf";

// ── types ──
interface EnrolledCourse {
  course_id: string;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  enrolled_at: string;
  progress: number;
  completedCount: number;
  totalCount: number;
}

interface CertRecord { course_id: string; issued_at: string; pdf_url: string | null; }

interface WishlistItem {
  id: string;
  course_id: string;
  created_at: string;
  course: { id: string; title: string; thumbnail_url: string | null; slug: string; price: number; };
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  source: "personal" | "broadcast";
}

const Dashboard = () => {
  const { user, profile } = useAuth();

  // ── My Courses state ──
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  // ── Certificates ──
  const [certMap, setCertMap] = useState<Map<string, CertRecord>>(new Map());
  const [certGenerating, setCertGenerating] = useState<string | null>(null);

  // ── Wishlist ──
  const [wishlists, setWishlists] = useState<WishlistItem[]>([]);
  const [wishLoading, setWishLoading] = useState(true);

  // ── Profile ──
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // ── Notifications ──
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(true);

  // ── FETCH MY COURSES ──
  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("enrolled_at, courses(id, title, thumbnail_url, slug)")
        .eq("student_id", user.id)
        .order("enrolled_at", { ascending: false });

      if (!enrollments || enrollments.length === 0) {
        setCoursesLoading(false);
        return;
      }

      const mapped: EnrolledCourse[] = [];
      for (const e of enrollments as any[]) {
        const course = e.courses;
        if (!course) continue;

        const { count: totalCount } = await supabase
          .from("lessons_view")
          .select("id", { count: "exact", head: true })
          .eq("course_id", course.id);

        const lessonIds = (
          await supabase.from("lessons_view").select("id").eq("course_id", course.id)
        ).data?.map((l: any) => l.id) || [];

        let completedCount = 0;
        if (lessonIds.length > 0) {
          const { count } = await supabase
            .from("lesson_progress")
            .select("id", { count: "exact", head: true })
            .eq("student_id", user.id)
            .eq("completed", true)
            .in("lesson_id", lessonIds);
          completedCount = count || 0;
        }

        const total = totalCount || 0;
        mapped.push({
          course_id: course.id,
          title: course.title,
          slug: course.slug,
          thumbnail_url: course.thumbnail_url,
          enrolled_at: e.enrolled_at,
          progress: total > 0 ? Math.round((completedCount / total) * 100) : 0,
          completedCount,
          totalCount: total,
        });
      }
      setCourses(mapped);

      // fetch existing certificates
      const { data: certs } = await supabase
        .from("certificates")
        .select("course_id, issued_at, pdf_url")
        .eq("student_id", user.id);
      setCertMap(new Map(certs?.map((c: any) => [c.course_id, c]) || []));
      setCoursesLoading(false);
    };
    fetch();
  }, [user]);

  // ── FETCH WISHLIST ──
  useEffect(() => {
    if (!user) return;
    const fetchWl = async () => {
      const { data } = await supabase
        .from("wishlists")
        .select("id, course_id, created_at, courses(id, title, thumbnail_url, slug, price)")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });
      setWishlists(
        (data || []).map((w: any) => ({ ...w, course: w.courses }))
      );
      setWishLoading(false);
    };
    fetchWl();
  }, [user]);

  // ── FETCH PROFILE ──
  useEffect(() => {
    if (!user) return;
    const fetchP = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, bio, avatar_url")
        .eq("id", user.id)
        .single();
      if (data) {
        setFullName(data.full_name || "");
        setPhone((data as any).phone || "");
        setBio(data.bio || "");
        setAvatarUrl(data.avatar_url || "");
      }
    };
    fetchP();
  }, [user]);

  // ── FETCH NOTIFICATIONS ──
  useEffect(() => {
    if (!user) return;
    const fetchN = async () => {
      const [{ data: personal }, { data: broadcasts }] = await Promise.all([
        supabase
          .from("notifications")
          .select("id, type, title, message, is_read, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("announcements")
          .select("id, title, message, target_role, created_at")
          .or("target_role.eq.all,target_role.eq.student")
          .order("created_at", { ascending: false }),
      ]);

      const merged: NotificationItem[] = [
        ...(personal || []).map((n: any) => ({ ...n, source: "personal" as const })),
        ...(broadcasts || []).map((a: any) => ({
          ...a,
          source: "broadcast" as const,
          is_read: true,
          type: "announcement",
        })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setNotifications(merged);
      setUnreadCount(personal?.filter((n: any) => !n.is_read).length || 0);
      setNotifLoading(false);
    };
    fetchN();
  }, [user]);

  // ── Certificate download / generate ──
  const downloadCertificate = async (course: EnrolledCourse) => {
    if (!user) return;
    setCertGenerating(course.course_id);

    const existing = certMap.get(course.course_id);
    if (existing?.pdf_url) {
      const { data: signed } = await supabase.storage
        .from("pdfs")
        .createSignedUrl(existing.pdf_url, 60);
      if (signed?.signedUrl) window.open(signed.signedUrl, "_blank");
      setCertGenerating(null);
      return;
    }

    // Generate PDF
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();

    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, w, h, "F");

    doc.setFontSize(28);
    doc.setTextColor(26, 26, 46);
    doc.text("Skill2Cash Academy", w / 2, 80, { align: "center" });

    doc.setFontSize(36);
    doc.setFont("helvetica", "bold");
    doc.text("CERTIFICATE OF COMPLETION", w / 2, 140, { align: "center" });

    doc.setFontSize(16);
    doc.setFont("helvetica", "italic");
    doc.text("This certifies that", w / 2, 200, { align: "center" });

    doc.setFontSize(32);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(233, 69, 96);
    doc.text(profile?.full_name || "Student", w / 2, 250, { align: "center" });

    doc.setFontSize(16);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(26, 26, 46);
    doc.text("has successfully completed", w / 2, 300, { align: "center" });

    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text(course.title, w / 2, 350, { align: "center" });

    const dateStr = new Date().toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(dateStr, w / 2, 400, { align: "center" });

    doc.setDrawColor(200);
    doc.line(w * 0.2, 430, w * 0.8, 430);

    doc.setFontSize(12);
    doc.text("BUDUTECH LTD", w / 2, 460, { align: "center" });

    const pdfBlob = doc.output("blob");
    const filePath = `certificates/${user.id}/${course.course_id}.pdf`;

    await supabase.storage.from("pdfs").upload(filePath, pdfBlob, {
      contentType: "application/pdf",
      upsert: true,
    });

    await supabase.from("certificates").upsert(
      {
        student_id: user.id,
        course_id: course.course_id,
        issued_at: new Date().toISOString(),
        pdf_url: filePath,
      },
      { onConflict: "student_id,course_id" }
    );

    certMap.set(course.course_id, { course_id: course.course_id, issued_at: new Date().toISOString(), pdf_url: filePath });
    setCertMap(new Map(certMap));

    const { data: signed } = await supabase.storage
      .from("pdfs")
      .createSignedUrl(filePath, 60);
    if (signed?.signedUrl) window.open(signed.signedUrl, "_blank");
    setCertGenerating(null);
  };

  // ── Remove wishlist ──
  const removeWishlist = async (wl: WishlistItem) => {
    await supabase.from("wishlists").delete().eq("id", wl.id).eq("student_id", user!.id);
    setWishlists((prev) => prev.filter((w) => w.id !== wl.id));
    toast({ title: "Removed from wishlist" });
  };

  // ── Save profile ──
  const saveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: fullName,
      phone,
      bio,
      avatar_url: avatarUrl,
    }).eq("id", user.id);
    setProfileSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Profile updated." });
  };

  // ── Avatar upload ──
  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    const ext = file.name.split(".").pop();
    const path = `avatars/${user.id}/avatar.${ext}`;
    await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(pub.publicUrl);
    setAvatarUploading(false);
  };

  // ── Change password ──
  const changePassword = async () => {
    if (newPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Password updated." });
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  // ── Mark notification read ──
  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id).eq("user_id", user!.id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const completedCourses = courses.filter((c) => c.progress === 100);

  const notifIcon = (type: string) => {
    switch (type) {
      case "payment": return "₦";
      case "enrollment": return "📚";
      case "certificate": return "🏆";
      case "announcement": return "📢";
      default: return "🔔";
    }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container py-8">
        <h1 className="font-heading text-3xl font-bold mb-6">
          Welcome back, {profile?.full_name || "there"}! 👋
        </h1>

        <Tabs defaultValue="courses" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 lg:w-auto lg:inline-grid">
            <TabsTrigger value="courses" className="gap-1"><BookOpen className="h-4 w-4 hidden sm:block" /> My Courses</TabsTrigger>
            <TabsTrigger value="certificates" className="gap-1"><Award className="h-4 w-4 hidden sm:block" /> Certificates</TabsTrigger>
            <TabsTrigger value="wishlist" className="gap-1"><Heart className="h-4 w-4 hidden sm:block" /> Wishlist</TabsTrigger>
            <TabsTrigger value="profile" className="gap-1"><User className="h-4 w-4 hidden sm:block" /> Profile</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1 relative">
              <Bell className="h-4 w-4 hidden sm:block" /> Notifications
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── MY COURSES ── */}
          <TabsContent value="courses">
            {coursesLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
            ) : courses.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-4" />
                  <p className="text-muted-foreground mb-4">You haven't enrolled in any courses yet.</p>
                  <Link to="/courses"><Button className="bg-accent text-accent-foreground hover:bg-accent/90">Browse Courses</Button></Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {courses.map((c) => (
                  <Card key={c.course_id} className="overflow-hidden">
                    <div className="aspect-video bg-muted overflow-hidden">
                      {c.thumbnail_url ? (
                        <img src={c.thumbnail_url} alt={c.title} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-full items-center justify-center"><BookOpen className="h-12 w-12 text-muted-foreground/30" /></div>
                      )}
                    </div>
                    <CardContent className="p-5 space-y-3">
                      <h3 className="font-heading text-lg font-semibold line-clamp-2">{c.title}</h3>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{c.completedCount}/{c.totalCount} lessons</span>
                        <span className="font-medium text-accent">{c.progress}%</span>
                      </div>
                      <Progress value={c.progress} className="h-2" />
                      {c.progress < 100 ? (
                        <Link to={`/courses/${c.slug}/learn`}>
                          <Button size="sm" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                            <PlayCircle className="mr-2 h-4 w-4" /> Continue Learning
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full"
                          variant="outline"
                          onClick={() => downloadCertificate(c)}
                          disabled={certGenerating === c.course_id}
                        >
                          {certGenerating === c.course_id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                          Download Certificate
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── CERTIFICATES ── */}
          <TabsContent value="certificates">
            {coursesLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
            ) : completedCourses.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Trophy className="h-12 w-12 text-muted-foreground/40 mb-4" />
                  <p className="text-muted-foreground">Complete a course to earn your certificate!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {completedCourses.map((c) => {
                  const cert = certMap.get(c.course_id);
                  return (
                    <Card key={c.course_id} className="border-accent/20">
                      <CardContent className="p-6 text-center space-y-4">
                        <Trophy className="mx-auto h-12 w-12 text-accent" />
                        <h3 className="font-heading text-lg font-semibold">{c.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Completed on {new Date(cert?.issued_at || Date.now()).toLocaleDateString()}
                        </p>
                        <Button
                          className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                          onClick={() => downloadCertificate(c)}
                          disabled={certGenerating === c.course_id}
                        >
                          {certGenerating === c.course_id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                          Download Certificate
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── WISHLIST ── */}
          <TabsContent value="wishlist">
            {wishLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
            ) : wishlists.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Heart className="h-12 w-12 text-muted-foreground/40 mb-4" />
                  <p className="text-muted-foreground mb-4">Your wishlist is empty.</p>
                  <Link to="/courses"><Button className="bg-accent text-accent-foreground hover:bg-accent/90">Browse Courses</Button></Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {wishlists.map((wl) => (
                  <Card key={wl.id} className="overflow-hidden">
                    <div className="aspect-video bg-muted overflow-hidden">
                      {wl.course?.thumbnail_url ? (
                        <img src={wl.course.thumbnail_url} alt={wl.course.title} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-full items-center justify-center"><BookOpen className="h-12 w-12 text-muted-foreground/30" /></div>
                      )}
                    </div>
                    <CardContent className="p-5 space-y-3">
                      <h3 className="font-heading text-lg font-semibold line-clamp-2">{wl.course?.title}</h3>
                      <p className="text-accent font-bold">₦{wl.course?.price?.toLocaleString()}</p>
                      <div className="flex gap-2">
                        <Link to={`/courses/${wl.course?.slug}`} className="flex-1">
                          <Button size="sm" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">View Course</Button>
                        </Link>
                        <Button size="sm" variant="outline" onClick={() => removeWishlist(wl)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── PROFILE ── */}
          <TabsContent value="profile">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="h-20 w-20 rounded-full object-cover border-2 border-accent" />
                      ) : (
                        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className="cursor-pointer text-accent hover:underline text-sm">
                        {avatarUploading ? "Uploading..." : "Change Avatar"}
                        <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} disabled={avatarUploading} />
                      </Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Bio</Label>
                    <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
                  </div>
                  <Button onClick={saveProfile} disabled={profileSaving} className="bg-accent text-accent-foreground hover:bg-accent/90">
                    {profileSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Profile
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 characters" />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm Password</Label>
                    <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  </div>
                  <Button onClick={changePassword} disabled={pwSaving} variant="outline">
                    {pwSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                    Update Password
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── NOTIFICATIONS ── */}
          <TabsContent value="notifications">
            {notifLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
            ) : notifications.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Bell className="h-12 w-12 text-muted-foreground/40 mb-4" />
                  <p className="text-muted-foreground">No notifications yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <Card
                    key={`${n.source}-${n.id}`}
                    className={`transition-colors ${!n.is_read ? "border-accent/30 bg-accent/5" : ""}`}
                  >
                    <CardContent className="flex items-start gap-4 p-4">
                      <span className="text-2xl">{notifIcon(n.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{n.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">{timeAgo(n.created_at)}</p>
                      </div>
                      {n.source === "personal" && !n.is_read && (
                        <Button size="sm" variant="ghost" onClick={() => markRead(n.id)} className="text-accent text-xs shrink-0">
                          Mark as Read
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
