"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { emailVerificationThunks } from "@/lib/thunks/email-verification";
import { AuthHeader } from "@/components/auth/auth-header";

export default function VerifyPage() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [verificationType, setVerificationType] = useState<"registration" | "reset-password">("registration");

  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const urlToken = searchParams.get("token");
    const urlEmail = searchParams.get("email");
    const urlType = searchParams.get("type");

    if (urlToken) {
      setToken(urlToken);
    }
    if (urlEmail) {
      setEmail(urlEmail);
    }
    if (urlType === "reset-password") {
      setVerificationType("reset-password");
    }
  }, [searchParams]);

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (!token) {
      toast({
        title: "Invalid Link",
        description: "Verification link is invalid or expired",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await emailVerificationThunks.verifyEmail({
        token,
        password,
        confirmPassword,
        type: verificationType,
        email
      })();

      toast({
        title: "Success",
        description: verificationType === "registration" 
          ? "Registration completed successfully" 
          : "Password reset successful",
      });

      router.push("/auth/login");
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Unable to complete verification",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-purple-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <AuthHeader 
          subtitle={
            verificationType === "registration" 
              ? "Complete Registration" 
              : "Reset Password"
          } 
        />
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-2xl shadow-2xl">
          <form onSubmit={handleVerification} className="space-y-6">
            <div>
              <Label htmlFor="password" className="text-white">
                {verificationType === "registration" ? "Set Password" : "New Password"}
              </Label>
              <Input 
                id="password"
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                className="mt-2 bg-white/10 border-white/20 text-white placeholder-white/50"
              />
            </div>
            
            <div>
              <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
              <Input 
                id="confirmPassword"
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                required
                className="mt-2 bg-white/10 border-white/20 text-white placeholder-white/50"
              />
            </div>
            
            <Button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white transition-all duration-300 ease-in-out transform hover:scale-105"
            >
              {isLoading 
                ? "Processing..." 
                : (verificationType === "registration" 
                  ? "Complete Registration" 
                  : "Reset Password")
              }
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
