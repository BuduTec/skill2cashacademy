import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, Circle, ChevronLeft, Menu, X, PlayCircle, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Section {
  id: string;
  title: string;
  position: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  video_url: string | null;
  duration_minutes: number | null;
  position: number;
  section_id: string;
}

const CourseLearn = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [courseTitle, setCourseTitle] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const hasMarkedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !slug) return;

    const fetchData = async () => {
      // Get course
      const { data: course } = await supabase
        .from("courses")
        .select("id, title, slug")
        .eq("slug", slug)
        .single();

      if (!course) {
        navigate("/courses");
        return;
      }

      // Check enrollment
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("id")
        .eq("course_id", course.id)
        .eq("user_id", user.id)
        .limit(1);

      if (!enrollment || enrollment.length === 0) {
        toast({ title: "Not enrolled", description: "Please enroll first.", variant: "destructive" });
        navigate(`/courses/${slug}`);
        return;
      }

      setCourseTitle(course.title);

      // Fetch sections + lessons
      const { data: sectionsData } = await supabase
        .from("course_sections")
        .select("id, title, position")
        .eq("course_id", course.id)
        .order("position");

      if (sectionsData && sectionsData.length > 0) {
        const sectionIds = sectionsData.map((s: any) => s.id);
        const { data: lessonsData } = await supabase
          .from("lessons")
          .select("id, title, video_url, duration_minutes, position, section_id")
          .in("section_id", sectionIds)
          .order("position");

        const lessonsMap = new Map<string, Lesson[]>();
        lessonsData?.forEach((l: any) => {
          const arr = lessonsMap.get(l.section_id) || [];
          arr.push(l);
          lessonsMap.set(l.section_id, arr);
        });

        const builtSections = sectionsData.map((s: any) => ({
          ...s,
          lessons: lessonsMap.get(s.id) || [],
        }));
        setSections(builtSections);

        // Set first lesson as active
        const firstLesson = builtSections[0]?.lessons[0];
        if (firstLesson) setActiveLesson(firstLesson);

        // Fetch progress
        const allLessonIds = lessonsData?.map((l: any) => l.id) || [];
        if (allLessonIds.length > 0) {
          const { data: progress } = await supabase
            .from("lesson_progress")
            .select("lesson_id")
            .eq("user_id", user.id)
            .eq("completed", true)
            .in("lesson_id", allLessonIds);

          setCompletedLessons(new Set(progress?.map((p: any) => p.lesson_id) || []));
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [user, slug, navigate]);

  const markComplete = useCallback(async (lessonId: string) => {
    if (!user || marking || completedLessons.has(lessonId)) return;
    setMarking(true);

    const { error } = await supabase
      .from("lesson_progress")
      .upsert(
        { user_id: user.id, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() },
        { onConflict: "user_id,lesson_id" }
      );

    if (!error) {
      setCompletedLessons((prev) => new Set(prev).add(lessonId));
      toast({ title: "Lesson completed! ✅" });
    }
    setMarking(false);
  }, [user, marking, completedLessons]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !activeLesson) return;
    if (hasMarkedRef.current === activeLesson.id) return;

    const pct = video.currentTime / video.duration;
    if (pct >= 0.9) {
      hasMarkedRef.current = activeLesson.id;
      markComplete(activeLesson.id);
    }
  }, [activeLesson, markComplete]);

  const selectLesson = (lesson: Lesson) => {
    setActiveLesson(lesson);
    hasMarkedRef.current = null;
    setSidebarOpen(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  const totalLessons = sections.reduce((a, s) => a + s.lessons.length, 0);
  const completedCount = completedLessons.size;

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-heading text-sm font-semibold line-clamp-1">{courseTitle}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {completedCount}/{totalLessons} completed
          </span>
          <button
            className="lg:hidden text-foreground"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Video area */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="aspect-video bg-black w-full shrink-0">
            {activeLesson?.video_url ? (
              <video
                ref={videoRef}
                key={activeLesson.id}
                src={activeLesson.video_url}
                controls
                className="h-full w-full"
                onTimeUpdate={handleTimeUpdate}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <PlayCircle className="mx-auto h-16 w-16 opacity-30" />
                  <p className="mt-2 text-sm">No video available for this lesson</p>
                </div>
              </div>
            )}
          </div>

          <div className="p-6">
            <h2 className="font-heading text-xl font-bold">{activeLesson?.title}</h2>
            {activeLesson && !completedLessons.has(activeLesson.id) && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => markComplete(activeLesson.id)}
                disabled={marking}
              >
                <CheckCircle className="mr-2 h-4 w-4" /> Mark as Complete
              </Button>
            )}
            {activeLesson && completedLessons.has(activeLesson.id) && (
              <p className="mt-4 text-sm text-accent flex items-center gap-1">
                <CheckCircle className="h-4 w-4" /> Completed
              </p>
            )}
          </div>
        </div>

        {/* Lesson sidebar */}
        <aside
          className={`${
            sidebarOpen ? "translate-x-0" : "translate-x-full"
          } fixed right-0 top-14 bottom-0 z-40 w-80 border-l bg-card transition-transform lg:relative lg:top-0 lg:translate-x-0`}
        >
          <ScrollArea className="h-full">
            <div className="p-4">
              <h3 className="font-heading text-sm font-semibold text-muted-foreground mb-3">
                Course Content
              </h3>
              {sections.map((section) => (
                <div key={section.id} className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    {section.title}
                  </p>
                  <ul className="space-y-1">
                    {section.lessons.map((lesson) => {
                      const isActive = activeLesson?.id === lesson.id;
                      const isCompleted = completedLessons.has(lesson.id);
                      return (
                        <li key={lesson.id}>
                          <button
                            onClick={() => selectLesson(lesson)}
                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                              isActive
                                ? "bg-accent/10 text-accent font-medium"
                                : "text-foreground hover:bg-muted/50"
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle className="h-4 w-4 shrink-0 text-accent" />
                            ) : (
                              <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                            )}
                            <span className="line-clamp-2">{lesson.title}</span>
                            {lesson.duration_minutes && (
                              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                                {lesson.duration_minutes}m
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
};

export default CourseLearn;
