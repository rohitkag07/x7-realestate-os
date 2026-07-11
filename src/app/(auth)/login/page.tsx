'use client';

import { Suspense, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { APP_NAME } from '@/lib/constants';

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginCard />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const next         = searchParams.get('next') ?? '/';
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [pending, startTransition] = useTransition();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success('Welcome back, sahab!');
        router.replace(next);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Login failed';
        toast.error(msg);
      }
    });
  }

  return <LoginCard email={email} password={password} pending={pending} onEmailChange={setEmail} onPasswordChange={setPassword} onSubmit={onSubmit} />;
}

type LoginCardProps = {
  email?: string;
  password?: string;
  pending?: boolean;
  onEmailChange?: (value: string) => void;
  onPasswordChange?: (value: string) => void;
  onSubmit?: (e: React.FormEvent) => void;
};

function LoginCard({
  email = '',
  password = '',
  pending = false,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: LoginCardProps) {
  return (
    <Card className="shadow-none border-0 lg:border lg:shadow-sm">
      <CardHeader className="space-y-3">
        <div className="lg:hidden flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-semibold">{APP_NAME}</span>
        </div>
        <div>
          <CardTitle className="text-2xl">WhatsAI Console Login</CardTitle>
          <CardDescription>
            Namaste! Apne WhatsApp assistant trial console me wapas swagat hai.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email" type="email" autoComplete="email" required
              placeholder="owner@business.in"
              value={email}
              onChange={(e) => onEmailChange?.(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="#" className="text-xs text-muted-foreground hover:underline">Forgot?</Link>
            </div>
            <Input
              id="password" type="password" autoComplete="current-password" required
              value={password}
              onChange={(e) => onPasswordChange?.(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Logging in…' : 'Log in'}
            {!pending && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>

          <p className="text-center text-xs text-muted-foreground pt-2">
            New here? Contact your WhatsAI onboarding partner to get setup access.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
