import { Skeleton } from '@/components/ui/skeleton';

export default function ConversationsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="sticky top-14 z-20 flex gap-2 overflow-x-auto rounded-2xl border bg-background/95 p-2 shadow-sm backdrop-blur xl:hidden">
        <Skeleton className="h-9 w-20 shrink-0 rounded-xl" />
        <Skeleton className="h-9 w-28 shrink-0 rounded-xl" />
        <Skeleton className="h-9 w-24 shrink-0 rounded-xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[370px_minmax(0,1fr)_340px]">
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <Skeleton className="h-8 w-32" />
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-2xl" />
          ))}
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-6 flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-20 w-2/3 rounded-3xl" />
            <Skeleton className="ml-auto h-20 w-2/3 rounded-3xl" />
            <Skeleton className="h-16 w-1/2 rounded-3xl" />
            <Skeleton className="ml-auto h-24 w-3/4 rounded-3xl" />
          </div>
        </div>
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <Skeleton className="h-8 w-40" />
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-10 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
