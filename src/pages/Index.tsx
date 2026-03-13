import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowRight,
  CheckCircle,
  UserPlus,
  BookOpen,
  CreditCard,
  Rocket,
  Share2,
  Building2,
  Globe,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const tiers = [
  {
    name: "Affiliate",
    price: "₦3,000",
    period: "/year",
    popular: false,
    benefits: [
      "Earn commissions on every referral",
      "Access to referral dashboard",
      "Unique referral link & tracking",
      "Community chat access",
      "Monthly payout via bank transfer",
    ],
    icon: Share2,
  },
  {
    name: "Co-Owner",
    price: "₦30,000",
    period: "/year",
    popular: true,
    benefits: [
      "Everything in Referrer plan",
      "Co-branded course storefront",
      "Higher commission rates (up to 40%)",
      "Priority support & mentorship",
      "Access to premium courses library",
      "Revenue sharing on sub-referrals",
    ],
    icon: Building2,
  },
  {
    name: "White-Label Owner",
    price: "₦100,000",
    period: "/year",
    popular: false,
    benefits: [
      "Everything in Co-Owner plan",
      "Fully branded platform (your logo & domain)",
      "Custom course uploads",
      "Unlimited sub-accounts",
      "Dedicated account manager",
      "API access & integrations",
      "Keep up to 70% of revenue",
    ],
    icon: Globe,
  },
];

const studentSteps = [
  { step: "01", title: "Browse & Enroll", desc: "Explore our catalog and enroll in courses that match your goals." },
  { step: "02", title: "Learn & Practice", desc: "Watch expert-led lessons, complete exercises, and build real projects." },
  { step: "03", title: "Earn & Grow", desc: "Apply your skills, get certified, and start earning from day one." },
];

const ownerSteps = [
  { step: "01", title: "Choose Your Plan", desc: "Pick Referrer, Co-Owner, or White-Label based on your ambition." },
  { step: "02", title: "Set Up & Share", desc: "Get your storefront ready, customize your brand, and share your link." },
  { step: "03", title: "Earn Passively", desc: "Earn commissions on every sale — your income grows while you sleep." },
];

