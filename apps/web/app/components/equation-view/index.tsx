import type {
  CardCatalog,
  Comparator,
  Equation as EquationData,
  Operator,
} from "@dean-stack/schemas";
import { Fragment, type ReactNode } from "react";

import { Card } from "~/components/card";
import { DropOrLockedSlot } from "~/components/drop-or-locked-slot";
import { FindMissingFactorLabeledSlot } from "~/components/find-missing-factor-labeled-slot";
import { FindProductAnswerSlot } from "~/components/find-product-answer-slot";
import { FindProductChoices } from "~/components/find-product-choices";
import { OperatorPill } from "~/components/operator-pill";
import { OperatorPillWithResult } from "~/components/operator-pill-with-result";
import { StepperCard } from "~/components/stepper-card";
import { VerdictSlot } from "~/components/verdict-slot";
import { DraggableCard, EmptySlot, SlotWrapper } from "~/games/adding-game/drag";
import type { SlotLocator } from "~/games/adding-game/swap";
import { RooftopGrid } from "~/games/times-table-tower/rooftop-grid";
import { RowStage } from "~/games/times-table-tower/row-stage";

const OPERATOR_GLYPH: Record<Operator, string> = {
  add: "+",
  subtract: "−",
  multiply: "×",
  divide: "÷",
};

const COMPARATOR_GLYPH: Record<Comparator, string> = {
  eq: "=",
  gt: ">",
  lt: "<",
};

// Map a discriminated Card to the right DraggableCard payload props.
// Used only by the find-sum branch — every other branch reaches through
// the slot helpers (DropOrLockedSlot / VerdictSlot) instead.
type DraggablePayload = { value?: number; verdict?: boolean };
function cardPayload(
  card: { kind: "number"; value: number } | { kind: "verdict"; verdict: boolean },
): DraggablePayload {
  if (card.kind === "verdict") return { verdict: card.verdict };
  return { value: card.value };
}

