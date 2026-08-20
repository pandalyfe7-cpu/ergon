import { Skeleton } from "@/components/ui";

export default function LogFoodLoading() {
  return (
    <div className="mx-auto w-full max-w-md px-4 pt-6 pb-12">
      <Skeleton className="h-7 w-20" />
      <Skeleton className="mt-2 h-4 w-56" />
      <div className="mt-5 space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}