const Index = () => {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Navbar */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="font-heading text-xl font-bold text-foreground">
            Skill<span className="text-accent">2</span>Cash
          </Link>

          {/* Desktop nav links */}
          <div className="hidden items-center gap-8 md:flex">
            <a href="#home" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Home
            </a>
            <a href="#tiers" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Courses
            </a>
            <a href="#tiers" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Become an Owner
            </a>
          </div>

          {/* Desktop auth buttons */}
          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <Link to="/dashboard">
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                  Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" className="text-foreground">Sign In</Button>
                </Link>
                <Link to="/register">
                  <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t bg-background p-4 md:hidden">
            <div className="flex flex-col gap-4">
              <a href="#home" className="text-sm font-medium text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Home</a>
              <a href="#tiers" className="text-sm font-medium text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Courses</a>
              <a href="#tiers" className="text-sm font-medium text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Become an Owner</a>
              <div className="flex gap-3 pt-2">
                {user ? (
                  <Link to="/dashboard" className="w-full">
                    <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Dashboard</Button>
                  </Link>
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
      <section id="home" className="relative overflow-hidden bg-primary py-24 md:py-36">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(349_79%_59%/0.18),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(349_79%_59%/0.08),transparent_60%)]" />
        <div className="container relative text-center">
          <span className="mb-6 inline-block rounded-full border border-accent/30 bg-accent/10 px-5 py-2 text-sm font-medium text-accent">
            🚀 Africa's #1 Skill-to-Income Platform
          </span>
          <h1 className="mx-auto max-w-4xl font-heading text-4xl font-bold leading-tight text-primary-foreground md:text-6xl lg:text-7xl">
            Turn Your Skills Into{" "}
            <span className="bg-gradient-to-r from-accent to-[hsl(349_79%_70%)] bg-clip-text text-transparent">
              Income
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-primary-foreground/70 md:text-xl">
            Learn in-demand digital skills, sell courses, or build your own branded academy.
            Start earning from what you know — or what you're about to learn.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a href="#tiers">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 px-8 text-base">
                Browse Courses <BookOpen className="ml-2 h-5 w-5" />
              </Button>
            </a>
            <a href="#tiers">
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 px-8 text-base"
              >
                Join as Owner <Rocket className="ml-2 h-5 w-5" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Membership Tiers */}
      <section id="tiers" className="py-20 md:py-28">
        <div className="container">
          <div className="text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-accent">Membership Plans</span>
            <h2 className="mt-3 font-heading text-3xl font-bold text-foreground md:text-4xl">
              Choose Your Path to <span className="text-accent">Earning</span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
              Whether you want to refer, co-own, or launch your own branded academy — there's a plan for you.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative flex flex-col rounded-2xl border p-8 transition-all hover:shadow-xl ${
                  tier.popular
                    ? "border-accent bg-card shadow-lg shadow-accent/10 scale-[1.02]"
                    : "border-border bg-card hover:border-accent/30"
                }`}
              >
                {tier.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground px-4 py-1">
                    POPULAR
                  </Badge>
                )}
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <tier.icon className="h-6 w-6" />
                </div>
                <h3 className="font-heading text-2xl font-bold text-card-foreground">{tier.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-heading text-4xl font-bold text-card-foreground">{tier.price}</span>
                  <span className="text-muted-foreground">{tier.period}</span>
                </div>
                <ul className="mt-8 flex-1 space-y-3">
                  {tier.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-sm text-card-foreground">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      {b}
                    </li>
                  ))}
                </ul>
                <Link to={`/register?tier=${tier.name.toLowerCase().replace("-", "_").replace(" ", "_")}`} className="mt-8 block">
                  <Button
                    className={`w-full ${
                      tier.popular
                        ? "bg-accent text-accent-foreground hover:bg-accent/90"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                    size="lg"
                  >
                    Join Now <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-secondary py-20 md:py-28">
        <div className="container">
          <div className="text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-accent">How It Works</span>
            <h2 className="mt-3 font-heading text-3xl font-bold text-foreground md:text-4xl">
              Simple Steps to <span className="text-accent">Success</span>
            </h2>
          </div>

          <div className="mt-16 grid gap-16 lg:grid-cols-2">
            {/* For Students */}
            <div>
              <h3 className="mb-8 flex items-center gap-3 font-heading text-xl font-bold text-foreground">
                <BookOpen className="h-6 w-6 text-accent" /> For Students
              </h3>
              <div className="space-y-8">
                {studentSteps.map((s) => (
                  <div key={s.step} className="flex gap-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent font-heading text-lg font-bold text-accent-foreground">
                      {s.step}
                    </div>
                    <div>
                      <h4 className="font-heading text-lg font-semibold text-foreground">{s.title}</h4>
                      <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* For Owners */}
            <div>
              <h3 className="mb-8 flex items-center gap-3 font-heading text-xl font-bold text-foreground">
                <Rocket className="h-6 w-6 text-accent" /> For Owners
              </h3>
              <div className="space-y-8">
                {ownerSteps.map((s) => (
                  <div key={s.step} className="flex gap-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary font-heading text-lg font-bold text-primary-foreground">
                      {s.step}
                    </div>
                    <div>
                      <h4 className="font-heading text-lg font-semibold text-foreground">{s.title}</h4>
                      <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container text-center">
          <h2 className="font-heading text-3xl font-bold text-foreground md:text-4xl">
            Ready to Start <span className="text-accent">Earning</span>?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            Join thousands who are turning their skills into sustainable income with Skill2Cash.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link to="/register">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 px-8">
                <UserPlus className="mr-2 h-5 w-5" /> Create Free Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-primary py-10">
        <div className="container">
          <div className="flex flex-col items-center gap-8 md:flex-row md:justify-between">
            <div>
              <span className="font-heading text-lg font-bold text-primary-foreground">
                Skill<span className="text-accent">2</span>Cash Academy
              </span>
              <p className="mt-1 text-sm text-primary-foreground/50">
                Powered by BUDUTECH LTD
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6">
              <a href="#" className="text-sm text-primary-foreground/60 transition-colors hover:text-primary-foreground">About</a>
              <a href="#" className="text-sm text-primary-foreground/60 transition-colors hover:text-primary-foreground">Contact</a>
              <a href="#" className="text-sm text-primary-foreground/60 transition-colors hover:text-primary-foreground">Terms</a>
              <a href="#" className="text-sm text-primary-foreground/60 transition-colors hover:text-primary-foreground">Privacy</a>
            </div>
          </div>
          <div className="mt-8 border-t border-primary-foreground/10 pt-6 text-center">
            <p className="text-sm text-primary-foreground/40">
              © {new Date().getFullYear()} BUDUTECH LTD. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
