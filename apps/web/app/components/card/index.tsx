import { defineComponent } from "~/lib/define-component";

import { CardPropsSchema } from "./schema";

export const Card = defineComponent(CardPropsSchema, (props) => {
  return (
    <div
      className="flex h-full w-full items-center justify-center rounded-[4px] border border-neutral-300 bg-neutral-50 shadow-sm"
      data-test="card"
      data-card-value={props.value}
    >
      <span className="font-display text-3xl font-bold text-neutral-900">{props.value}</span>
    </div>
  );
});
