import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

interface StoreData {
  owner_id: string;
  store_slug: string;
  logo_url: string;
  banner_url: string;
  bio: string;
  brand_color: string;
  profiles: { full_name: string; avatar_url: string | null };
}

interface StoreCourse {
  custom_price: number | null;
  courses: { id: string; title: string; thumbnail_url: string | null; slug: string; price: number; status?: string };
}

const StorePage = () => {
  const { store_slug } = useParams<{ store_slug: string }>();
  const [store, setStore] = useState<StoreData | null>(null);
  const [courses, setCourses] = useState<StoreCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("co_owner_stores")
        .select("*, profiles(full_name, avatar_url)")
        .eq("store_slug", store_slug)
        .single();

      if (!data) { setNotFound(true); setLoading(false); return; }
      setStore(data as any);

      const { data: storeCourses } = await supabase
        .from("co_owner_course_prices")
        .select("custom_price, courses(id, title, thumbnail_url, slug, price, status)")
        .eq("co_owner_id", (data as any).owner_id);

      setCourses(
        ((storeCourses || []) as any[]).filter((sc) => sc.courses?.status === "published")
      );
      setLoading(false);
    };
    fetch();
  }, [store_slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="font-heading text-3xl font-bold mb-4">Store Not Found</h1>
          <Link to="/"><Button className="bg-accent text-accent-foreground hover:bg-accent/90">Go Home</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: `${store?.brand_color}10` }}>
      {/* Banner */}
      {store?.banner_url && (
        <div className="w-full h-72 overflow-hidden">
          <img src={store.banner_url} alt="Banner" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Profile */}
      <div className="container text-center -mt-10 relative z-10">
        {store?.logo_url && (
          <img src={store.logo_url} alt="Logo" className="h-20 w-20 rounded-full mx-auto border-4 border-background object-cover bg-card" />
        )}
        <h1 className="font-heading text-2xl font-bold mt-3">{store?.profiles?.full_name || "Academy"}</h1>
        {store?.bio && <p className="text-muted-foreground mt-2 max-w-xl mx-auto">{store.bio}</p>}
      </div>

      {/* Courses */}
      <div className="container py-12">
        <h2 className="font-heading text-xl font-semibold mb-6">Available Courses</h2>
        {courses.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No courses available yet.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((sc) => {
              const c = sc.courses;
              const displayPrice = sc.custom_price || c.price;
              return (
                <div key={c.id} className="overflow-hidden rounded-xl border bg-card">
                  <div className="aspect-video bg-muted overflow-hidden">
                    {c.thumbnail_url ? (
                      <img src={c.thumbnail_url} alt={c.title} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full items-center justify-center"><BookOpen className="h-12 w-12 text-muted-foreground/30" /></div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-heading text-lg font-semibold line-clamp-2">{c.title}</h3>
                    <p className="mt-2 text-xl font-bold text-accent">₦{displayPrice?.toLocaleString()}</p>
                    <Link to={`/courses/${c.slug}?co_owner=${store?.owner_id}`}>
                      <Button className="w-full mt-4 bg-accent text-accent-foreground hover:bg-accent/90">Enroll Now</Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <footer className="border-t py-8 text-center">
        <Link to="/" className="font-heading text-lg font-bold">Skill<span className="text-accent">2</span>Cash Academy</Link>
        <p className="mt-1 text-sm text-muted-foreground">© {new Date().getFullYear()} BUDUTECH LTD</p>
      </footer>
    </div>
  );
};

export default StorePage;
