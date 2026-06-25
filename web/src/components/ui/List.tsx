import React from 'react';
import { cn } from '../../lib/utils';

export const List = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col divide-y divide-sand-200 border-t border-b border-sand-200 bg-surface-card overflow-hidden", className)}
      {...props}
    />
  )
);
List.displayName = "List";

export interface ListItemProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  selected?: boolean;
}

export const ListItem = React.forwardRef<HTMLDivElement, ListItemProps>(
  ({ className, interactive, selected, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "px-4 py-4",
        interactive && "cursor-pointer transition-colors hover:bg-sand-50",
        selected && "bg-sand-50/80 border-l-4 border-sand-400",
        className
      )}
      {...props}
    />
  )
);
ListItem.displayName = "ListItem";
