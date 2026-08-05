import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  glass = true,
  hoverable = false,
  className = '',
  ...props
}) => {
  const baseStyle = 'rounded-xl shadow-glass border transition-all duration-300';
  
  const glassStyle = glass
    ? 'glass-panel bg-white/70 dark:bg-slate-900/70 border-white/40 dark:border-white/5 backdrop-blur-md'
    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800';

  const hoverStyle = hoverable
    ? 'hover:-translate-y-1 hover:shadow-glass-hover hover:border-slate-300 dark:hover:border-slate-700'
    : '';

  return (
    <div
      className={`${baseStyle} ${glassStyle} ${hoverStyle} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={`px-6 py-4 border-b border-slate-100 dark:border-slate-800/60 ${className}`} {...props}>
    {children}
  </div>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={`p-6 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={`px-6 py-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20 rounded-b-xl ${className}`} {...props}>
    {children}
  </div>
);
export default Card;
