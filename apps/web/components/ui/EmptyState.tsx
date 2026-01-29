import Link from 'next/link';
import { ReactNode } from 'react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  icon?: ReactNode;
  className?: string;
}

export default function EmptyState({
  title = 'No items yet',
  description,
  actionLabel,
  actionHref,
  onAction,
  icon,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl p-8 text-center ${className}`.trim()}
    >
      {icon && <div className="mb-4 flex justify-center">{icon}</div>}
      <p className="text-gray-500 mb-4">{description || title}</p>
      {(actionLabel && (actionHref || onAction)) && (
        actionHref ? (
          <Link
            href={actionHref}
            className="inline-block px-6 py-3.5 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 transition"
          >
            {actionLabel}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onAction}
            className="px-6 py-3.5 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 transition"
          >
            {actionLabel}
          </button>
        )
      )}
    </div>
  );
}
