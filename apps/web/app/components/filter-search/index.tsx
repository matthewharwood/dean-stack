import { useState, useTransition } from "react";

import { defineComponent } from "~/lib/define-component";

import { FilterSearchPropsSchema } from "./schema";

// First useTransition consumer (M9). The input update is urgent (typing must
// stay responsive); the downstream filter recompute is non-urgent and can be
// interrupted. `pending` drives `aria-busy` on the input.
export const FilterSearch = defineComponent(FilterSearchPropsSchema, (props) => {
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const visible = props.items.filter((i) => i.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="font-openrunde flex flex-col gap-3">
      <input
        type="search"
        placeholder="search…"
        aria-busy={pending}
        onChange={(e) => {
          const next = e.target.value;
          startTransition(() => setQuery(next));
        }}
        className="rounded-lg px-3 py-2 text-black"
      />
      <ul className="flex flex-col gap-1">
        {visible.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
});
