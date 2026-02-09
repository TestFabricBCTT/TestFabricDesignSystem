import React from 'react';
import { Skeleton as MuiSkeleton, type SkeletonProps as MuiSkeletonProps } from '@mui/material';

export interface SkeletonProps extends Omit<MuiSkeletonProps, 'variant'> {
  /** Variante do skeleton */
  variant?: 'text' | 'rectangular' | 'circular';
  /** Largura do skeleton */
  width?: number | string;
  /** Altura do skeleton */
  height?: number | string;
  /** Tipo de animação */
  animation?: 'pulse' | 'wave' | false;
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ variant = 'text', children, ...props }, ref) => {
    return (
      <MuiSkeleton ref={ref} variant={variant} {...props}>
        {children}
      </MuiSkeleton>
    );
  }
);

Skeleton.displayName = 'Skeleton';
export default Skeleton;
