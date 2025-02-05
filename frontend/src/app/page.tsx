"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth";
import { motion } from "framer-motion";

export default function Home() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (token) {
        router.push("/dashboard");
      } else {
        router.push("/auth");
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [token, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background/50 to-background/90">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <motion.h1
          className="text-4xl md:text-6xl font-bold text-primary mb-4"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          AI Data Agent
        </motion.h1>
        <motion.div
          className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>
    </div>
  );
}
