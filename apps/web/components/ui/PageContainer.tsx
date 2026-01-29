import { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | 'full';
  py?: 'sm' | 'md' | 'lg';
}

const maxWidthClasses = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '6xl': 'max-w-6xl',
  full: '',
};

const pyClasses = {
  sm: 'py-6',
  md: 'py-8',
  lg: 'py-12',
};

export default function PageContainer({
  children,
  className = '',
  maxWidth,
  py = 'md',
}: PageContainerProps) {
  return (
    <div
      className={`container mx-auto px-4 ${pyClasses[py]} ${maxWidth ? maxWidthClasses[maxWidth] : ''} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
