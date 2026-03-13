import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, PlayCircle, Award } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardHeader from "@/components/DashboardHeader";

interface EnrolledCourse {
  id: string;
  course_id: string;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  total_lessons: number;
  completed_lessons: number;
  progress: number;
}

const tierLabels: Record<string, string> = {
  referrer: "Affiliate",
  co_owner: "Co-Owner",
  white_label_owner: "White-Label Owner",
};

const Dashboard = () => {
  const { user, profile } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [membershipTier, setMembershipTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch membership tier
      const { data: membership } = await supabase
        .from("memberships")
        .select("tier")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gte("expiry_date", new Date().toISOString())
        .order("expiry_date", { ascending: false })
        .limit(1);

      if (membership && membership.length > 0) {
        setMembershipTier(membership[0].tier);
      }

      // Fetch enrollments with course info
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("id, course_id, courses(id, title, slug, thumbnail_url)")
        .eq("user_id", user.id);

      if (enrollments && enrollments.length > 0) {
        const courseIds = enrollments.map((e: any) => e.course_id);

        // Get total lessons per course
        const { data: lessons } = await supabase
          .from("lessons")
          .select("id, section_id, course_sections(course_id)")
          .in("course_sections.course_id", courseIds);

        // Get completed lessons
        const { data: progress } = await supabase
          .from("lesson_progress")
          .select("lesson_id, completed")
          .eq("user_id", user.id)
          .eq("completed", true);

        const completedSet = new Set(progress?.map((p: any) => p.lesson_id) || []);

        // Count lessons per course
        const lessonCountMap = new Map<string, string[]>();
        lessons?.forEach((l: any) => {
          const courseId = l.course_sections?.course_id;
          if (courseId) {
            const arr = lessonCountMap.get(courseId) || [];
            arr.push(l.id);
            lessonCountMap.set(courseId, arr);
          }
        });

        const mapped: EnrolledCourse[] = enrollments.map((e: any) => {
          const course = e.courses;
          const lessonIds = lessonCountMap.get(e.course_id) || [];
          const total = lessonIds.length;
          const completed = lessonIds.filter((id) => completedSet.has(id)).length;
          return {
            id: e.id,
            course_id: e.course_id,
            title: course?.title || "Untitled",
            slug: course?.slug || "",
            thumbnail_url: course?.thumbnail_url || null,
            total_lessons: total,
            completed_lessons: completed,
            progress: total > 0 ? Math.round((completed / total) * 100) : 0,
          };
        });

        setEnrolledCourses(mapped);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container py-8">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold">
            Welcome back, {profile?.full_name || "there"}! 👋
          </h1>
          <div className="mt-2 flex items-center gap-2">
            {membershipTier && (
              <Badge className="bg-accent text-accent-foreground">
                {tierLabels[membershipTier] || membershipTier}
              </Badge>
            )}
          </div>
        </div>

        {/* Enrolled Courses */}
        <section>
          <h2 className="font-heading text-xl font-semibold mb-4">My Courses</h2>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
            </div>
          ) : enrolledCourses.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground mb-4">You haven't enrolled in any courses yet.</p>
                <Link to="/courses">
                  <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                    Browse Courses
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {enrolledCourses.map((course) => (
                <Link key={course.id} to={`/courses/${course.slug}/learn`} className="group">
                  <Card className="overflow-hidden transition-all hover:shadow-lg hover:border-accent/30">
                    <div className="aspect-video bg-muted overflow-hidden">
                      {course.thumbnail_url ? (
                        <img
                          src={course.thumbnail_url}
                          alt={course.title}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <BookOpen className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-5">
                      <h3 className="font-heading text-lg font-semibold text-card-foreground line-clamp-2 group-hover:text-accent transition-colors">
                        {course.title}
                      </h3>
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {course.completed_lessons}/{course.total_lessons} lessons
                          </span>
                          <span className="font-medium text-accent">{course.progress}%</span>
                        </div>
                        <Progress value={course.progress} className="h-2" />
                      </div>
                      {course.progress === 100 ? (
                        <div className="mt-3 flex items-center gap-1 text-sm text-accent font-medium">
                          <Award className="h-4 w-4" /> Completed
                        </div>
                      ) : (
                        <div className="mt-3 flex items-center gap-1 text-sm text-accent font-medium group-hover:underline">
                          <PlayCircle className="h-4 w-4" /> Continue Learning
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
