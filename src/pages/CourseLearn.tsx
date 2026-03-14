import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, Circle, ChevronLeft, Menu, X, PlayCircle, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Section {
  id: string;
  title: string;
  order_index: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  video_url: string | null;
  duration: number | null;
  order_index: number;
  section_id: string;
}

const getVideoType = (url: string | null) => {
  if (!url) return "none";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("vimeo.com")) return "vimeo";
  return "direct";
};

const getYouTubeId = (url: string) => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1] || "";
};

const getVimeoId = (url: string) => {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match?.[1] || "";
};

const CourseLearn = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [courseTitle, setCourseTitle] = useState("");
  const [courseId, setCourseId] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  const hasMarkedRef = useRef(false);

  useEffect(() => {
    if (!user || !slug) return;

    const fetchData = async () => {
      const { data: course } = await supabase
        .from("courses")
        .select("id, title, slug")
        .eq("slug", slug)
        .single();

      if (!course) { navigate("/courses"); return; }

      setCourseTitle(course.title);
      setCourseId(course.id);

      // Sections
      const { data: sectionsData } = await supabase
        .from("course_sections")
        .select("id, title, order_index")
        .eq("course_id", course.id)
        .order("order_index", { ascending: true });

      // Lessons from lessons_view
      const { data: lessonsData } = await supabase
        .from("lessons_view")
        .select("id, section_id, title, video_url, duration, order_index")
        .eq("course_id", course.id)
        .order("order_index", { ascending: true });

      // Progress
      const { data: progress } = await supabase
        .from("lesson_progress")
        .select("lesson_id")
        .eq("student_id", user.id)
        .eq("completed", true);

      setCompletedIds(new Set(progress?.map((p: any) => p.lesson_id) || []));

      const lessonsMap = new Map<string, Lesson[]>();
      lessonsData?.forEach((l: any) => {
        const arr = lessonsMap.get(l.section_id) || [];
        arr.push(l);
        lessonsMap.set(l.section_id, arr);
      });

      const builtSections: Section[] = (sectionsData || []).map((s: any) => ({
        ...s,
        lessons: (lessonsMap.get(s.id) || []).sort((a, b) => a.order_index - b.order_index),
      }));

      setSections(builtSections);
      const firstLesson = builtSections[0]?.lessons[0];
      if (firstLesson) setActiveLesson(firstLesson);
      setLoading(false);
    };

    fetchData();
  }, [user, slug, navigate]);

  const markLessonComplete = useCallback(async (lessonId: string) => {
    if (!user || hasMarkedRef.current || completedIds.has(lessonId)) return;
    hasMarkedRef.current = true;

    await supabase.from("lesson_progress").upsert(
      { student_id: user.id, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() },
      { onConflict: "student_id,lesson_id" }
    );
    setCompletedIds((prev) => new Set(prev).add(lessonId));
    toast({ title: "Lesson completed! ✅" });
  }, [user, completedIds]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !activeLesson) return;
    const pct = video.currentTime / video.duration;
    if (pct >= 0.9) markLessonComplete(activeLesson.id);
  }, [activeLesson, markLessonComplete]);

  const selectLesson = (lesson: Lesson) => {
    setActiveLesson(lesson);
    hasMarkedRef.current = false;
    setSidebarOpen(false);
  };

  // all lessons flat
  const allLessons = sections.flatMap((s) => s.lessons);
  const currentIndex = allLessons.findIndex((l) => l.id === activeLesson?.id);
  const nextLesson = currentIndex >= 0 && currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  const totalLessons = allLessons.length;
  const completedCount = allLessons.filter((l) => completedIds.has(l.id)).length;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  const videoType = getVideoType(activeLesson?.video_url || null);

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground"><ChevronLeft className="h-5 w-5" /></Link>
          <h1 className="font-heading text-sm font-semibold line-clamp-1">{courseTitle}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{completedCount}/{totalLessons} completed</span>
          <button className="lg:hidden text-foreground" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT SIDEBAR */}
        <aside className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} fixed left-0 top-14 bottom-0 z-40 w-72 border-r bg-card transition-transform lg:relative lg:top-0 lg:translate-x-0`}>
          <ScrollArea className="h-full">
            <div className="p-4">
              <h3 className="font-heading text-sm font-semibold text-muted-foreground mb-3">Course Content</h3>
              {sections.map((section) => (
                <div key={section.id} className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{section.title}</p>
                  <ul className="space-y-1">
                    {section.lessons.map((lesson) => {
                      const isActive = activeLesson?.id === lesson.id;
                      const isCompleted = completedIds.has(lesson.id);
                      return (
                        <li key={lesson.id}>
                          <button
                            onClick={() => selectLesson(lesson)}
                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                              isActive ? "bg-accent text-accent-foreground font-medium" : "text-foreground hover:bg-muted/50"
                            }`}
                          >
                            {isCompleted
                              ? <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                              : <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                            }
                            <span className="line-clamp-2 flex-1">{lesson.title}</span>
                            {lesson.duration != null && (
                              <span className="shrink-0 text-xs text-muted-foreground">{Math.ceil(lesson.duration / 60)}m</span>
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

        {/* CENTER - Video */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="aspect-video bg-black w-full shrink-0">
            {videoType === "youtube" && activeLesson?.video_url && (
              <iframe
                src={`https://www.youtube.com/embed/${getYouTubeId(activeLesson.video_url)}`}
                width="100%" height="100%" allowFullScreen className="h-full w-full"
              />
            )}
            {videoType === "vimeo" && activeLesson?.video_url && (
              <iframe
                src={`https://player.vimeo.com/video/${getVimeoId(activeLesson.video_url)}`}
                width="100%" height="100%" allowFullScreen className="h-full w-full"
              />
            )}
            {videoType === "direct" && activeLesson?.video_url && (
              <video
                ref={videoRef}
                key={activeLesson.id}
                src={activeLesson.video_url}
                controls className="h-full w-full"
                onTimeUpdate={handleTimeUpdate}
              />
            )}
            {videoType === "none" && (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <PlayCircle className="mx-auto h-16 w-16 opacity-30" />
                  <p className="mt-2 text-sm">No video available</p>
                </div>
              </div>
            )}
          </div>

          <div className="p-6">
            <h2 className="font-heading text-xl font-bold">{activeLesson?.title}</h2>
            {activeLesson && !completedIds.has(activeLesson.id) && (videoType === "youtube" || videoType === "vimeo" || videoType === "none") && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => markLessonComplete(activeLesson.id)}>
                <CheckCircle className="mr-2 h-4 w-4" /> Mark as Complete
              </Button>
            )}
            {activeLesson && completedIds.has(activeLesson.id) && (
              <p className="mt-4 text-sm text-accent flex items-center gap-1"><CheckCircle className="h-4 w-4" /> Completed</p>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <aside className="hidden xl:block w-60 border-l bg-card p-4 shrink-0">
          <h3 className="font-heading text-sm font-semibold mb-3">{courseTitle}</h3>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-accent">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>
          {nextLesson && (
            <Button
              size="sm"
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => selectLesson(nextLesson)}
            >
              Next Lesson <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </aside>
      </div>
    </div>
  );
};

export default CourseLearn;
