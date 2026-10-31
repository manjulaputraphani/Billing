/**
 * Item picker with thumbnails (used on the New Bill screen, where a plain
 * <select> cannot show an image). Tap/click an item to choose it.
 */
import { useMemo, useState } from "react";
import ItemThumb, { type ThumbItem } from "./ItemThumb";
import { IconSearch } from "./icons";

export type PickerItem = ThumbItem & { id: number; unit: string; stockLeftBase?: number };

export default function ItemPicker({
  items,
  value,
  onChange,
  placeholder = "Choose item…",
}: {
  items: PickerItem[];
  value: number | "";
  onChange: (id: number | "") => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = items.find((item) => item.id === value);
  const shown = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return items;
    return items.filter((item) => item.name.toLowerCase().includes(text));
  }, [items, query]);

  return (
    <div className="relative">
      <button
        type="button"
        className="input flex h-10 w-full items-center gap-2 py-0 text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {selected ? (
          <>
            <ItemThumb item={selected} size={32} />
            <span className="min-w-0 flex-1 truncate">{selected.name}</span>
          </>
        ) : (
          <>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">
              <IconSearch size={15} />
            </span>
            <span className="min-w-0 flex-1 truncate text-muted">{placeholder}</span>
          </>
        )}
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close item picker"
            className="fixed inset-0 z-20 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 right-0 z-30 mt-1 max-h-[min(18rem,45vh)] overflow-auto rounded-xl border border-line bg-surface p-1 shadow-lg">
            <input
              className="input mb-1"
              placeholder="Search items…"
              value={query}
              autoFocus
              onChange={(e) => setQuery(e.currentTarget.value)}
            />
            {shown.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted">No items found.</p>
            ) : (
              <ul role="listbox">
                {shown.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={item.id === value}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                        item.id === value ? "bg-surface-2 font-medium" : "hover:bg-surface-2"
                      }`}
                      onClick={() => {
                        onChange(item.id);
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      <ItemThumb item={item} size={40} />
                      <span className="min-w-0 flex-1 truncate">{item.name}</span>
                      <span className="text-xs text-muted">{item.unit}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
