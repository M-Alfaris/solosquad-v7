import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: "default" | "minimal" | "card";
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "default",
  className = "",
}: EmptyStateProps) {
  const content = (
    <div className={`flex flex-col items-center justify-center text-center space-y-4 ${className}`}>
      {Icon && (
        <div className="rounded-full bg-muted p-6">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md">{description}</p>
      </div>
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  );

  if (variant === "card") {
    return (
      <Card>
        <CardContent className="py-12">
          {content}
        </CardContent>
      </Card>
    );
  }

  if (variant === "minimal") {
    return (
      <div className="py-8">
        {content}
      </div>
    );
  }

  return (
    <div className="py-16">
      {content}
    </div>
  );
}