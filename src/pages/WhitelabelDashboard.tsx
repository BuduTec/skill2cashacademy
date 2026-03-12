import { useEffect, useState, useCallback } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import {
  LogOut, Store, BookOpen, Users, DollarSign, BarChart3, Settings,
  Save, Loader2, Plus, Trash2, Edit, Upload, Eye, GripVertical,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// ── Types ──
interface WhitelabelSpace {
  id?: string;
  owner_id: string;
  subdomain: string;
  custom_domain: string | null;
  logo_url: string | null;
  banner_url: string | null;
  brand_color: string;
  tagline: string | null;
  bio: string | null;
}

interface CourseRecord {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  price: number;
  category: string;
  level: string;
  status: string;
  is_affiliate_enabled: boolean;
  created_at: string;
  enrollment_count?: number;
}

interface SectionRecord {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  lessons: LessonRecord[];
}

interface LessonRecord {
  id: string;
  section_id: string;
  title: string;
  video_url: string | null;
  duration: number | null;
  is_free: boolean;
  order_index: number;
}

interface StudentRecord {
  full_name: string | null;
  email: string | null;
  course_title: string;
  enrolled_at: string;
  completed_lessons: number;
  total_lessons: number;
  certificate_issued: boolean;
}

interface PaymentRecord {
  paid_at: string;
  full_name: string | null;
  course_title: string;
  amount: number;
  gateway: string | null;
  status: string;
}

// ── Helpers ──
const toKebab = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const categories = ["Business", "Technology", "Marketing", "Design", "Finance", "Personal Development"];
const levels = ["beginner", "intermediate", "advanced"];

const WhitelabelDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  // ── My Space state ──
  const [space, setSpace] = useState<WhitelabelSpace>({
    owner_id: "", subdomain: "", custom_domain: null, logo_url: null,
    banner_url: null, brand_color: "#1A1A2E", tagline: null, bio: null,
  });
  const [spaceLoading, setSpaceLoading] = useState(true);
  const [spaceSaving, setSpaceSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);

  // ── Course Builder state ──
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseRecord | null>(null);
  const [courseForm, setCourseForm] = useState({
    title: "", slug: "", description: "", thumbnail_url: "",
    price: 0, category: "Business", level: "beginner",
    status: "draft", is_affiliate_enabled: false,
  });
  const [courseSaving, setCourseSaving] = useState(false);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);

  // Curriculum state
  const [activeCurriculumCourseId, setActiveCurriculumCourseId] = useState<string | null>(null);
  const [sections, setSections] = useState<SectionRecord[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState("");

  // Lesson form
  const [addingLessonSectionId, setAddingLessonSectionId] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState({
    title: "", content_url: "", duration_seconds: 0, is_free_preview: false,
  });
  const [lessonSaving, setLessonSaving] = useState(false);

  // ── Students state ──
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);

  // ── Earnings state ──
  const [totalEarned, setTotalEarned] = useState(0);
  const [monthEarned, setMonthEarned] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalCourses, setTotalCourses] = useState(0);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [earningsLoading, setEarningsLoading] = useState(true);

  // ── Analytics state ──
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ month: string; revenue: number }[]>([]);
  const [courseEnrollments, setCourseEnrollments] = useState<{ course: string; count: number }[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // ── Settings state ──
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  // ── Data fetching ──
  useEffect(() => {
    if (!user) return;
    fetchSpace();
    fetchCourses();
    fetchStudents();
    fetchEarnings();
    fetchAnalytics();
  }, [user]);

  const fetchSpace = async () => {
    const { data } = await supabase
      .from("whitelabel_spaces")
      .select("*")
      .eq("owner_id", user!.id)
      .maybeSingle();
    if (data) setSpace(data as any);
    else setSpace((s) => ({ ...s, owner_id: user!.id }));
    setSpaceLoading(false);
  };

  const saveSpace = async () => {
    setSpaceSaving(true);
    const payload = {
      owner_id: user!.id,
      subdomain: space.subdomain,
      custom_domain: space.custom_domain,
      logo_url: space.logo_url,
      banner_url: space.banner_url,
      brand_color: space.brand_color,
      tagline: space.tagline,
      bio: space.bio,
    };
    const { error } = space.id
      ? await supabase.from("whitelabel_spaces").update(payload).eq("id", space.id)
      : await supabase.from("whitelabel_spaces").insert(payload);
    setSpaceSaving(false);
    if (error) toast({ title: "Error saving", description: error.message, variant: "destructive" });
    else { toast({ title: "Space saved!" }); fetchSpace(); }
  };

  const uploadFile = async (
    file: File,
    bucket: string,
    setUploading: (v: boolean) => void,
    onUrl: (url: string) => void
  ) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user!.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } else {
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
      onUrl(publicUrl);
    }
    setUploading(false);
  };

  // ── Courses ──
  const fetchCourses = async () => {
    setCoursesLoading(true);
    const { data } = await supabase
      .from("courses")
      .select("id, title, slug, description, thumbnail_url, price, category, level, status, is_affiliate_enabled, created_at")
      .eq("whitelabel_owner_id", user!.id)
      .order("created_at", { ascending: false });
    
    if (data) {
      // Get enrollment counts
      const courseIds = data.map((c: any) => c.id);
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("course_id")
        .in("course_id", courseIds);
      
      const countMap = new Map<string, number>();
      enrollments?.forEach((e: any) => {
        countMap.set(e.course_id, (countMap.get(e.course_id) || 0) + 1);
      });
      
      setCourses(data.map((c: any) => ({ ...c, enrollment_count: countMap.get(c.id) || 0 })));
    }
    setCoursesLoading(false);
  };

  const openNewCourseForm = () => {
    setEditingCourse(null);
    setCourseForm({
      title: "", slug: "", description: "", thumbnail_url: "",
      price: 0, category: "Business", level: "beginner",
      status: "draft", is_affiliate_enabled: false,
    });
    setShowCourseForm(true);
  };

  const openEditCourseForm = (course: CourseRecord) => {
    setEditingCourse(course);
    setCourseForm({
      title: course.title,
      slug: course.slug,
      description: course.description || "",
      thumbnail_url: course.thumbnail_url || "",
      price: course.price,
      category: course.category,
      level: course.level,
      status: course.status,
      is_affiliate_enabled: course.is_affiliate_enabled,
    });
    setShowCourseForm(true);
  };

  const saveCourse = async () => {
    if (!courseForm.title || !courseForm.slug) {
      toast({ title: "Title and slug are required", variant: "destructive" });
      return;
    }
    setCourseSaving(true);
    const payload = {
      title: courseForm.title,
      slug: courseForm.slug,
      description: courseForm.description || null,
      thumbnail_url: courseForm.thumbnail_url || null,
      price: courseForm.price,
      category: courseForm.category,
      level: courseForm.level,
      status: courseForm.status,
      is_affiliate_enabled: courseForm.is_affiliate_enabled,
      owner_id: user!.id,
      whitelabel_owner_id: user!.id,
      is_platform_course: false,
    };

    const { error } = editingCourse
      ? await supabase.from("courses").update(payload).eq("id", editingCourse.id)
      : await supabase.from("courses").insert(payload);

    setCourseSaving(false);
    if (error) {
      toast({ title: "Error saving course", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingCourse ? "Course updated!" : "Course created!" });
      setShowCourseForm(false);
      fetchCourses();
      if (!editingCourse) {
        // After creating, find the course and open curriculum
        const { data: newCourse } = await supabase
          .from("courses")
          .select("id")
          .eq("slug", courseForm.slug)
          .eq("whitelabel_owner_id", user!.id)
          .single();
        if (newCourse) {
          setActiveCurriculumCourseId(newCourse.id);
          fetchSections(newCourse.id);
        }
      }
    }
  };

  const deleteCourse = async (courseId: string) => {
    const { error } = await supabase.from("courses").delete().eq("id", courseId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Course deleted" }); fetchCourses(); }
  };

  // ── Curriculum (Sections + Lessons) ──
  const fetchSections = async (courseId: string) => {
    setSectionsLoading(true);
    const { data: secs } = await supabase
      .from("course_sections")
      .select("id, course_id, title, order_index")
      .eq("course_id", courseId)
      .order("order_index");

    if (secs && secs.length > 0) {
      const sectionIds = secs.map((s: any) => s.id);
      // Read from lessons_view for display
      const { data: lessonsData } = await supabase
        .from("lessons_view")
        .select("id, section_id, title, video_url, duration, is_free, order_index")
        .in("section_id", sectionIds)
        .order("order_index");

      const lessonsMap = new Map<string, LessonRecord[]>();
      lessonsData?.forEach((l: any) => {
        const arr = lessonsMap.get(l.section_id) || [];
        arr.push({
          id: l.id,
          section_id: l.section_id,
          title: l.title,
          video_url: l.video_url,
          duration: l.duration,
          is_free: l.is_free,
          order_index: l.order_index,
        });
        lessonsMap.set(l.section_id, arr);
      });

      setSections(secs.map((s: any) => ({
        ...s,
        lessons: lessonsMap.get(s.id) || [],
      })));
    } else {
      setSections([]);
    }
    setSectionsLoading(false);
  };

  const addSection = async () => {
    if (!newSectionTitle.trim() || !activeCurriculumCourseId) return;
    const orderIndex = sections.length;
    const { error } = await supabase.from("course_sections").insert({
      course_id: activeCurriculumCourseId,
      title: newSectionTitle.trim(),
      order_index: orderIndex,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { setNewSectionTitle(""); fetchSections(activeCurriculumCourseId); }
  };

  const updateSectionTitle = async (sectionId: string) => {
    if (!editingSectionTitle.trim()) return;
    const { error } = await supabase.from("course_sections").update({ title: editingSectionTitle.trim() }).eq("id", sectionId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { setEditingSectionId(null); fetchSections(activeCurriculumCourseId!); }
  };

  const deleteSection = async (sectionId: string) => {
    const { error } = await supabase.from("course_sections").delete().eq("id", sectionId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else fetchSections(activeCurriculumCourseId!);
  };

  const addLesson = async (sectionId: string) => {
    if (!lessonForm.title.trim() || !activeCurriculumCourseId) return;
    setLessonSaving(true);
    const section = sections.find((s) => s.id === sectionId);
    const orderIndex = section ? section.lessons.length : 0;

    // INSERT into lessons table (not lessons_view)
    const { error } = await supabase.from("lessons").insert({
      section_id: sectionId,
      course_id: activeCurriculumCourseId,
      title: lessonForm.title.trim(),
      content_url: lessonForm.content_url || null,
      duration_seconds: lessonForm.duration_seconds || null,
      is_free_preview: lessonForm.is_free_preview,
      order_index: orderIndex,
    });

    setLessonSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      setAddingLessonSectionId(null);
      setLessonForm({ title: "", content_url: "", duration_seconds: 0, is_free_preview: false });
      fetchSections(activeCurriculumCourseId);
    }
  };

  const deleteLesson = async (lessonId: string) => {
    const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else fetchSections(activeCurriculumCourseId!);
  };

  // ── Students ──
  const fetchStudents = async () => {
    setStudentsLoading(true);
    const { data } = await supabase.rpc("get_whitelabel_students", { owner_uuid: user!.id }).catch(() => ({ data: null }));

    // Fallback: manual query
    if (!data) {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("student_id, enrolled_at, course_id, courses(title)")
        .eq("whitelabel_owner_id", user!.id)
        .order("enrolled_at", { ascending: false });

      if (enrollments) {
        const studentIds = [...new Set(enrollments.map((e: any) => e.student_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", studentIds);

        const profileMap = new Map<string, any>();
        profiles?.forEach((p: any) => profileMap.set(p.id, p));

        const mapped: StudentRecord[] = enrollments.map((e: any) => {
          const p = profileMap.get(e.student_id);
          return {
            full_name: p?.full_name || "—",
            email: p?.email || "—",
            course_title: e.courses?.title || "—",
            enrolled_at: e.enrolled_at,
            completed_lessons: 0,
            total_lessons: 0,
            certificate_issued: false,
          };
        });
        setStudents(mapped);
      }
    } else {
      setStudents(data as StudentRecord[]);
    }
    setStudentsLoading(false);
  };

  // ── Earnings ──
  const fetchEarnings = async () => {
    setEarningsLoading(true);
    // Summary cards
    const { data: allPayments } = await supabase
      .from("payments")
      .select("amount, paid_at, payer_id, course_id, gateway, status")
      .eq("whitelabel_owner_id", user!.id)
      .eq("status", "completed");

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    setTotalEarned(allPayments?.reduce((s: number, p: any) => s + (p.amount || 0), 0) || 0);
    setMonthEarned(
      allPayments?.filter((p: any) => p.paid_at >= monthStart)
        .reduce((s: number, p: any) => s + (p.amount || 0), 0) || 0
    );

    // Total students
    const { count: studentCount } = await supabase
      .from("enrollments")
      .select("student_id", { count: "exact", head: true })
      .eq("whitelabel_owner_id", user!.id);
    setTotalStudents(studentCount || 0);

    // Total courses
    const { count: courseCount } = await supabase
      .from("courses")
      .select("id", { count: "exact", head: true })
      .eq("whitelabel_owner_id", user!.id);
    setTotalCourses(courseCount || 0);

    // Transactions
    if (allPayments && allPayments.length > 0) {
      const payerIds = [...new Set(allPayments.map((p: any) => p.payer_id))];
      const courseIds = [...new Set(allPayments.map((p: any) => p.course_id).filter(Boolean))];

      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", payerIds);
      const { data: coursesData } = courseIds.length > 0
        ? await supabase.from("courses").select("id, title").in("id", courseIds)
        : { data: [] };

      const profileMap = new Map<string, string>();
      profiles?.forEach((p: any) => profileMap.set(p.id, p.full_name));
      const courseMap = new Map<string, string>();
      coursesData?.forEach((c: any) => courseMap.set(c.id, c.title));

      setPayments(allPayments.map((p: any) => ({
        paid_at: p.paid_at,
        full_name: profileMap.get(p.payer_id) || "—",
        course_title: courseMap.get(p.course_id) || "—",
        amount: p.amount,
        gateway: p.gateway,
        status: p.status,
      })));
    }
    setEarningsLoading(false);
  };

  // ── Analytics ──
  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    // Monthly revenue
    const { data: payData } = await supabase
      .from("payments")
      .select("amount, paid_at")
      .eq("whitelabel_owner_id", user!.id)
      .eq("status", "completed")
      .gte("paid_at", new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString());

    const monthMap = new Map<string, number>();
    payData?.forEach((p: any) => {
      const m = p.paid_at?.substring(0, 7); // YYYY-MM
      if (m) monthMap.set(m, (monthMap.get(m) || 0) + (p.amount || 0));
    });
    const last6 = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().substring(0, 7);
      last6.push({ month: key, revenue: monthMap.get(key) || 0 });
    }
    setMonthlyRevenue(last6);

    // Enrollment per course
    const { data: enrollData } = await supabase
      .from("enrollments")
      .select("course_id, courses(title)")
      .eq("whitelabel_owner_id", user!.id);

    const courseCountMap = new Map<string, { title: string; count: number }>();
    enrollData?.forEach((e: any) => {
      const title = e.courses?.title || "Unknown";
      const existing = courseCountMap.get(e.course_id);
      if (existing) existing.count++;
      else courseCountMap.set(e.course_id, { title, count: 1 });
    });
    setCourseEnrollments(Array.from(courseCountMap.values()).map((v) => ({ course: v.title, count: v.count })));
    setAnalyticsLoading(false);
  };

  // ── Settings ──
  const changePassword = async () => {
    if (newPassword !== confirmNewPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Password updated!" }); setNewPassword(""); setConfirmNewPassword(""); }
  };

  const deleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    toast({ title: "Account deletion requested", description: "Please contact support to complete this process." });
  };

  const handleSignOut = async () => { await signOut(); navigate("/login"); };

  // ── Render ──
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="font-heading text-xl font-bold">
            Skill<span className="text-accent">2</span>Cash
          </Link>
          <div className="flex items-center gap-4">
            <Badge className="bg-accent text-accent-foreground">White-Label Owner</Badge>
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <h1 className="font-heading text-3xl font-bold mb-6">
          Welcome, {profile?.full_name || "there"}! 🏢
        </h1>

        <Tabs defaultValue="space" className="space-y-6">
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="space" className="gap-1"><Store className="h-4 w-4 hidden sm:block" /> My Space</TabsTrigger>
            <TabsTrigger value="courses" className="gap-1"><BookOpen className="h-4 w-4 hidden sm:block" /> Courses</TabsTrigger>
            <TabsTrigger value="students" className="gap-1"><Users className="h-4 w-4 hidden sm:block" /> Students</TabsTrigger>
            <TabsTrigger value="earnings" className="gap-1"><DollarSign className="h-4 w-4 hidden sm:block" /> Earnings</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1"><BarChart3 className="h-4 w-4 hidden sm:block" /> Analytics</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1"><Settings className="h-4 w-4 hidden sm:block" /> Settings</TabsTrigger>
          </TabsList>

          {/* ────── MY SPACE ────── */}
          <TabsContent value="space">
            {spaceLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Space Settings</CardTitle>
                    <CardDescription>{space.id ? "Edit your branded space" : "Set up your branded space"}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Subdomain</Label>
                        <Input placeholder="my-academy" value={space.subdomain}
                          onChange={(e) => setSpace({ ...space, subdomain: e.target.value.toLowerCase().replace(/\s/g, "") })} />
                        <p className="text-xs text-muted-foreground">{space.subdomain}.skill2cash.com</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Custom Domain</Label>
                        <Input placeholder="learn.yourdomain.com" value={space.custom_domain || ""}
                          onChange={(e) => setSpace({ ...space, custom_domain: e.target.value || null })} />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Logo</Label>
                        <div className="flex gap-2">
                          <Input type="file" accept="image/*" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadFile(file, "whitelabel_assets", setLogoUploading, (url) => setSpace({ ...space, logo_url: url }));
                          }} />
                          {logoUploading && <Loader2 className="h-5 w-5 animate-spin text-accent" />}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Banner</Label>
                        <div className="flex gap-2">
                          <Input type="file" accept="image/*" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadFile(file, "whitelabel_assets", setBannerUploading, (url) => setSpace({ ...space, banner_url: url }));
                          }} />
                          {bannerUploading && <Loader2 className="h-5 w-5 animate-spin text-accent" />}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Brand Color</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={space.brand_color} className="h-10 w-16 p-1"
                          onChange={(e) => setSpace({ ...space, brand_color: e.target.value })} />
                        <Input value={space.brand_color}
                          onChange={(e) => setSpace({ ...space, brand_color: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Tagline</Label>
                      <Input placeholder="Learn. Grow. Earn." value={space.tagline || ""}
                        onChange={(e) => setSpace({ ...space, tagline: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Bio</Label>
                      <Textarea placeholder="About your academy..." rows={3} value={space.bio || ""}
                        onChange={(e) => setSpace({ ...space, bio: e.target.value })} />
                    </div>
                    <Button onClick={saveSpace} disabled={spaceSaving} className="bg-accent text-accent-foreground hover:bg-accent/90">
                      {spaceSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save Space
                    </Button>
                  </CardContent>
                </Card>

                {/* Live Preview */}
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Eye className="h-4 w-4" /> Live Preview</CardTitle></CardHeader>
                  <CardContent>
                    <div className="rounded-lg border overflow-hidden" style={{ borderColor: space.brand_color }}>
                      {space.banner_url ? (
                        <img src={space.banner_url} alt="Banner" className="w-full h-32 object-cover" />
                      ) : (
                        <div className="w-full h-32" style={{ backgroundColor: space.brand_color }} />
                      )}
                      <div className="p-4 text-center -mt-8">
                        {space.logo_url ? (
                          <img src={space.logo_url} alt="Logo" className="mx-auto h-16 w-16 rounded-full border-4 border-background object-cover" />
                        ) : (
                          <div className="mx-auto h-16 w-16 rounded-full border-4 border-background flex items-center justify-center"
                            style={{ backgroundColor: space.brand_color }}>
                            <Store className="h-6 w-6 text-accent-foreground" />
                          </div>
                        )}
                        <h3 className="font-heading text-lg font-bold mt-2">{space.subdomain || "Your Academy"}</h3>
                        {space.tagline && <p className="text-sm text-muted-foreground">{space.tagline}</p>}
                        {space.bio && <p className="text-xs text-muted-foreground mt-2">{space.bio}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ────── COURSE BUILDER ────── */}
          <TabsContent value="courses">
            {activeCurriculumCourseId ? (
              /* Curriculum Builder */
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Curriculum Builder</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => setActiveCurriculumCourseId(null)}>← Back to Courses</Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sectionsLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <Input placeholder="Section title..." value={newSectionTitle}
                          onChange={(e) => setNewSectionTitle(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addSection()} />
                        <Button onClick={addSection} className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0">
                          <Plus className="mr-1 h-4 w-4" /> Add Section
                        </Button>
                      </div>

                      <Accordion type="multiple" className="space-y-2">
                        {sections.map((section) => (
                          <AccordionItem key={section.id} value={section.id} className="border rounded-lg">
                            <AccordionTrigger className="px-4 hover:no-underline">
                              <div className="flex items-center gap-2 flex-1">
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                                {editingSectionId === section.id ? (
                                  <div className="flex gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                                    <Input value={editingSectionTitle} onChange={(e) => setEditingSectionTitle(e.target.value)}
                                      onKeyDown={(e) => e.key === "Enter" && updateSectionTitle(section.id)} className="h-8" />
                                    <Button size="sm" variant="outline" onClick={() => updateSectionTitle(section.id)}>Save</Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingSectionId(null)}>Cancel</Button>
                                  </div>
                                ) : (
                                  <span className="font-medium">{section.title}</span>
                                )}
                                <Badge variant="secondary" className="ml-auto mr-2">{section.lessons.length} lessons</Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                              <div className="flex gap-2 mb-3">
                                <Button size="sm" variant="outline" onClick={() => { setEditingSectionId(section.id); setEditingSectionTitle(section.title); }}>
                                  <Edit className="h-3 w-3 mr-1" /> Edit
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="outline" className="text-destructive"><Trash2 className="h-3 w-3 mr-1" /> Delete</Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete section?</AlertDialogTitle>
                                      <AlertDialogDescription>This will delete all lessons in this section.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteSection(section.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>

                              {/* Lessons list */}
                              <ul className="space-y-2 mb-3">
                                {section.lessons.map((lesson) => (
                                  <li key={lesson.id} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      <GripVertical className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-sm">{lesson.title}</span>
                                      {lesson.is_free && <Badge variant="secondary" className="text-xs">Free</Badge>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {lesson.duration && <span className="text-xs text-muted-foreground">{Math.floor(lesson.duration / 60)}m</span>}
                                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteLesson(lesson.id)}>
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </li>
                                ))}
                              </ul>

                              {/* Add Lesson Form */}
                              {addingLessonSectionId === section.id ? (
                                <div className="space-y-3 rounded-lg border p-3">
                                  <Input placeholder="Lesson title" value={lessonForm.title}
                                    onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} />
                                  <Input placeholder="Video URL" value={lessonForm.content_url}
                                    onChange={(e) => setLessonForm({ ...lessonForm, content_url: e.target.value })} />
                                  <div className="grid grid-cols-2 gap-2">
                                    <Input type="number" placeholder="Duration (seconds)" value={lessonForm.duration_seconds || ""}
                                      onChange={(e) => setLessonForm({ ...lessonForm, duration_seconds: parseInt(e.target.value) || 0 })} />
                                    <div className="flex items-center gap-2">
                                      <Switch checked={lessonForm.is_free_preview}
                                        onCheckedChange={(v) => setLessonForm({ ...lessonForm, is_free_preview: v })} />
                                      <Label className="text-sm">Free preview</Label>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={() => addLesson(section.id)} disabled={lessonSaving}
                                      className="bg-accent text-accent-foreground hover:bg-accent/90">
                                      {lessonSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                                      Save Lesson
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setAddingLessonSectionId(null)}>Cancel</Button>
                                  </div>
                                </div>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => setAddingLessonSectionId(section.id)}>
                                  <Plus className="h-3 w-3 mr-1" /> Add Lesson
                                </Button>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : showCourseForm ? (
              /* Course Form */
              <Card>
                <CardHeader>
                  <CardTitle>{editingCourse ? "Edit Course" : "New Course"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Title *</Label>
                      <Input value={courseForm.title} onChange={(e) => {
                        const title = e.target.value;
                        setCourseForm({ ...courseForm, title, slug: editingCourse ? courseForm.slug : toKebab(title) });
                      }} />
                    </div>
                    <div className="space-y-2">
                      <Label>Slug *</Label>
                      <Input value={courseForm.slug} onChange={(e) => setCourseForm({ ...courseForm, slug: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea rows={3} value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Thumbnail</Label>
                    <div className="flex gap-2 items-center">
                      <Input type="file" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadFile(file, "thumbnails", setThumbnailUploading, (url) => setCourseForm({ ...courseForm, thumbnail_url: url }));
                      }} />
                      {thumbnailUploading && <Loader2 className="h-5 w-5 animate-spin text-accent" />}
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Price (₦)</Label>
                      <Input type="number" value={courseForm.price} onChange={(e) => setCourseForm({ ...courseForm, price: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={courseForm.category} onValueChange={(v) => setCourseForm({ ...courseForm, category: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Level</Label>
                      <Select value={courseForm.level} onValueChange={(v) => setCourseForm({ ...courseForm, level: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {levels.map((l) => <SelectItem key={l} value={l} className="capitalize">{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <Switch checked={courseForm.status === "published"}
                        onCheckedChange={(v) => setCourseForm({ ...courseForm, status: v ? "published" : "draft" })} />
                      <Label>{courseForm.status === "published" ? "Published" : "Draft"}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={courseForm.is_affiliate_enabled}
                        onCheckedChange={(v) => setCourseForm({ ...courseForm, is_affiliate_enabled: v })} />
                      <Label>Affiliate Enabled</Label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveCourse} disabled={courseSaving} className="bg-accent text-accent-foreground hover:bg-accent/90">
                      {courseSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      {editingCourse ? "Update Course" : "Create Course"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowCourseForm(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Course List */
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>My Courses</CardTitle>
                      <CardDescription>Manage your course catalogue</CardDescription>
                    </div>
                    <Button onClick={openNewCourseForm} className="bg-accent text-accent-foreground hover:bg-accent/90">
                      <Plus className="mr-2 h-4 w-4" /> New Course
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {coursesLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
                  ) : courses.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No courses yet. Create your first course!</p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {courses.map((c) => (
                        <Card key={c.id} className="overflow-hidden">
                          <div className="aspect-video bg-muted">
                            {c.thumbnail_url ? (
                              <img src={c.thumbnail_url} alt={c.title} className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                              <div className="flex h-full items-center justify-center"><BookOpen className="h-10 w-10 text-muted-foreground/30" /></div>
                            )}
                          </div>
                          <CardContent className="p-4 space-y-3">
                            <h3 className="font-heading font-semibold line-clamp-2">{c.title}</h3>
                            <div className="flex items-center gap-2">
                              <Badge variant={c.status === "published" ? "default" : "secondary"}>{c.status}</Badge>
                              <span className="text-xs text-muted-foreground">{c.enrollment_count} students</span>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => openEditCourseForm(c)}>
                                <Edit className="h-3 w-3 mr-1" /> Edit
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setActiveCurriculumCourseId(c.id); fetchSections(c.id); }}>
                                <BookOpen className="h-3 w-3 mr-1" /> Curriculum
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete course?</AlertDialogTitle>
                                    <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteCourse(c.id)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ────── MY STUDENTS ────── */}
          <TabsContent value="students">
            <Card>
              <CardHeader><CardTitle>My Students</CardTitle></CardHeader>
              <CardContent>
                {studentsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
                ) : students.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No students enrolled yet.</p>
                ) : (
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Course</TableHead>
                          <TableHead>Enrolled</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead>Certificate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.map((s, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{s.full_name}</TableCell>
                            <TableCell className="text-muted-foreground">{s.email}</TableCell>
                            <TableCell>{s.course_title}</TableCell>
                            <TableCell className="text-muted-foreground">{new Date(s.enrolled_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                              {s.total_lessons > 0 ? `${Math.round((s.completed_lessons / s.total_lessons) * 100)}%` : "0%"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={s.certificate_issued ? "default" : "secondary"}>
                                {s.certificate_issued ? "Yes" : "No"}
                              </Badge>
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

          {/* ────── EARNINGS ────── */}
          <TabsContent value="earnings">
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Total Earned", value: `₦${totalEarned.toLocaleString()}`, icon: DollarSign },
                  { label: "This Month", value: `₦${monthEarned.toLocaleString()}`, icon: DollarSign },
                  { label: "Total Students", value: totalStudents.toString(), icon: Users },
                  { label: "Total Courses", value: totalCourses.toString(), icon: BookOpen },
                ].map((card) => (
                  <Card key={card.label}>
                    <CardContent className="flex items-center gap-4 p-6">
                      <div className="rounded-full bg-accent/10 p-3"><card.icon className="h-5 w-5 text-accent" /></div>
                      <div>
                        <p className="text-sm text-muted-foreground">{card.label}</p>
                        <p className="font-heading text-2xl font-bold">{card.value}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader><CardTitle>Transactions</CardTitle></CardHeader>
                <CardContent>
                  {payments.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No transactions yet.</p>
                  ) : (
                    <div className="overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Student</TableHead>
                            <TableHead>Course</TableHead>
                            <TableHead>Gateway</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments.map((p, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-muted-foreground">{new Date(p.paid_at).toLocaleDateString()}</TableCell>
                              <TableCell className="font-medium">{p.full_name}</TableCell>
                              <TableCell>{p.course_title}</TableCell>
                              <TableCell><Badge variant="secondary">{p.gateway || "—"}</Badge></TableCell>
                              <TableCell><Badge variant={p.status === "completed" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                              <TableCell className="text-right font-medium">₦{p.amount?.toLocaleString()}</TableCell>
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

          {/* ────── ANALYTICS ────── */}
          <TabsContent value="analytics">
            {analyticsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader><CardTitle>Monthly Revenue</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={monthlyRevenue}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(v: number) => `₦${v.toLocaleString()}`} />
                          <Line type="monotone" dataKey="revenue" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Enrollments per Course</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={courseEnrollments}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="course" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-sm text-muted-foreground">Avg Order Value</p>
                      <p className="font-heading text-2xl font-bold mt-1">
                        ₦{payments.length > 0 ? Math.round(totalEarned / payments.length).toLocaleString() : 0}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-sm text-muted-foreground">Conversion Rate</p>
                      <p className="font-heading text-2xl font-bold mt-1">—</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-sm text-muted-foreground">Top Course</p>
                      <p className="font-heading text-lg font-bold mt-1 line-clamp-1">
                        {courseEnrollments.length > 0
                          ? courseEnrollments.reduce((a, b) => (a.count > b.count ? a : b)).course
                          : "—"}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ────── SETTINGS ────── */}
          <TabsContent value="settings">
            <div className="space-y-6">
              {/* Space settings (reuse) */}
              <Card>
                <CardHeader><CardTitle>Academy Settings</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Subdomain</Label>
                      <Input value={space.subdomain}
                        onChange={(e) => setSpace({ ...space, subdomain: e.target.value.toLowerCase().replace(/\s/g, "") })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Custom Domain</Label>
                      <Input value={space.custom_domain || ""}
                        onChange={(e) => setSpace({ ...space, custom_domain: e.target.value || null })} />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Logo</Label>
                      <Input type="file" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadFile(file, "whitelabel_assets", setLogoUploading, (url) => setSpace({ ...space, logo_url: url }));
                      }} />
                    </div>
                    <div className="space-y-2">
                      <Label>Banner</Label>
                      <Input type="file" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadFile(file, "whitelabel_assets", setBannerUploading, (url) => setSpace({ ...space, banner_url: url }));
                      }} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Brand Color</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={space.brand_color} className="h-10 w-16 p-1"
                        onChange={(e) => setSpace({ ...space, brand_color: e.target.value })} />
                      <Input value={space.brand_color} onChange={(e) => setSpace({ ...space, brand_color: e.target.value })} />
                    </div>
                  </div>
                  <Button onClick={saveSpace} disabled={spaceSaving} className="bg-accent text-accent-foreground hover:bg-accent/90">
                    {spaceSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Settings
                  </Button>
                </CardContent>
              </Card>

              {/* Change Password */}
              <Card>
                <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>New Password</Label>
                      <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirm Password</Label>
                      <Input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
                    </div>
                  </div>
                  <Button onClick={changePassword} disabled={passwordSaving} variant="outline">
                    {passwordSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Update Password
                  </Button>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="border-destructive/30">
                <CardHeader><CardTitle className="text-destructive">Danger Zone</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">Type "DELETE" to confirm account deletion.</p>
                  <div className="flex gap-2">
                    <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="Type DELETE" />
                    <Button variant="destructive" disabled={deleteConfirm !== "DELETE"} onClick={deleteAccount}>
                      Delete Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default WhitelabelDashboard;
