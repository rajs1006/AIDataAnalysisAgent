// components/auth/auth-init.tsx
"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/store/store";
import { initializeAuth } from "@/lib/store/auth";

export function AuthInitializer() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  return null;
}
