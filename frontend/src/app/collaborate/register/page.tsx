"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { AuthHeader } from "@/components/auth/auth-header";
import { user_type } from "@/lib/types/auth";
import { authService } from "@/lib/api/auth";

export default function CollaborateRegisterPage() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [userType, setUserType] = useState<user_type>("individual");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const urlToken = searchParams.get("token");
    const urlEmail = searchParams.get("email");

    if (urlToken) {
      setToken(urlToken);
    }
    if (urlEmail) {
      setEmail(urlEmail);
    }
  }, [searchParams]);

  const handleRegistration = async (e: React.FormEvent) => {
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
        description: "Collaboration registration link is invalid or expired",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Call the collaboration registration API endpoint
      await authService.collaborateRegister({
        token,
        email,
        name,
        userType,
        password,
        confirmPassword,
      });

      toast({
        title: "Success",
        description: "Collaboration registration completed successfully",
      });

      router.push("/auth/login");
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description:
          error.message || "Unable to complete collaboration registration",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-purple-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <AuthHeader subtitle="Complete Collaboration Registration" />
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-2xl shadow-2xl">
          <form onSubmit={handleRegistration} className="space-y-6">
            <div>
              <Label htmlFor="name" className="text-white">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                required
                className="mt-2 bg-white/10 border-white/20 text-white placeholder-white/50"
              />
            </div>

            <div>
              <Label htmlFor="userType" className="text-white">
                User Type
              </Label>
              <Select
                value={userType}
                onValueChange={(value: user_type) => setUserType(value)}
              >
                <SelectTrigger className="mt-2 bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select user type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="password" className="text-white">
                Set Password
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
              <Label htmlFor="confirmPassword" className="text-white">
                Confirm Password
              </Label>
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
                : "Complete Collaboration Registration"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
