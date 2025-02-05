'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAppDispatch } from '@/lib/store/store';
import { loginUser } from '@/lib/store/auth';
import Link from 'next/link';
import { AuthHeader } from '@/components/auth/auth-header';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const dispatch = useAppDispatch();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      await dispatch(loginUser({ email, password })).unwrap();
      
      toast({
        title: 'Login Successful!',
      });

      router.push('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Login Failed!',
        description: error.message || 'Invalid email or password',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-purple-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <AuthHeader subtitle="Sign in to your account" />
        <form className="mt-8 space-y-6 bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-2xl shadow-2xl" onSubmit={handleLogin}>
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
            <div>
              <Label htmlFor="password" className="text-white">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="mt-2 bg-white/10 border-white/20 text-white placeholder-white/50 appearance-none relative block w-full px-3 py-2 border rounded-md focus:outline-none focus:z-10 sm:text-sm"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link href="/auth/register" className="font-medium text-purple-400 hover:text-purple-200">
                Create an account
              </Link>
            </div>
            <div className="text-sm">
              <Link href="/auth/reset-password" className="font-medium text-purple-400 hover:text-purple-200">
                Forgot password?
              </Link>
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-all duration-200"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
