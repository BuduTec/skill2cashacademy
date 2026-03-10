import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen, Clock, BarChart3, User, PlayCircle, CheckCircle, ArrowLeft, Menu, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail_url: string | null;
  price: number;
  category: string;
  level: string;
  instructor_id: string;
  what_you_learn: string[] | null;
  requirements: string[] | null;
}

interface Section {
  id: string;
  title: string;
  position: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  duration_minutes: number | null;
  is_preview: boolean;
  position: number;
}

interface InstructorProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio?: string | null;
}

const levelColors: Record<string, string> = {
  beginner: "bg-green-100 text-green-800",
  intermediate: "bg-yellow-100 text-yellow-800",
  advanced: "bg-red-100 text-red-800",
};

const CourseDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [instructor, setInstructor] = useState<InstructorProfile | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!slug) return;

      const { data: courseData } = await supabase
        .from("courses")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .single();

      if (!courseData) {
        setLoading(false);
        return;
      }

      setCourse(courseData as Course);

      // Fetch instructor
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", courseData.instructor_id)
        .single();
      setInstructor(profile as InstructorProfile | null);

      // Fetch sections + lessons
      const { data: sectionsData } = await supabase
        .from("course_sections")
        .select("id, title, position")
        .eq("course_id", courseData.id)
        .order("position");

      if (sectionsData && sectionsData.length > 0) {
        const sectionIds = sectionsData.map((s: any) => s.id);
        const { data: lessonsData } = await supabase
          .from("lessons")
          .select("id, title, duration_minutes, is_preview, position, section_id")
          .in("section_id", sectionIds)
          .order("position");

        const lessonsMap = new Map<string, Lesson[]>();
        lessonsData?.forEach((l: any) => {
          const arr = lessonsMap.get(l.section_id) || [];
          arr.push(l);
          lessonsMap.set(l.section_id, arr);
        });

        setSections(
          sectionsData.map((s: any) => ({ ...s, lessons: lessonsMap.get(s.id) || [] }))
        );
      }

      // Check enrollment
      if (user) {
        const { data: enrollment } = await supabase
          .from("enrollments")
          .select("id")
          .eq("course_id", courseData.id)
          .eq("user_id", user.id)
          .limit(1);
        setEnrolled(!!(enrollment && enrollment.length > 0));
      }

      setLoading(false);
    };

    fetchCourse();
  }, [slug, user]);

  const totalLessons = sections.reduce((acc, s) => acc + s.lessons.length, 0);
  const totalDuration = sections.reduce(
    (acc, s) => acc + s.lessons.reduce((a, l) => a + (l.duration_minutes || 0), 0),
    0
  );

  const handleEnroll = async () => {
    if (!user) {
      toast({ title: "Please sign in first", variant: "destructive" });
      return;
    }
    if (!course) return;
    setEnrolling(true);

    const { error } = await supabase.from("enrollments").insert({
      user_id: user.id,
      course_id: course.id,
    });

    setEnrolling(false);
    if (error) {
      toast({ title: "Enrollment failed", description: error.message, variant: "destructive" });
    } else {
      setEnrolled(true);
      toast({ title: "Enrolled!", description: "You can now access all lessons." });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <h1 className="font-heading text-2xl font-bold text-foreground">Course not found</h1>
        <Link to="/courses"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Courses</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="font-heading text-xl font-bold text-foreground">
            Skill<span className="text-accent">2</span>Cash
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">Home</Link>
            <Link to="/courses" className="text-sm font-medium text-muted-foreground hover:text-foreground">Courses</Link>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <Link to="/dashboard"><Button className="bg-accent text-accent-foreground hover:bg-accent/90">Dashboard</Button></Link>
            ) : (
              <>
                <Link to="/login"><Button variant="ghost">Sign In</Button></Link>
                <Link to="/register"><Button className="bg-accent text-accent-foreground hover:bg-accent/90">Sign Up</Button></Link>
              </>
            )}
          </div>
          <button className="md:hidden text-foreground" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {/* Course Header */}
      <section className="bg-primary py-12">
        <div className="container">
          <Link to="/courses" className="mb-4 inline-flex items-center text-sm text-primary-foreground/60 hover:text-primary-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Courses
          </Link>
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="secondary">{course.category}</Badge>
                <Badge className={`capitalize ${levelColors[course.level] || ""}`}>{course.level}</Badge>
              </div>
              <h1 className="font-heading text-3xl font-bold text-primary-foreground md:text-4xl">
                {course.title}
              </h1>
              <p className="mt-4 text-primary-foreground/70 leading-relaxed">{course.description}</p>
              <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-primary-foreground/60">
                {instructor && (
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4" /> {instructor.full_name}
                  </span>
                )}
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> {totalLessons} lessons
                </span>
                {totalDuration > 0 && (
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" /> {Math.round(totalDuration / 60)}h {totalDuration % 60}m
                  </span>
                )}
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> {course.level}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content + Sidebar */}
      <section className="py-10">
        <div className="container grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
                <TabsTrigger value="instructor">Instructor</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6 space-y-8">
                {course.what_you_learn && course.what_you_learn.length > 0 && (
                  <div className="rounded-xl border bg-card p-6">
                    <h3 className="font-heading text-xl font-semibold text-card-foreground mb-4">What You'll Learn</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {course.what_you_learn.map((item, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                          <span className="text-sm text-card-foreground">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {course.requirements && course.requirements.length > 0 && (
                  <div>
                    <h3 className="font-heading text-xl font-semibold text-foreground mb-4">Requirements</h3>
                    <ul className="list-disc pl-5 space-y-2">
                      {course.requirements.map((req, i) => (
                        <li key={i} className="text-sm text-muted-foreground">{req}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h3 className="font-heading text-xl font-semibold text-foreground mb-4">About This Course</h3>
                  <p className="text-muted-foreground leading-relaxed">{course.description}</p>
                </div>
              </TabsContent>

              <TabsContent value="curriculum" className="mt-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-heading text-xl font-semibold text-foreground">Course Content</h3>
                  <span className="text-sm text-muted-foreground">
                    {sections.length} sections · {totalLessons} lessons
                  </span>
                </div>

                {sections.length === 0 ? (
                  <p className="text-muted-foreground">Curriculum coming soon.</p>
                ) : (
                  <Accordion type="multiple" defaultValue={sections.map((s) => s.id)}>
                    {sections.map((section) => (
                      <AccordionItem key={section.id} value={section.id}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3 text-left">
                            <span className="font-heading font-semibold text-foreground">{section.title}</span>
                            <span className="text-xs text-muted-foreground">
                              {section.lessons.length} lessons
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <ul className="space-y-1">
                            {section.lessons.map((lesson) => (
                              <li
                                key={lesson.id}
                                className="flex items-center justify-between rounded-lg px-4 py-3 hover:bg-muted/50"
                              >
                                <div className="flex items-center gap-3">
                                  <PlayCircle className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm text-foreground">{lesson.title}</span>
                                  {lesson.is_preview && (
                                    <Badge variant="outline" className="text-xs">Preview</Badge>
                                  )}
                                </div>
                                {lesson.duration_minutes && (
                                  <span className="text-xs text-muted-foreground">
                                    {lesson.duration_minutes} min
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </TabsContent>

              <TabsContent value="instructor" className="mt-6">
                {instructor ? (
                  <div className="rounded-xl border bg-card p-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
                        {instructor.avatar_url ? (
                          <img src={instructor.avatar_url} alt={instructor.full_name || ""} className="h-full w-full rounded-full object-cover" />
                        ) : (
                          <User className="h-8 w-8" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-heading text-lg font-semibold text-card-foreground">
                          {instructor.full_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">Instructor</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Instructor info not available.</p>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sticky Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-xl border bg-card p-6 shadow-lg">
              {course.thumbnail_url && (
                <div className="mb-6 aspect-video overflow-hidden rounded-lg">
                  <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover" />
                </div>
              )}
              <div className="mb-6">
                <span className="font-heading text-3xl font-bold text-card-foreground">
                  ₦{course.price?.toLocaleString()}
                </span>
              </div>

              {enrolled ? (
                <Link to="/dashboard">
                  <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" size="lg">
                    Continue Learning <BookOpen className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <Button
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                  size="lg"
                  onClick={handleEnroll}
                  disabled={enrolling}
                >
                  {enrolling ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground border-t-transparent" />
                  ) : (
                    "Enroll Now"
                  )}
                </Button>
              )}

              <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> {totalLessons} lessons</li>
                {totalDuration > 0 && <li className="flex items-center gap-2"><Clock className="h-4 w-4" /> {Math.round(totalDuration / 60)}h {totalDuration % 60}m total</li>}
                <li className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> {course.level} level</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Full lifetime access</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CourseDetail;
