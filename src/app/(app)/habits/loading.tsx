import { Skeleton } from "@/components/ui";

export default function HabitsLoading() {
  return (
    <div>
      <Skeleton className="h-7 w-24" />
      <Skeleton className="mt-2 h-4 w-72 max-w-[75ch]" />
      <ul className="mt-5 grid max-w-[720px] grid-cols-1 gap-3 xl:max-w-none xl:grid-cols-2 3xl:grid-cols-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </ul>
    </div>
  );
}
