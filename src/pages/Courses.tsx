import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, BookOpen, ArrowRight, Menu, X, Users } from "lucide-react";

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
  instructor_name?: string;
  enrolled_count?: number;
  published: boolean;
}

const levelColors: Record<string, string> = {
  beginner: "bg-green-100 text-green-800",
  intermediate: "bg-yellow-100 text-yellow-800",
  advanced: "bg-red-100 text-red-800",
};

const Courses = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchCourses = async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, title, slug, description, thumbnail_url, price, category, level, instructor_id")
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (data) {
        // Fetch instructor names
        const instructorIds = [...new Set(data.map((c: any) => c.instructor_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", instructorIds);

        const profileMap = new Map(profiles?.map((p: any) => [p.id, p.full_name]) || []);

        // Fetch enrollment counts
        const { data: counts } = await supabase
          .from("course_enrollment_counts")
          .select("course_id, enrolled_count");
        const countMap = new Map(counts?.map((c: any) => [c.course_id, c.enrolled_count]) || []);

        setCourses(
          data.map((c: any) => ({
            ...c,
            instructor_name: profileMap.get(c.instructor_id) || "Instructor",
            enrolled_count: countMap.get(c.id) || 0,
          }))
        );
      }
      setLoading(false);
    };
    fetchCourses();
  }, []);

  const categories = useMemo(
    () => [...new Set(courses.map((c) => c.category).filter(Boolean))],
    [courses]
  );

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      const matchesSearch =
        !search ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || c.category === categoryFilter;
      const matchesLevel = levelFilter === "all" || c.level === levelFilter;
      return matchesSearch && matchesCategory && matchesLevel;
    });
  }, [courses, search, categoryFilter, levelFilter]);

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
            <Link to="/courses" className="text-sm font-medium text-foreground">Courses</Link>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <Link to="/dashboard">
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                  Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
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
        {mobileMenuOpen && (
          <div className="border-t bg-background p-4 md:hidden">
            <div className="flex flex-col gap-4">
              <Link to="/" className="text-sm font-medium text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Home</Link>
              <Link to="/courses" className="text-sm font-medium text-foreground" onClick={() => setMobileMenuOpen(false)}>Courses</Link>
              <div className="flex gap-3 pt-2">
                {user ? (
                  <Link to="/dashboard" className="w-full"><Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Dashboard</Button></Link>
                ) : (
                  <>
                    <Link to="/login" className="flex-1"><Button variant="outline" className="w-full">Sign In</Button></Link>
                    <Link to="/register" className="flex-1"><Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Sign Up</Button></Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="bg-primary py-16">
        <div className="container text-center">
          <h1 className="font-heading text-3xl font-bold text-primary-foreground md:text-5xl">
            Course <span className="text-accent">Marketplace</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/70">
            Discover in-demand digital skills. Learn from top instructors and start earning.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b bg-card py-6">
        <div className="container flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Course Grid */}
      <section className="py-12">
        <div className="container">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <h3 className="mt-4 font-heading text-xl font-semibold text-foreground">No courses found</h3>
              <p className="mt-2 text-muted-foreground">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((course) => (
                <Link key={course.id} to={`/courses/${course.slug}`} className="group">
                  <div className="overflow-hidden rounded-xl border bg-card transition-all hover:shadow-lg hover:border-accent/30">
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
                    <div className="p-5">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="secondary" className="text-xs">{course.category}</Badge>
                        <Badge className={`text-xs capitalize ${levelColors[course.level] || "bg-muted text-muted-foreground"}`}>
                          {course.level}
                        </Badge>
                      </div>
                      <h3 className="mt-3 font-heading text-lg font-semibold text-card-foreground line-clamp-2 group-hover:text-accent transition-colors">
                        {course.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">{course.instructor_name}</p>
                      {(course.enrolled_count ?? 0) > 0 && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" /> {course.enrolled_count} students
                        </p>
                      )}
                      <div className="mt-4 flex items-center justify-between">
                        <span className="font-heading text-xl font-bold text-card-foreground">
                          ₦{course.price?.toLocaleString()}
                        </span>
                        <span className="text-sm text-accent font-medium group-hover:underline">
                          View Course →
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-primary py-8">
        <div className="container text-center">
          <span className="font-heading text-lg font-bold text-primary-foreground">
            Skill<span className="text-accent">2</span>Cash Academy
          </span>
          <p className="mt-1 text-sm text-primary-foreground/50">© {new Date().getFullYear()} BUDUTECH LTD</p>
        </div>
      </footer>
    </div>
  );
};

export default Courses;