// KEEP — EquationView is a discriminated-union dispatch over the 7
// equation shapes (stepper-sum, chant-row, rooftop-grid, find-missing-
// factor, find-leading-factor, find-product, true-false-multiply,
// find-missing-result, find-sum). Splitting each branch into its own
// component would create 8 single-call-site components that all need
// the same dragLocked/onSwap/onStep/etc. props threaded through —
// extra ceremony without separation. Already extracted from a 2400-
// line route file; further fragmentation hurts more than helps.
// react-doctor-disable-next-line react-doctor/no-giant-component
export function EquationView({
  equation,
  cards,
  dragLocked,
  failedComputed,
  onSwap,
  onStep,
  onChooseProduct,
  r16Multiplier,
  r16MasteredSteps,
  onChantStepMastered,
  r16Prompt,
  onRooftopCellTap,
}: {
  equation: EquationData;
  cards: CardCatalog;
  dragLocked: boolean;
  // The LHS value the kid's dragged cards actually compute to, surfaced
  // ONLY on a loss outcome. `null` while the round is pre-eval, mid-deal,
  // or won — the chip stays invisible in all of those cases.
  failedComputed: number | null;
  onSwap: (source: SlotLocator, target: SlotLocator) => void;
  // R9–R11 stepper-sum only — fired when the kid taps the top or bottom
  // half of the stepper card. `delta` is +1 or −1. Ignored by other
  // shapes.
  onStep: (delta: number) => void;
  // R15 find-product (multi-choice) only — fired when the kid taps one
  // of the 5 candidate cards. The handler commits the card into the
  // answer slot, auto-evaluates, and re-deals distractors on a wrong
  // pick. Ignored by every other shape.
  onChooseProduct: (cardId: string) => void;
  // R16 row-stage only — the chanted row's multiplier (0..10), the
  // step indexes the kid has already mastered on this floor, and the
  // tap handler. The tap handler deals 1 damage on a valid (on-beat,
  // not-yet-mastered) tap. Default-safe values for non-R16 shapes
  // (0, []) so a stale or pre-R16 round doesn't crash.
  r16Multiplier: number;
  r16MasteredSteps: readonly number[];
  onChantStepMastered: (stepIndex: number) => void;
  // R16 rooftop only — the current prompt product (the NPC just
  // called this out) and the cell tap handler. Null prompt = idle.
  r16Prompt: number | null;
  onRooftopCellTap: (a: number, b: number, product: number) => void;
}): ReactNode {
  // ── stepper-sum (R9–R11) ───────────────────────────────────────────
  // Layout matches find-missing-result: [a] op [b] = [stepper]. All
  // three slots are locked + pre-filled; the kid never drags. The
  // result slot renders a StepperCard whose top/bottom halves fire
  // onStep(+1) / onStep(−1). The kid taps up or down until the numeral
  // matches a OP b, then hits Evaluate.
  if (equation.shape === "stepper-sum") {
    const [aSlot, bSlot, sSlot] = equation.operandSlots;
    if (!aSlot || !bSlot || !sSlot) {
      throw new Error("EquationView: stepper-sum needs 3 operandSlots");
    }
    const sCard = sSlot.cardId ? cards[sSlot.cardId] : undefined;
    const stepperValue = sCard && sCard.kind === "number" ? sCard.value : 0;
    return (
      <div
        className="flex items-center justify-center gap-[28px]"
        data-test="equation"
        data-shape="stepper-sum"
      >
        <DropOrLockedSlot
          slot={aSlot}
          cards={cards}
          dragLocked={dragLocked}
          display="numeric"
          onSwap={onSwap}
        />
        <OperatorPillWithResult
          glyph={OPERATOR_GLYPH[equation.operator]}
          failedComputed={failedComputed}
        />
        <DropOrLockedSlot
          slot={bSlot}
          cards={cards}
          dragLocked={dragLocked}
          display="numeric"
          onSwap={onSwap}
        />
        <OperatorPill glyph="=" />
        <div className="h-[140px] w-[100px] shrink-0" data-test="equation-slot">
          <StepperCard
            value={stepperValue}
            onIncrement={() => onStep(1)}
            onDecrement={() => onStep(-1)}
          />
        </div>
      </div>
    );
  }

  // ── chant-row (R16 L1..L11) ────────────────────────────────────────
  if (equation.shape === "chant-row") {
    return (
      <RowStage
        multiplier={r16Multiplier}
        masteredSteps={r16MasteredSteps}
        onStepMastered={onChantStepMastered}
      />
    );
  }

  // ── rooftop-grid (R16 L12 capstone) ────────────────────────────────
  if (equation.shape === "rooftop-grid") {
    return <RooftopGrid promptProduct={r16Prompt} onCellTap={onRooftopCellTap} />;
  }

  // ── find-missing-factor (R13) ──────────────────────────────────────
  // Above each card sits a small tally-marks caption — the kid is being
  // taught multiplication via tally marks drawn on paper. The captions
  // use that vocabulary verbatim so the on-screen equation maps 1:1 to
  // the paper drawing the parent makes alongside.
  if (equation.shape === "find-missing-factor") {
    const [aSlot, sSlot, cSlot] = equation.operandSlots;
    if (!aSlot || !sSlot || !cSlot) {
      throw new Error("EquationView: find-missing-factor needs 3 operandSlots");
    }
    const sCard = sSlot.cardId ? cards[sSlot.cardId] : undefined;
    const stepperValue = sCard && sCard.kind === "number" ? sCard.value : 0;
    return (
      <div
        className="flex items-center justify-center gap-[28px]"
        data-test="equation"
        data-shape="find-missing-factor"
      >
        <FindMissingFactorLabeledSlot label="Tallies per group">
          <DropOrLockedSlot
            slot={aSlot}
            cards={cards}
            dragLocked={dragLocked}
            display="numeric"
            onSwap={onSwap}
          />
        </FindMissingFactorLabeledSlot>
        <FindMissingFactorLabeledSlot label={null}>
          <OperatorPillWithResult
            glyph={OPERATOR_GLYPH[equation.operator]}
            failedComputed={failedComputed}
          />
        </FindMissingFactorLabeledSlot>
        <FindMissingFactorLabeledSlot label="Number of groups">
          <div className="h-[140px] w-[100px] shrink-0" data-test="equation-slot">
            <StepperCard
              value={stepperValue}
              onIncrement={() => onStep(1)}
              onDecrement={() => onStep(-1)}
            />
          </div>
        </FindMissingFactorLabeledSlot>
        <FindMissingFactorLabeledSlot label={null}>
          <OperatorPill glyph="=" />
        </FindMissingFactorLabeledSlot>
        <FindMissingFactorLabeledSlot label="Total tallies">
          <DropOrLockedSlot
            slot={cSlot}
            cards={cards}
            dragLocked={dragLocked}
            display="numeric"
            onSwap={onSwap}
          />
        </FindMissingFactorLabeledSlot>
      </div>
    );
  }

  // ── find-leading-factor (R14) ──────────────────────────────────────
  // Mirror of R13 with the stepper at slot 0 (LEFT) instead of slot 1.
  if (equation.shape === "find-leading-factor") {
    const [sSlot, bSlot, cSlot] = equation.operandSlots;
    if (!sSlot || !bSlot || !cSlot) {
      throw new Error("EquationView: find-leading-factor needs 3 operandSlots");
    }
    const sCard = sSlot.cardId ? cards[sSlot.cardId] : undefined;
    const stepperValue = sCard && sCard.kind === "number" ? sCard.value : 0;
    return (
      <div
        className="flex items-center justify-center gap-[28px]"
        data-test="equation"
        data-shape="find-leading-factor"
      >
        <FindMissingFactorLabeledSlot label="Number of groups">
          <div className="h-[140px] w-[100px] shrink-0" data-test="equation-slot">
            <StepperCard
              value={stepperValue}
              onIncrement={() => onStep(1)}
              onDecrement={() => onStep(-1)}
            />
          </div>
        </FindMissingFactorLabeledSlot>
        <FindMissingFactorLabeledSlot label={null}>
          <OperatorPillWithResult
            glyph={OPERATOR_GLYPH[equation.operator]}
            failedComputed={failedComputed}
          />
        </FindMissingFactorLabeledSlot>
        <FindMissingFactorLabeledSlot label="Tallies per group">
          <DropOrLockedSlot
            slot={bSlot}
            cards={cards}
            dragLocked={dragLocked}
            display="numeric"
            onSwap={onSwap}
          />
        </FindMissingFactorLabeledSlot>
        <FindMissingFactorLabeledSlot label={null}>
          <OperatorPill glyph="=" />
        </FindMissingFactorLabeledSlot>
        <FindMissingFactorLabeledSlot label="Total tallies">
          <DropOrLockedSlot
            slot={cSlot}
            cards={cards}
            dragLocked={dragLocked}
            display="numeric"
            onSwap={onSwap}
          />
        </FindMissingFactorLabeledSlot>
      </div>
    );
  }

  // ── find-product (R15) ─────────────────────────────────────────────
  // Multi-choice mechanic: both factors locked + visible; kid taps one
  // of 5 candidate cards below the equation to commit a product.
  if (equation.shape === "find-product") {
    const [aSlot, bSlot, answerSlot] = equation.operandSlots;
    if (!aSlot || !bSlot || !answerSlot) {
      throw new Error("EquationView: find-product needs 3 operandSlots");
    }
    const answerCard = answerSlot.cardId ? cards[answerSlot.cardId] : undefined;
    const answerValue = answerCard && answerCard.kind === "number" ? answerCard.value : null;
    return (
      <div className="flex flex-col items-center gap-6" data-test="equation-wrap">
        <div
          className="flex items-center justify-center gap-[28px]"
          data-test="equation"
          data-shape="find-product"
        >
          <FindMissingFactorLabeledSlot label="Tallies per group">
            <DropOrLockedSlot
              slot={aSlot}
              cards={cards}
              dragLocked={dragLocked}
              display="numeric"
              onSwap={onSwap}
            />
          </FindMissingFactorLabeledSlot>
          <FindMissingFactorLabeledSlot label={null}>
            <OperatorPillWithResult
              glyph={OPERATOR_GLYPH[equation.operator]}
              failedComputed={failedComputed}
            />
          </FindMissingFactorLabeledSlot>
          <FindMissingFactorLabeledSlot label="Number of groups">
            <DropOrLockedSlot
              slot={bSlot}
              cards={cards}
              dragLocked={dragLocked}
              display="numeric"
              onSwap={onSwap}
            />
          </FindMissingFactorLabeledSlot>
          <FindMissingFactorLabeledSlot label={null}>
            <OperatorPill glyph="=" />
          </FindMissingFactorLabeledSlot>
          <FindMissingFactorLabeledSlot label="Total tallies">
            <FindProductAnswerSlot value={answerValue} />
          </FindMissingFactorLabeledSlot>
        </div>
        <FindProductChoices
          choices={equation.choices}
          onChoose={onChooseProduct}
          dragLocked={dragLocked}
        />
      </div>
    );
  }

  // ── true-false-multiply (R12) ──────────────────────────────────────
  if (equation.shape === "true-false-multiply") {
    const [aSlot, bSlot, cSlot] = equation.operandSlots;
    if (!aSlot || !bSlot || !cSlot) {
      throw new Error("EquationView: true-false-multiply needs 3 operandSlots");
    }
    const verdictSlot = equation.verdictSlot;
    if (!verdictSlot) {
      throw new Error("EquationView: true-false-multiply needs a verdictSlot");
    }
    return (
      <div
        className="flex items-center justify-center gap-[28px]"
        data-test="equation"
        data-shape="true-false-multiply"
      >
        <DropOrLockedSlot
          slot={aSlot}
          cards={cards}
          dragLocked={dragLocked}
          display="numeric"
          onSwap={onSwap}
        />
        <OperatorPill glyph={OPERATOR_GLYPH.multiply} />
        <DropOrLockedSlot
          slot={bSlot}
          cards={cards}
          dragLocked={dragLocked}
          display="numeric"
          onSwap={onSwap}
        />
        <OperatorPill glyph="=" />
        <DropOrLockedSlot
          slot={cSlot}
          cards={cards}
          dragLocked={dragLocked}
          display="numeric"
          onSwap={onSwap}
        />
        <div
          className="h-[100px] border-l-2 border-dashed border-medium-gray/60"
          data-test="verdict-separator"
          aria-hidden
        />
        <VerdictSlot slot={verdictSlot} cards={cards} dragLocked={dragLocked} onSwap={onSwap} />
      </div>
    );
  }

  // ── find-missing-result (R5–R6) ────────────────────────────────────
  if (equation.shape === "find-missing-result") {
    const [op0, op1, opResult] = equation.operandSlots;
    if (!op0 || !op1 || !opResult) {
      throw new Error("EquationView: find-missing-result needs 3 operandSlots");
    }
    return (
      <div
        className="flex items-center justify-center gap-[28px]"
        data-test="equation"
        data-shape="find-missing-result"
      >
        <DropOrLockedSlot
          slot={op0}
          cards={cards}
          dragLocked={dragLocked}
          display="ten-frame"
          onSwap={onSwap}
        />
        <OperatorPillWithResult
          glyph={OPERATOR_GLYPH[equation.operator]}
          failedComputed={failedComputed}
        />
        <DropOrLockedSlot
          slot={op1}
          cards={cards}
          dragLocked={dragLocked}
          display="ten-frame"
          onSwap={onSwap}
        />
        <OperatorPill glyph="=" />
        <DropOrLockedSlot
          slot={opResult}
          cards={cards}
          dragLocked={dragLocked}
          display="ten-frame"
          onSwap={onSwap}
        />
      </div>
    );
  }

  // ── find-sum (R1–R4) ───────────────────────────────────────────────
  return (
    <div
      className="flex items-center justify-center gap-[28px]"
      data-test="equation"
      data-shape="find-sum"
    >
      {equation.operandSlots.map((slot, idx) => {
        const card = slot.cardId ? cards[slot.cardId] : undefined;
        return (
          <Fragment key={slot.id}>
            <div className="h-[140px] w-[100px] shrink-0">
              <SlotWrapper kind="equation" slotId={slot.id}>
                <EmptySlot />
                {card ? (
                  <DraggableCard
                    key={card.id}
                    locator={{ kind: "equation", id: slot.id }}
                    cardId={card.id}
                    {...cardPayload(card)}
                    dragLocked={dragLocked}
                    onSwap={onSwap}
                  />
                ) : null}
              </SlotWrapper>
            </div>
            {idx < equation.operandSlots.length - 1 ? (
              <OperatorPillWithResult
                glyph={OPERATOR_GLYPH[equation.operator]}
                failedComputed={failedComputed}
              />
            ) : null}
          </Fragment>
        );
      })}
      <OperatorPill glyph={COMPARATOR_GLYPH[equation.comparator ?? "eq"]} />
      <div className="h-[140px] w-[100px] shrink-0">
        <Card
          value={equation.target && equation.target.kind === "number" ? equation.target.value : 0}
          variant="target"
          disabled
        />
      </div>
    </div>
  );
}
