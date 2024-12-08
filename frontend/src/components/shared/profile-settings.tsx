import * as React from "react";
import { z } from "zod";
import { useForm, type FieldValues } from "react-hook-form"; // Add FieldValues import
import { zodResolver } from "@hookform/resolvers/zod";
import { useAppDispatch, useAppSelector } from "@/lib/store/store";
import { updateUser } from "@/lib/store/auth";
import { userService } from "@/lib/api/user";
import { UserUpdate } from "@/lib/types/auth";
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
    current_password: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    new_password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z
      .string()
      .min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
  });

type SecurityFormValues = z.infer<typeof securitySchema>;
type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileSettings({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { toast } = useToast();

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name || "",
      email: user?.email || "",
      avatar_url: user?.avatar_url || "",
    },
  });

  const securityForm = useForm<SecurityFormValues>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  const onProfileSubmit = async (data: ProfileFormValues) => {
    try {
      const updateData: UserUpdate = {
        full_name: data.full_name,
        email: data.email,
        avatar_url: data.avatar_url,
      };

      // Call API to update profile
      await userService.updateProfile(updateData);
      dispatch(updateUser(updateData));

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const onSecuritySubmit = async (data: SecurityFormValues) => {
    try {
      // Call API to update password
      await userService.updatePassword(
        data.current_password,
        data.new_password
      );

      securityForm.reset();
      toast({
        title: "Success",
        description: "Password updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update password",
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
                {profileForm.formState.errors.full_name && (
                  <p className="text-red-500 text-sm">
                    {profileForm.formState.errors.full_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  {...profileForm.register("email")}
                  className="bg-[#4A3728]"
                />
                {profileForm.formState.errors.email && (
                  <p className="text-red-500 text-sm">
                    {profileForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar_url">Avatar URL</Label>
                <Input
                  id="avatar_url"
                  {...profileForm.register("avatar_url")}
                  className="bg-[#4A3728]"
                />
                {profileForm.formState.errors.avatar_url && (
                  <p className="text-red-500 text-sm">
                    {profileForm.formState.errors.avatar_url.message}
                  </p>
                )}
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
                {securityForm.formState.errors.current_password && (
                  <p className="text-red-500 text-sm">
                    {securityForm.formState.errors.current_password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_password">New Password</Label>
                <Input
                  id="new_password"
                  type="password"
                  {...securityForm.register("new_password")}
                  className="bg-[#4A3728]"
                />
                {securityForm.formState.errors.new_password && (
                  <p className="text-red-500 text-sm">
                    {securityForm.formState.errors.new_password.message}
                  </p>
                )}
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
