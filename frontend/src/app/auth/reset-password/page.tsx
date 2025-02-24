"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { AuthHeader } from "@/components/auth/auth-header";
import { authService } from "@/lib/api/auth";
import { ToastAction } from "@/components/ui/toast";
import { useCooldown } from "@/hooks/use-cooldown";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResendLoading, setIsResendLoading] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const { 
    remainingTime, 
    isActive: isCooldownActive, 
    startCooldown 
  } = useCooldown(60);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsLoading(true);
      const result = await authService.resetPassword({ 
        email, 
        type: 'request',
        newPassword: '', // Not used for request type
        confirmNewPassword: '' // Not used for request type
      });

      if ('error' in result) {
        throw new Error(result.message);
      }

      toast({
        title: "Password Reset",
        description: result.message || "If an account exists, a password reset link has been sent to your email.",
      });

      router.push("/auth/login");
    } catch (error: any) {
      // Handle specific error scenarios
      if (error.response?.data?.code === "EMAIL_DELIVERY_FAILED") {
        const retryAfter = error.response.data.retryAfter || 60;
        startCooldown();

        toast({
          title: "Reset Password Failed",
          description: `Failed to send password reset email. Please try again in ${retryAfter} seconds.`,
          variant: "destructive",
          action: isCooldownActive ? undefined : (
            <ToastAction
              altText="Resend password reset email"
              onClick={handleResendResetPassword}
            >
              Resend Email
            </ToastAction>
          ),
        });
      } else {
        toast({
          title: "Reset Failed",
          description: error.message || "Unable to process password reset",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendResetPassword = async () => {
    if (isCooldownActive) return;

    try {
      setIsResendLoading(true);
      await authService.resetPassword({ 
        email, 
        type: 'request',
        newPassword: '', // Not used for request type
        confirmNewPassword: '' // Not used for request type
      });

      startCooldown();
      toast({
        title: "Password Reset Email Resent",
        description: `A new password reset email has been sent. You can resend again in ${remainingTime} seconds.`,
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Resend Failed",
        description:
          error.response?.data?.message ||
          "Unable to resend password reset email. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-purple-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <AuthHeader subtitle="Reset Your Password" />
        <form
          className="mt-8 space-y-6 bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-2xl shadow-2xl"
          onSubmit={handleResetPassword}
        >
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <Label htmlFor="email" className="text-white">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-2 bg-white/10 border-white/20 text-white placeholder-white/50 appearance-none relative block w-full px-3 py-2 border rounded-md focus:outline-none focus:z-10 sm:text-sm"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-all duration-200"
            >
              {isLoading ? "Sending..." : "Reset Password"}
            </Button>
          </div>

          <div className="text-center mt-4">
            <Link 
              href="/auth/login" 
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors duration-200"
            >
              Remember your password? Log in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
