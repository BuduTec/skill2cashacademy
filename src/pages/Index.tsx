import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { BookOpen, DollarSign, Users, Zap, ArrowRight, CheckCircle } from "lucide-react";

const features = [
  { icon: BookOpen, title: "Expert-Led Courses", desc: "Learn from industry professionals with real-world experience." },
  { icon: DollarSign, title: "Monetize Your Skills", desc: "Turn what you learn into income with our proven frameworks." },
  { icon: Users, title: "Community Support", desc: "Join a thriving community of learners and mentors." },
  { icon: Zap, title: "Fast-Track Learning", desc: "Structured paths designed to get you earning quickly." },
];

const benefits = [
  "Lifetime access to all course materials",
  "Certificate of completion for each course",
  "1-on-1 mentorship opportunities",
  "Real projects to build your portfolio",
];

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <h1 className="font-heading text-xl font-bold text-foreground">
            Skill<span className="text-accent">2</span>Cash
          </h1>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/dashboard">
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                  Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link to="/register">
                  <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-primary py-24 md:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(349_79%_59%/0.15),transparent_60%)]" />
        <div className="container relative text-center">
          <span className="mb-4 inline-block rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent">
            Transform Your Future
          </span>
          <h2 className="mx-auto max-w-3xl font-heading text-4xl font-bold leading-tight text-primary-foreground md:text-6xl">
            Learn Skills That <span className="text-accent">Pay The Bills</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-primary-foreground/70">
            Master in-demand skills through expert-led courses and start earning. 
            Your journey from learning to earning starts here.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link to="/register">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 px-8 text-base">
                Start Learning Free <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 px-8 text-base">
                Browse Courses
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container">
          <h3 className="text-center font-heading text-3xl font-bold text-foreground">
            Why Skill<span className="text-accent">2</span>Cash?
          </h3>
          <p className="mx-auto mt-3 max-w-lg text-center text-muted-foreground">
            Everything you need to go from zero to earning with high-demand skills.
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="group rounded-xl border bg-card p-6 transition-shadow hover:shadow-lg">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                  <f.icon className="h-6 w-6" />
                </div>
                <h4 className="font-heading text-lg font-semibold text-card-foreground">{f.title}</h4>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-secondary py-20">
        <div className="container grid items-center gap-12 md:grid-cols-2">
          <div>
            <h3 className="font-heading text-3xl font-bold text-foreground">
              Everything You Need to <span className="text-accent">Succeed</span>
            </h3>
            <p className="mt-4 text-muted-foreground">
              Our platform is designed to take you from learning to earning with comprehensive support at every step.
            </p>
            <ul className="mt-8 space-y-4">
              {benefits.map((b) => (
                <li key={b} className="flex items-center gap-3 text-foreground">
                  <CheckCircle className="h-5 w-5 shrink-0 text-accent" />
                  {b}
                </li>
              ))}
            </ul>
            <Link to="/register" className="mt-8 inline-block">
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                Join Now — It's Free
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative h-72 w-72 rounded-2xl bg-primary p-8 text-center">
              <div className="absolute -right-4 -top-4 rounded-full bg-accent px-4 py-2 font-heading text-sm font-bold text-accent-foreground shadow-lg">
                FREE
              </div>
              <div className="flex h-full flex-col items-center justify-center">
                <span className="font-heading text-5xl font-bold text-primary-foreground">500+</span>
                <span className="mt-2 text-primary-foreground/70">Students Learning</span>
                <span className="mt-6 font-heading text-3xl font-bold text-accent">50+</span>
                <span className="text-primary-foreground/70">Courses Available</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container text-center">
          <h3 className="font-heading text-3xl font-bold text-foreground">
            Ready to Start <span className="text-accent">Earning</span>?
          </h3>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            Join thousands of students who have transformed their careers with Skill2Cash Academy.
          </p>
          <Link to="/register" className="mt-8 inline-block">
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 px-8">
              Create Free Account <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-primary py-8">
        <div className="container flex flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="font-heading text-sm font-bold text-primary-foreground">
            Skill<span className="text-accent">2</span>Cash Academy
          </span>
          <p className="text-sm text-primary-foreground/50">
            © {new Date().getFullYear()} Skill2Cash. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
