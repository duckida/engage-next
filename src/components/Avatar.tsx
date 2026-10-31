import { useState } from "react";
import { initials } from "../lib/format";

type AvatarProps = {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
};

export function Avatar({ name, src, size = 40, className = "" }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  return (
    <span
      className={`avatar ${className}`.trim()}
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.34)) }}
      aria-hidden="true"
    >
      {src && !failed ? (
        <img src={src} alt="" onError={() => setFailed(true)} />
      ) : (
        <span>{initials(name)}</span>
      )}
    </span>
  );
}
