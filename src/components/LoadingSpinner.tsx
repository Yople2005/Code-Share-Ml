import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export function LoadingSpinner({ size = 'md', color = 'currentColor' }: LoadingSpinnerProps) {
  const sizeMap = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="relative">
      <div 
        className={`${sizeMap[size]} animate-[spin_0.6s_linear_infinite]`}
      >
        <div className="absolute w-full h-full rounded-full border-2 border-t-transparent" 
             style={{ 
               borderColor: `${color}33`,
               borderTopColor: color 
             }} 
        />
        <div className="absolute w-full h-full rounded-full border-2 border-l-transparent border-r-transparent animate-pulse" 
             style={{ 
               borderColor: `${color}1a`,
               borderTopColor: `${color}33`,
               borderBottomColor: `${color}33`,
               animationDuration: '1s'
             }} 
        />
      </div>
    </div>
  );
}
