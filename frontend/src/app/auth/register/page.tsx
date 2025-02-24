"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { authService } from "@/lib/api/auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { user_type } from "@/lib/types/auth";
import { AuthHeader } from "@/components/auth/auth-header";
import { ToastAction } from "@/components/ui/toast";
import { useCooldown } from "@/hooks/use-cooldown";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [userType, setUserType] = useState<user_type>("individual");
  const [isLoading, setIsLoading] = useState(false);
  const [isResendLoading, setIsResendLoading] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const { 
    remainingTime, 
    isActive: isCooldownActive, 
    startCooldown 
  } = useCooldown(60);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsLoading(true);
      const registrationResponse = await authService.register({
        name,
        email,
        userType,
      });

      if (registrationResponse.error) {
        throw new Error(registrationResponse.message);
      }

      toast({
        title: "Verification Email Sent",
        description: "Please check your email to complete registration",
      });

      router.push("/auth/login");
    } catch (error: any) {
      // Handle specific error scenarios
      if (error.response?.data?.code === "CONTACT_ADMIN") {
        toast({
          title: "Account Activation Required",
          description:
            "Please contact system administration to activate your account. Email: admin@andrual.com",
          variant: "default",
          duration: 10000, // Longer duration for important message
        });
      } else if (error.response?.data?.code === "EMAIL_DELIVERY_FAILED") {
        const retryAfter = error.response.data.retryAfter || 60;
        startCooldown();

        toast({
          title: "Email Verification Failed",
          description: `Failed to send verification email. Please try again in ${retryAfter} seconds.`,
          variant: "destructive",
          action: isCooldownActive ? undefined : (
            <ToastAction
              altText="Resend verification email"
              onClick={handleResendVerificationEmail}
            >
              Resend Email
            </ToastAction>
          ),
        });
      } else {
        toast({
          title: "Registration Failed",
          description: error.message || "Unable to send verification email",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerificationEmail = async () => {
    if (isCooldownActive) return;

    try {
      setIsResendLoading(true);
      await authService.register({
        name,
        email,
        userType,
      });

      startCooldown();
      toast({
        title: "Verification Email Resent",
        description: `A new verification email has been sent. You can resend again in ${remainingTime} seconds.`,
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Resend Failed",
        description:
          error.response?.data?.message ||
          "Unable to resend verification email. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-purple-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <AuthHeader subtitle="Create your account" />
        <form
          className="mt-8 space-y-6 bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-2xl shadow-2xl"
          onSubmit={handleRegister}
        >
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <Label htmlFor="name" className="text-white">
                Full Name
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className="mt-2 bg-white/10 border-white/20 text-white placeholder-white/50 appearance-none relative block w-full px-3 py-2 border rounded-md focus:outline-none focus:z-10 sm:text-sm"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
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
            <div>
              <Label className="text-white mb-2">
                Account Type
              </Label>
              <Select
                defaultValue="individual"
                onValueChange={(value: user_type) => setUserType(value)}
              >
                <SelectTrigger className="w-full bg-white/10 border-white/20 text-white focus:ring-2 focus:ring-purple-500">
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/20 text-white">
                  <SelectItem
                    value="individual"
                    className="hover:bg-white/10 focus:bg-white/10"
                  >
                    Private
                  </SelectItem>
                  <SelectItem
                    value="business"
                    className="hover:bg-white/10 focus:bg-white/10"
                  >
                    Business
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-all duration-200"
            >
              {isLoading ? "Sending..." : "Send Verification Email"}
            </Button>
          </div>

          <div className="text-center mt-4">
            <Link
              href="/auth/login"
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors duration-200"
            >
              Already have an account? Log in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
