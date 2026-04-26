import { defineComponent } from "~/lib/define-component";

import { topScore } from "./derive";
import { ScoreboardPropsSchema } from "./schema";

export const Scoreboard = defineComponent(ScoreboardPropsSchema, (props) => {
  const top = topScore(props.scores);
  return (
    <ol className="rounded-card bg-brand-500 p-4 text-white shadow-md font-display">
      {props.scores.map((s) => {
        const isTop = props.highlightTop && top?.player === s.player;
        return (
          <li key={s.player} className={isTop ? "font-bold" : undefined}>
            {s.player}: {s.value}
          </li>
        );
      })}
    </ol>
  );
});
