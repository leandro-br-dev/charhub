export function CharacterCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[3/4] bg-light rounded-lg" />
      <div className="mt-2 h-4 bg-light rounded w-3/4" />
      <div className="mt-1 h-3 bg-light rounded w-1/2" />
    </div>
  );
}

interface CharacterGridSkeletonProps {
  count: number;
}

export function CharacterGridSkeleton({ count }: CharacterGridSkeletonProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CharacterCardSkeleton key={i} />
      ))}
    </div>
  );
}
