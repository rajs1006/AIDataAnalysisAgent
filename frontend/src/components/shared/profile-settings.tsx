import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "@/lib/store/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";

const profileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  avatar_url: z.string().url().optional(),
});

const securitySchema = z
  .object({
    current_password: z.string().min(8),
    new_password: z.string().min(8),
    confirm_password: z.string().min(8),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
  });

export function ProfileSettings({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user, setUser } = useAuthStore();
  const { toast } = useToast();

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name || "",
      email: user?.email || "",
      avatar_url: user?.avatar_url || "",
    },
  });

  const securityForm = useForm({
    resolver: zodResolver(securitySchema),
  });

  const onProfileSubmit = async (data: z.infer<typeof profileSchema>) => {
    try {
      // API call to update profile
      setUser({ ...user, ...data });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const onSecuritySubmit = async (data: z.infer<typeof securitySchema>) => {
    try {
      // API call to update password
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
      securityForm.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update password",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-[#2C1810] text-[#E6D5C3]">
        <DialogHeader>
          <DialogTitle className="text-[#E6D5C3]">Profile Settings</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="profile">
          <TabsList className="bg-[#4A3728]">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <form
              onSubmit={profileForm.handleSubmit(onProfileSubmit)}
              className="space-y-4"
            >
              <div className="flex justify-center py-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user?.avatar_url} />
                  <AvatarFallback className="bg-[#4A3728] text-[#E6D5C3] text-xl">
                    {user?.full_name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  {...profileForm.register("full_name")}
                  className="bg-[#4A3728]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  {...profileForm.register("email")}
                  className="bg-[#4A3728]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar_url">Avatar URL</Label>
                <Input
                  id="avatar_url"
                  {...profileForm.register("avatar_url")}
                  className="bg-[#4A3728]"
                />
              </div>

              <Button type="submit" className="w-full">
                Update Profile
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="security">
            <form
              onSubmit={securityForm.handleSubmit(onSecuritySubmit)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="current_password">Current Password</Label>
                <Input
                  id="current_password"
                  type="password"
                  {...securityForm.register("current_password")}
                  className="bg-[#4A3728]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_password">New Password</Label>
                <Input
                  id="new_password"
                  type="password"
                  {...securityForm.register("new_password")}
                  className="bg-[#4A3728]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm New Password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  {...securityForm.register("confirm_password")}
                  className="bg-[#4A3728]"
                />
                {securityForm.formState.errors.confirm_password && (
                  <p className="text-red-500 text-sm">
                    {securityForm.formState.errors.confirm_password.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full">
                Update Password
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
