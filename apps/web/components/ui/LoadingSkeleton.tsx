import { ReactNode } from 'react';

interface LoadingSkeletonProps {
  variant?: 'card' | 'cardGrid' | 'lines' | 'eventCard' | 'custom';
  count?: number;
  className?: string;
  children?: ReactNode;
}

export function SkeletonCard() {
  return (
    <div className="bg-gray-100 rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-5 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );
}

export function SkeletonLines({ lines = 4 }: { lines?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-200 rounded"
          style={{ width: i === lines - 1 && lines > 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  );
}

export default function LoadingSkeleton({
  variant = 'cardGrid',
  count = 8,
  className = '',
  children,
}: LoadingSkeletonProps) {
  if (children) {
    return <>{children}</>;
  }

  if (variant === 'card') {
    return (
      <div className={className}>
        <SkeletonCard />
      </div>
    );
  }

  if (variant === 'cardGrid') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`.trim()}>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (variant === 'eventCard') {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`.trim()}>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (variant === 'lines') {
    return (
      <div className={className}>
        <SkeletonLines lines={count} />
      </div>
    );
  }

  return null;
}
