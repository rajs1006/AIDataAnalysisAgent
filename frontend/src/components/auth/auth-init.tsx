"use client";

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth';
import { usePathname, useRouter } from 'next/navigation';

export function AuthInitializer() {
  const { user, isAuthenticated } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const publicPaths = ['/auth/login', '/auth/register', '/auth/verify', '/auth/reset-password'];
    const isPublicPath = publicPaths.includes(pathname);

    // Redirect logic
    if (isPublicPath && token) {
      router.replace('/dashboard');
    } else if (!isPublicPath && !token) {
      router.replace('/auth/login');
    }
  }, [pathname, user, isAuthenticated]);

  return null;
}
