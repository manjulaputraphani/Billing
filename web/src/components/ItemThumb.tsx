/**
 * 40×40 item thumbnail. Uses the item's image when it has one, otherwise a
 * coloured circle with the first letter. Images are lazy-loaded.
 */
import { useState } from "react";

export type ThumbItem = {
  id?: number;
  name: string;
  imageUrl?: string | null;
};

/**
 * A few in-theme tints so the list looks lively without breaking the palette.
 * Every pair keeps the letter readable (WCAG AA on the tinted circle).
 */
const TINTS = [
  "bg-primary text-on-primary",
  "bg-secondary-soft text-secondary-ink",
  "bg-accent-soft text-accent-ink",
  "bg-surface-3 text-ink",
];

function tintFor(item: ThumbItem): string {
  const key = `${item.id ?? ""}${item.name}`;
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) hash = (hash * 31 + key.charCodeAt(index)) % 997;
  return TINTS[hash % TINTS.length];
}

export default function ItemThumb({
  item,
  size = 40,
  className = "",
}: {
  item: ThumbItem;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size };

  if (item.imageUrl && !failed) {
    return (
      <img
        src={item.imageUrl}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={`shrink-0 rounded-xl border border-line object-cover ${className}`}
        style={style}
      />
    );
  }

  const letter = (item.name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full text-[13px] font-semibold ${tintFor(item)} ${className}`}
      style={style}
    >
      {letter}
    </span>
  );
}
