import { BookOpen } from "lucide-react";

/**
 * Neutral app mark. Deliberately generic: this client is school-agnostic and
 * shows the school's own name once the user signs in.
 */
export function AppMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`app-mark ${className}`.trim()}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.3) }}
      aria-hidden="true"
    >
      <BookOpen size={Math.round(size * 0.5)} strokeWidth={1.9} />
    </span>
  );
}
