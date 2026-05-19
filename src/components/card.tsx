import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-200 bg-white shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900/50",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center justify-between px-5 py-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-sm font-semibold text-zinc-900 dark:text-zinc-100", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-5 pb-5", className)} {...props}>
      {children}
    </div>
  );
}

export function StatCard({
  title,
  value,
  suffix,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  suffix: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
            <p className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {value}
              <span className="ml-0.5 text-sm font-medium text-zinc-400">{suffix}</span>
            </p>
            {trend && (
              <p
                className={cn(
                  "inline-flex items-center gap-0.5 text-xs font-medium",
                  trend.positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                )}
              >
                {trend.positive ? "↑" : "↓"} {trend.value}%
              </p>
            )}
          </div>
          <div className="rounded-lg bg-brand-50 p-2.5 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
            <Icon className="h-4.5 w-4.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
