"use client";

import * as React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/lib/store/store";
import { setUser, setToken } from "@/lib/store/auth";
import { authService } from "@/lib/api/auth";
import { useToast } from "@/components/ui/use-toast";

const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
});

type AuthFormData = z.infer<typeof authSchema>;

const AuthForm: React.FC = () => {
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
        const { token, user } = await authService.login(
          data.email,
          data.password
        );
        dispatch(setToken(token));
        dispatch(setUser(user));
        document.cookie = `token=${token}; path=/`;
        router.push("/dashboard");
      } else {
        const userData = {
          email: data.email,
          password: data.password,
          full_name: data.name,
        };
        await authService.register(userData);
        toast({
          title: "Success",
          description: "Registration successful! Please log in.",
        });
        setIsLogin(true);
        reset();
      }
    } catch (err: any) {
      const errorMessage =
        typeof err === "object" ? err.detail : "An error occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return React.createElement(
    "div",
    { className: "card" },
    React.createElement(
      "div",
      { className: "card-header" },
      React.createElement(
        "h1",
        null,
        isLogin ? "Welcome Back" : "Create Account"
      ),
      React.createElement(
        "p",
        null,
        isLogin
          ? "Enter your credentials to sign in"
          : "Fill in your details to get started"
      )
    ),
    React.createElement(
      "form",
      { onSubmit: handleSubmit(onSubmit) },
      !isLogin &&
        React.createElement(
          "div",
          null,
          React.createElement("input", {
            type: "text",
            placeholder: "Full Name",
            ...register("name"),
          }),
          errors.name &&
            React.createElement(
              "div",
              { className: "error-message" },
              errors.name.message
            )
        ),
      React.createElement(
        "div",
        null,
        React.createElement("input", {
          type: "email",
          placeholder: "Email",
          ...register("email"),
        }),
        errors.email &&
          React.createElement(
            "div",
            { className: "error-message" },
            errors.email.message
          )
      ),
      React.createElement(
        "div",
        null,
        React.createElement("input", {
          type: "password",
          placeholder: "Password",
          ...register("password"),
        }),
        errors.password &&
          React.createElement(
            "div",
            { className: "error-message" },
            errors.password.message
          )
      ),
      React.createElement(
        "button",
        {
          type: "submit",
          disabled: isSubmitting,
        },
        isSubmitting ? "Loading..." : isLogin ? "Sign In" : "Create Account"
      )
    ),
    React.createElement(
      "div",
      { className: "footer" },
      React.createElement(
        "a",
        {
          href: "#",
          onClick: (e: { preventDefault: () => void }) => {
            e.preventDefault();
            setIsLogin(!isLogin);
            reset();
          },
        },
        isLogin
          ? "Need an account? Sign up"
          : "Already have an account? Sign in"
      )
    )
  );
};

export { AuthForm };
