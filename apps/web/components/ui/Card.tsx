import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export default function Card({
  children,
  className = '',
  hover = false,
  padding = 'md',
}: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 ${hover ? 'hover:shadow-lg hover:border-gray-300 transition' : ''} ${paddingClasses[padding]} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
