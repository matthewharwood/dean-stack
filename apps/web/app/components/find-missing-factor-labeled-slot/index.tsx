import type { ReactNode } from "react";

export function FindMissingFactorLabeledSlot({
  label,
  children,
}: {
  label: string | null;
  children: ReactNode;
}): ReactNode {
  const hasLabel = label !== null;
  return (
    <div className="flex flex-col items-center gap-1.5" data-test="r13-labeled-slot">
      <span
        className="h-4 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-gray"
        data-test={hasLabel ? "r13-slot-label" : undefined}
        aria-hidden={hasLabel ? undefined : true}
      >
        {hasLabel ? label : " "}
      </span>
      {children}
    </div>
  );
}
