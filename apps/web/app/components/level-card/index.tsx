import { useRef } from "react";

import { defineComponent } from "~/lib/define-component";
import { popIn } from "~/motion/presets";
import { useAnime } from "~/motion/use-anime";

import { LevelCardPropsSchema } from "./schema";

export const LevelCard = defineComponent(LevelCardPropsSchema, (props) => {
  const ref = useRef<HTMLDivElement>(null);
  useAnime(ref, popIn);
  return (
    <div
      ref={ref}
      className="rounded-card bg-brand-500 p-6 text-white shadow-md font-display flex flex-col gap-3 items-center"
    >
      <h2 className="text-xl">Level {props.level}</h2>
      {props.completed ? (
        <p data-test="level-completed">Completed</p>
      ) : (
        <button
          type="button"
          onClick={() => props.onComplete()}
          className="rounded bg-white text-brand-900 px-4 py-2"
        >
          Complete
        </button>
      )}
    </div>
  );
});
