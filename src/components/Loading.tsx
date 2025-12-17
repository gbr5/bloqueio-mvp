interface LoadingProps {
  size?: "sm" | "md" | "lg" | "xl";
  color?: string;
  className?: string;
}

export function Loading({
  size = "md",
  color = "border-white",
  className = "",
}: LoadingProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-5 w-5 border-2",
    lg: "h-8 w-8 border-b-2",
    xl: "h-12 w-12 border-b-2",
  };

  return (
    <div
      className={`animate-spin rounded-full ${sizeClasses[size]} ${color} border-t-transparent ${className}`}
    />
  );
}
