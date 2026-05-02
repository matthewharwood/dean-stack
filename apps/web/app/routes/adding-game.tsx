import type {
  CardCatalog,
  Equation as EquationData,
  HandSlot,
  Operator,
} from "@dean-stack/schemas";
import { createFileRoute } from "@tanstack/react-router";
import { useAtomValue, useSetAtom } from "jotai";
import { Fragment, type ReactNode, useEffect } from "react";

import { Card } from "~/components/card";
import { dealRound } from "~/games/adding-game/deal";
import { buildSeoLinks, buildSeoMeta } from "~/lib/seo";
import { addingGameAtom } from "~/state/atoms";

export const Route = createFileRoute("/adding-game")({
  head: () => ({
    meta: buildSeoMeta({
      path: "/adding-game",
      title: "Adding Game",
      description: "Adding Game — a dean-stack browser game for practicing addition.",
    }),
    links: buildSeoLinks({ path: "/adding-game" }),
  }),
  component: AddingGame,
});

const ROUND_TARGET = 10;

type RegionProps = { children?: ReactNode };

function GameBoard({ children }: RegionProps) {
  return (
    <main className="grid h-dvh grid-cols-[1fr_2fr_1fr] gap-[18px] p-[18px] font-display">
      {children}
    </main>
  );
}

function LeftCol({ children }: RegionProps) {
  return (
    <section aria-label="Left panel" className="relative rounded-md bg-neutral-200">
      {children}
    </section>
  );
}

function GameMain({ children }: RegionProps) {
  return <div className="flex min-h-0 flex-col gap-[18px]">{children}</div>;
}

function Top({ children }: RegionProps) {
  return (
    <section
      aria-label="Top center panel"
      className="relative h-[200px] shrink-0 rounded-md bg-neutral-200"
    >
      {children}
    </section>
  );
}

function Center({ children }: RegionProps) {
  return (
    <section
      aria-label="Middle center panel"
      className="relative min-h-0 flex-1 rounded-md bg-neutral-200"
    >
      {children}
    </section>
  );
}

function Bottom({ children }: RegionProps) {
  return (
    <section
      aria-label="Bottom center panel"
      className="relative h-[200px] shrink-0 rounded-md bg-neutral-200"
    >
      <div className="grid h-full grid-cols-5 gap-[18px] p-[18px]">{children}</div>
    </section>
  );
}

function CardSlot({ children }: RegionProps) {
  return (
    <div className="relative h-full w-full rounded-[4px] border-2 border-dotted border-neutral-700/80">
      {children}
    </div>
  );
}

function RightCol({ children }: RegionProps) {
  return (
    <section aria-label="Right panel" className="relative rounded-md bg-neutral-200">
      {children}
    </section>
  );
}

function Hand({ hand, cards }: { hand: readonly HandSlot[]; cards: CardCatalog }) {
  return (
    <>
      {hand.map((slot) => {
        const card = slot.cardId ? cards[slot.cardId] : undefined;
        return (
          <div key={slot.id} className="h-full w-full">
            {card ? <Card value={card.value} /> : <CardSlot />}
          </div>
        );
      })}
    </>
  );
}

const OPERATOR_GLYPH: Record<Operator, string> = {
  add: "+",
  subtract: "−",
  multiply: "×",
  divide: "÷",
};

function EquationView({ equation, cards }: { equation: EquationData; cards: CardCatalog }) {
  return (
    <div className="flex h-full items-center justify-center gap-[18px] p-[18px]">
      {equation.operandSlots.map((slot, idx) => {
        const filled = slot.cardId ? cards[slot.cardId] : undefined;
        return (
          <Fragment key={slot.id}>
            <div className="h-[140px] w-[100px] shrink-0">
              {filled ? <Card value={filled.value} /> : <CardSlot />}
            </div>
            {idx < equation.operandSlots.length - 1 ? (
              <span className="text-4xl font-bold text-neutral-700">
                {OPERATOR_GLYPH[equation.operator]}
              </span>
            ) : null}
          </Fragment>
        );
      })}
      <span className="text-4xl font-bold text-neutral-700">=</span>
      <div className="h-[140px] w-[100px] shrink-0">
        <Card value={equation.target.value} />
      </div>
    </div>
  );
}

function AddingGame() {
  const game = useAtomValue(addingGameAtom);
  const setGame = useSetAtom(addingGameAtom);

  // gameStart: idle/no-round → playing + deal round 1.
  // The setter form does the final guard so StrictMode double-invocation and
  // any future cross-tab race resolves to a single deal.
  useEffect(() => {
    if (game.round) return;
    setGame((prev) => {
      if (prev.round) return prev;
      const result = dealRound({ index: 1, target: ROUND_TARGET });
      return {
        ...prev,
        status: "playing",
        cards: result.cards,
        player: { ...prev.player, hand: result.hand },
        round: result.round,
      };
    });
  }, [game.round, setGame]);

  return (
    <GameBoard>
      <LeftCol />
      <GameMain>
        <Top />
        <Center>
          {game.round ? <EquationView equation={game.round.equation} cards={game.cards} /> : null}
        </Center>
        <Bottom>
          <Hand hand={game.player.hand} cards={game.cards} />
        </Bottom>
      </GameMain>
      <RightCol />
    </GameBoard>
  );
}
