import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({
  className,
  ...props
}: TabsPrimitive.TabsListProps) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex rounded-full border border-(--color-border) bg-(--color-panel) p-1",
        className
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: TabsPrimitive.TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "rounded-full px-4 py-2 text-sm font-medium text-(--color-muted) transition data-[state=active]:bg-(--color-shell) data-[state=active]:text-(--color-ink)",
        className
      )}
      {...props}
    />
  );
}

export const TabsContent = TabsPrimitive.Content;
