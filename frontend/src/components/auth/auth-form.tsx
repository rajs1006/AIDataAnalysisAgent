"use client";

import * as React from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import * as z from "zod";

import { useAppDispatch } from "@/lib/store/store";
import { loginUser, registerUser } from "@/lib/store/auth";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
});

type AuthFormData = z.infer<typeof authSchema>;

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
  });

  const onSubmit = async (data: AuthFormData) => {
    try {
      if (isLogin) {
        // Login flow
        await dispatch(
          loginUser({
            email: data.email,
            password: data.password,
          })
        ).unwrap();
        router.push("/dashboard");
      } else {
        // Registration flow
        await dispatch(
          registerUser({
            name: data.name || "",
            email: data.email,
            userType: "individual",
          })
        ).unwrap();

        toast({
          title: "Success",
          description: "Registration successful! Please log in.",
        });
        setIsLogin(true);
        reset();
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "An error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8"
      >
        <img
          src="/icon-192.png"
          alt="Logo"
          className="mx-auto h-12 w-12 rounded-lg transform transition-transform duration-300 hover:scale-110"
        />
        <div className="text-center">
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-extrabold text-gray-100"
          >
            Andrual
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-2 text-sm text-gray-400"
          >
            {isLogin ? "Sign in to your account" : "Create your account"}
          </motion.p>
        </div>

        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          onSubmit={handleSubmit(onSubmit)}
          className="mt-8 space-y-6 bg-gray-800 p-8 rounded-xl shadow-xl"
        >
          <div className="space-y-4">
            {!isLogin && (
              <div>
                <Input
                  type="text"
                  placeholder="Full Name"
                  {...register("name")}
                  className="bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-400">
                    {errors.name.message}
                  </p>
                )}
              </div>
            )}

            <div>
              <Input
                type="email"
                placeholder="Email address"
                {...register("email")}
                className="bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <Input
                type="password"
                placeholder="Password"
                {...register("password")}
                className="bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.password.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-all duration-200"
            >
              {isSubmitting
                ? "Processing..."
                : isLogin
                ? "Sign In"
                : "Create Account"}
            </Button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                reset();
              }}
              className="text-sm font-medium text-purple-400 hover:text-purple-200 underline"
            >
              {isLogin
                ? "Need an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </motion.form>
      </motion.div>
    </div>
  );
}
