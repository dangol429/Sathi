"use client";

import { useEffect, useRef, useState } from "react";
import { PopoverPanel, usePopover } from "@/components/popover";

/**
 * A dropdown built out of a button and a list, not a native <select>.
 *
 * The native one had to go: its options list is rendered by the operating
 * system, so it kept its own white background and system fonts no matter what
 * the site's theme said. Everything here is ordinary markup, so it themes like
 * the rest of the page.
 *
 * Styled down to the label, the value and a chevron. These controls adjust
 * what you are already looking at; a bordered, filled box makes them read as
 * buttons that go somewhere, and puts more weight on the toolbar than on the
 * posts underneath it.
 *
 * The list is absolutely positioned, so opening it never moves anything.
 */
export function Dropdown({
  label,
  value,
  onChange,
  options,
  align = "left",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  align?: "left" | "right";
}) {
  const { open, setOpen, close, anchorRef, triggerRef, panelId } = usePopover();
  const listRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selected = options[selectedIndex];

  // Open onto the current value, and put the keyboard there too.
  useEffect(() => {
    if (open) setActive(selectedIndex);
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.focus();
  }, [open, active]);

  function choose(index: number) {
    onChange(options[index].value);
    close(true);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => (current + step + options.length) % options.length);
    } else if (event.key === "Home" && open) {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End" && open) {
      event.preventDefault();
      setActive(options.length - 1);
    } else if ((event.key === "Enter" || event.key === " ") && open) {
      event.preventDefault();
      choose(active);
    }
  }

  return (
    <div className="relative" ref={anchorRef} onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className="text-ink-soft hover:text-ink inline-flex items-center gap-1.5 transition-colors"
      >
        <span className="text-ink-faint text-xs font-bold tracking-[0.1em] uppercase">{label}</span>
        <span className="text-sm font-semibold">{selected?.label}</span>
        <ChevronGlyph open={open} />
      </button>

      {open ? (
        <PopoverPanel id={panelId} align={align} className="w-max min-w-40">
          <ul ref={listRef} role="listbox" aria-label={label} tabIndex={-1}>
            {options.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-active={index === active}
                    tabIndex={index === active ? 0 : -1}
                    onClick={() => choose(index)}
                    onMouseEnter={() => setActive(index)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm font-semibold transition-colors ${
                      isSelected ? "text-crimson" : "text-ink-soft"
                    } hover:bg-elevated data-[active=true]:bg-elevated`}
                  >
                    <span className="w-3.5 shrink-0">{isSelected ? <TickGlyph /> : null}</span>
                    {option.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </PopoverPanel>
      ) : null}
    </div>
  );
}

function ChevronGlyph({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      aria-hidden
    >
      <path
        d="m6 9.5 6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TickGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path
        d="m5 12.5 4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
