import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Mail } from "lucide-react";

const ForgotPassword = () => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="font-heading text-4xl font-bold text-primary-foreground">
            Skill<span className="text-accent">2</span>Cash
          </h1>
          <p className="mt-2 text-primary-foreground/70">Academy</p>
        </div>

        <Card className="border-0 shadow-2xl">
          {sent ? (
            <>
              <CardHeader className="text-center space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                  <Mail className="h-8 w-8 text-accent" />
                </div>
                <CardTitle className="font-heading text-2xl">Check your email</CardTitle>
                <CardDescription>
                  We sent a password reset link to <strong>{email}</strong>
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Link to="/login" className="w-full">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to login
                  </Button>
                </Link>
              </CardFooter>
            </>
          ) : (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="font-heading text-2xl">Forgot password?</CardTitle>
                <CardDescription>Enter your email and we'll send you a reset link</CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex-col gap-4">
                  <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
                    {loading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground border-t-transparent" />
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>
                  <Link to="/login" className="text-sm text-accent hover:underline">
                    <ArrowLeft className="mr-1 inline h-3 w-3" /> Back to login
                  </Link>
                </CardFooter>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
