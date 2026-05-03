import { defineComponent } from "~/lib/define-component";

import { CardPropsSchema } from "./schema";

export const Card = defineComponent(CardPropsSchema, (props) => {
  const variant = props.variant ?? "default";
  const disabled = props.disabled === true;
  if (variant === "target") {
    return (
      <div
        className="flex h-full w-full items-center justify-center rounded-[4px] border border-muted-gray bg-canvas-white p-1.5 shadow-inner"
        data-test="card"
        data-card-variant="target"
        data-card-value={props.value}
        data-card-disabled={disabled ? "true" : undefined}
      >
        <div className="flex h-full w-full items-center justify-center rounded-[2px] border-2 border-dashed border-muted-gray/70">
          <span className="font-openrunde text-3xl font-bold text-medium-gray">{props.value}</span>
        </div>
      </div>
    );
  }
  return (
    <div
      className="flex h-full w-full items-center justify-center rounded-[4px] border border-light-gray bg-canvas-white shadow-sm"
      data-test="card"
      data-card-variant="default"
      data-card-value={props.value}
      data-card-disabled={disabled ? "true" : undefined}
    >
      <span className="font-openrunde text-3xl font-bold text-slate-ink">{props.value}</span>
    </div>
  );
});
