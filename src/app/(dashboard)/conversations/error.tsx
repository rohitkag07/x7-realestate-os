'use client';

import Link from 'next/link';
import { AlertTriangle, RefreshCw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ConversationsError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-3xl border border-red-200 bg-gradient-to-br from-red-50 via-white to-amber-50 p-6 text-red-950 shadow-sm sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-100">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Inbox command center crashed</h2>
            <p className="mt-1 text-sm text-red-800">{error.message}</p>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-red-700">
              Retry first. If it repeats, check Supabase env vars and canonical tables: conversation_threads, conversation_messages, conversation_contacts.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="destructive" onClick={reset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
          <Button asChild variant="outline">
            <Link href="/assistant-setup">
              <Settings className="mr-2 h-4 w-4" />
              Check setup
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
