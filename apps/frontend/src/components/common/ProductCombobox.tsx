import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";

export type ProductOption = {
  id: string;
  name: string;
  barcode: string;
  stock: number;
  price: number;
};

interface ProductComboboxProps {
  products: ProductOption[];
  value: string;
  onChange: (id: string) => void;
  onBlur?: (() => void) | undefined;
  onSelect?: ((product: ProductOption) => void) | undefined;
  label?: string | undefined;
  error?: string | undefined;
}

const MAX_RESULTS = 10;

export function ProductCombobox({
  products,
  value,
  onChange,
  onBlur,
  onSelect,
  label,
  error,
}: ProductComboboxProps) {
  const selectedProduct = products.find((p) => p.id === value) ?? null;

  const [query, setQuery] = useState(selectedProduct?.name ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync query when value is set externally (e.g. edit modal preload)
  useEffect(() => {
    if (value) {
      const product = products.find((p) => p.id === value);
      if (product) setQuery(product.name);
    } else {
      setQuery("");
    }
  }, [value, products]);

  const filtered =
    query.trim().length === 0
      ? products.slice(0, MAX_RESULTS)
      : products
          .filter(
            (p) =>
              p.name.toLowerCase().includes(query.toLowerCase()) ||
              p.barcode.toLowerCase().includes(query.toLowerCase()),
          )
          .slice(0, MAX_RESULTS);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(0);
    // Clear selection as soon as user modifies the query
    if (value) onChange("");
  }

  function handleSelect(product: ProductOption) {
    setQuery(product.name);
    onChange(product.id);
    onSelect?.(product);
    setIsOpen(false);
  }

  function handleBlur() {
    // Delay so onMouseDown on an option fires before the blur closes the list
    setTimeout(() => {
      setIsOpen(false);
      if (!value) {
        setQuery("");
      } else {
        const product = products.find((p) => p.id === value);
        if (product) setQuery(product.name);
      }
      onBlur?.();
    }, 150);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[highlightedIndex]) handleSelect(filtered[highlightedIndex]);
        break;
      case "Escape":
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  }

  return (
    <div className="relative flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-[var(--color-foreground)]">{label}</label>
      )}

      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        autoComplete="off"
        value={query}
        placeholder="Buscar por nombre o código de barras..."
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          "h-9 w-full rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-3 text-sm",
          "text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]",
          "transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-1",
          error
            ? "border-[var(--color-destructive)] focus-visible:ring-[var(--color-destructive)]"
            : "border-[var(--color-input)] hover:border-[var(--color-secondary)]",
        )}
      />

      {isOpen && filtered.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute top-full z-50 mt-1 max-h-52 w-full overflow-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-[var(--shadow-md)]"
        >
          {filtered.map((product, index) => (
            <li
              key={product.id}
              role="option"
              aria-selected={product.id === value}
              onMouseDown={(e) => {
                // Prevent blur from firing before the click registers
                e.preventDefault();
                handleSelect(product);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={cn(
                "flex cursor-pointer items-center justify-between px-3 py-2 text-sm",
                index === highlightedIndex
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                  : "text-[var(--color-foreground)]",
                product.id === value && "font-medium",
              )}
            >
              <span className="truncate">{product.name}</span>
              <span className="ml-2 shrink-0 text-xs text-[var(--color-muted-foreground)]">
                stock: {product.stock}
              </span>
            </li>
          ))}
        </ul>
      )}

      {isOpen && filtered.length === 0 && query.trim().length > 0 && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-muted-foreground)] shadow-[var(--shadow-md)]">
          No se encontraron productos.
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-[var(--color-error-text)]">
          {error}
        </p>
      )}
    </div>
  );
}
