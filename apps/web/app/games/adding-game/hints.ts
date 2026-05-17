import {
  type AddingGameState,
  type Comparator,
  isNumberCard,
  isVerdictCard,
  numberCardValue,
} from "@dean-stack/schemas";

// Verb form per comparator — used in hint body templates.
// Hoisted so the templates don't carry nested ternaries.
const COMPARATOR_VERB: Record<Comparator, string> = {
  eq: "equal",
  gt: "beat",
  lt: "stay under",
};

// A hint is a short pedagogical nudge shown on a wrong evaluation. The
// `id` is for de-duplication ("don't show the same hint twice in a row")
// and for future analytics — which hints actually help kids correct?
//
// Three display fields, designed so a 7-year-old reading at a glance picks
// up the actionable bit immediately:
//   - `emphasis`: 2–6 word punch line displayed huge and colored. The kid
//                 reads this even if they don't read the body.
//   - `body`: the longer explanation. Digit runs are highlighted at
//             render time. Words wrapped in `*asterisks*` render italic
//             so templates can stress concepts without inline JSX.
//   - `hands` (optional): finger-counting visual. Renders 0–10 fingers
//             extended on a pair of drawn hands. Used by templates
//             where the count is the actionable bit (count-fingers,
//             number-bonds, missing-number, boundary). Hint generation
//             only attaches hands when the count fits in 0–10 — bigger
//             targets fall back to text-only.
export type Hint = {
  id: string;
  emphasis: string;
  body: string;
  hands?: { count: number; caption: string | null };
};

// HandCount supports 0–10. Targets above 10 fall back to text-only
// hints — no hands to draw. Below the cap, every hand-bearing hint
// uses the same caption template ("Make N", "Land before N", etc.)
// so the visual reads consistently across templates.
const HANDS_MAX = 10;
const fits = (n: number): boolean => n >= 0 && n <= HANDS_MAX;

// Shared number-card lookup. Module-scope so the find-missing-result and
// true-false-multiply generators can both call it without each defining
// their own identical closure (sonarjs's no-identical-functions rule).
function cardValueOf(state: AddingGameState, cardId: string | null | undefined): number {
  if (!cardId) return 0;
  return numberCardValue(state.cards[cardId]) ?? 0;
}

// Pure: given the current state (which has the failed outcome on it),
// returns the hints that apply. Operator-specific hints filter themselves
// out when the operator is wrong; direction hints branch on too-big vs
// too-small. The set is intentionally redundant so consecutive losses on
// the same equation see different angles.
//
// Two equation shapes are supported:
//   - "find-sum" (R1–R4): "what pair makes target?" — original hint
//     vocabulary stays the way it was.
//   - "find-missing-result" (R5–R6): "static OP a = b, kid plays a and
//     b" — `target` on the equation is null, "expected" comes from
//     outcome.expectedValue (= the kid's chosen result card). New
//     hint pool framed around mental computation: "add to {static}",
//     "what comes after {static} {op} {a}?".
export function generateHints(state: AddingGameState): Hint[] {
  const round = state.round;
  if (!round?.outcome) return [];

  if (round.equation.shape === "find-missing-result") {
    return generateFindMissingResultHints(state);
  }
  if (round.equation.shape === "stepper-sum") {
    return generateStepperSumHints(state);
  }
  if (round.equation.shape === "true-false-multiply") {
    return generateTrueFalseMultiplyHints(state);
  }

  const targetCard = round.equation.target;
  if (!targetCard || !isNumberCard(targetCard)) return [];
  const target = targetCard.value;
  const computed = round.outcome.computedValue;
  const operator = round.equation.operator;
  const comparator = round.equation.comparator ?? "eq";
  const tooBig = computed > target;
  const tooSmall = computed < target;
  const exact = computed === target;

  // 12 hint templates, broken down by category. Each `push` is a separate
  // angle a 7-year-old might lean on — direction, decomposition, counting,
  // visualization, operator-specific, etc. The route picks one randomly,
  // avoiding the previous id so back-to-back losses see fresh framing.
  const hints: Hint[] = [];

  // ── COMPARATOR-AWARE DIRECTION
  // Each hint has an emphasis ("punch line") + body. The kid reads the
  // emphasis at a glance and the body if they have time.
  if (comparator === "eq") {
    if (tooBig) {
      hints.push({
        id: "direction-too-big",
        emphasis: "Try smaller!",
        body: `Your answer is *bigger* than ${target}. Pick smaller cards.`,
      });
    } else if (tooSmall) {
      hints.push({
        id: "direction-too-small",
        emphasis: "Go bigger!",
        body: `Your answer is *smaller* than ${target}. Pick bigger cards.`,
      });
    }
  } else if (comparator === "gt") {
    hints.push({
      id: "gt-need-bigger",
      emphasis: "Aim higher!",
      body: `You need an answer *bigger* than ${target}.`,
    });
    hints.push({
      id: "gt-overshoot-ok",
      emphasis: "Overshoot it!",
      body: `Anything more than ${target} works — pick bold cards.`,
    });
  } else {
    // lt
    hints.push({
      id: "lt-need-smaller",
      emphasis: "Stay small!",
      body: `Your answer has to be *less* than ${target}.`,
    });
    hints.push({
      id: "lt-undershoot-ok",
      emphasis: "Stay under!",
      body: `Anything under ${target} is right. Don't add too much.`,
    });
  }

  // ── OFF-BY — only for "eq" where exact match matters. For inequality
  //   levels the gap is misleading (a gap of 1 might be on either side).
  if (comparator === "eq" && !exact) {
    hints.push({
      id: "off-by",
      emphasis: `${computed} ≠ ${target}`,
      body: "Your number isn't quite right yet. Try again.",
    });
  }

  // ── INEQUALITY-SPECIFIC: "boundary" framing helps tier-2 reasoning.
  if (comparator === "gt") {
    hints.push({
      id: "gt-boundary",
      emphasis: "Cross the wall.",
      body: `Imagine ${target} is a wall. Your answer needs to land on the *other side*.`,
    });
  } else if (comparator === "lt") {
    hints.push({
      id: "lt-boundary",
      emphasis: "Stay under the ceiling.",
      body: `Imagine ${target} is a ceiling. Your answer has to *fit underneath*.`,
    });
  }

  // ── NUMBER BONDS — "friends that make 10". Add + eq only.
  if (operator === "add" && comparator === "eq") {
    hints.push({
      id: "number-bonds",
      emphasis: `Find the friends.`,
      body: `Numbers that make ${target} come in pairs. Like 3 and 7, or 4 and 6.`,
      ...(fits(target) ? { hands: { count: target, caption: `Make ${target}` } } : {}),
    });
  }

  // ── MISSING NUMBER — reverse framing. Only meaningful for "eq."
  if (comparator === "eq") {
    hints.push({
      id: "missing-number",
      emphasis: "What's missing?",
      body: `Cover one card with your finger. What number fills the gap to ${target}?`,
      ...(fits(target) ? { hands: { count: target, caption: `Fill to ${target}` } } : {}),
    });
  }

  // ── COUNTING UP — most concrete strategy. Recasts for inequality
  //   levels: "count past" or "count under" instead of "count to."
  // The hand visual is THE money shot for this category — kids count
  // fingers in the real world, the tooltip mirrors that gesture.
  if (operator === "add" && comparator === "eq") {
    hints.push({
      id: "count-fingers-add",
      emphasis: "Use your fingers.",
      body: `Show one number, then *count up* to ${target}.`,
      ...(fits(target) ? { hands: { count: target, caption: `Count to ${target}` } } : {}),
    });
  } else if (operator === "subtract" && comparator === "eq") {
    // For a - b = target, the answer IS the target (the gap). Show
    // the gap as fingers — the kid learns to picture subtraction as
    // "this many fingers between the two numbers."
    hints.push({
      id: "count-fingers-sub",
      emphasis: "Count the gap.",
      body: `Pick the bigger card. *Count down* to the smaller one.`,
      ...(fits(target) ? { hands: { count: target, caption: `The gap is ${target}` } } : {}),
    });
  } else if (comparator === "gt") {
    hints.push({
      id: "count-past",
      emphasis: "Count past it.",
      body: `Start at ${target}. Your answer should land *after* it.`,
      ...(fits(target) ? { hands: { count: target, caption: `Past ${target}` } } : {}),
    });
  } else {
    // comparator === "lt"
    hints.push({
      id: "count-under",
      emphasis: "Land before it.",
      body: `Count up to ${target}. Your answer should land *before* it.`,
      ...(fits(target) ? { hands: { count: target, caption: `Stay under ${target}` } } : {}),
    });
  }

  // ── VISUALIZATION — physical intuition.
  hints.push({
    id: "stacks",
    emphasis: "Stack them up.",
    body: `Picture two stacks of blocks. Together they should *reach ${target}*.`,
  });
  hints.push({
    id: "number-line",
    emphasis: "Hop the line.",
    body: `Imagine a bunny hopping on a number line. Where does it land?`,
  });

  // ── OPERATOR-SPECIFIC (subtraction).
  if (operator === "subtract") {
    hints.push({
      id: "sub-bigger-first",
      emphasis: "Bigger first!",
      body: `In subtraction, the *first card* has to be bigger than the second.`,
    });
    hints.push({
      id: "sub-pair",
      emphasis: `${comparator === "eq" ? "First minus second" : "Pick a difference"}`,
      body: `The first card *minus* the second should ${COMPARATOR_VERB[comparator] ?? "equal"} ${target}.`,
    });
  }

  // ── REVERSE — start from the goal. Reframes for inequality levels.
  if (comparator === "eq") {
    hints.push({
      id: "reverse-from-target",
      emphasis: "Work backwards.",
      body: `Start with ${target}. What *pair* gets you there?`,
    });
  } else if (comparator === "gt") {
    hints.push({
      id: "reverse-from-target-gt",
      emphasis: "Then add more.",
      body: `Pick one card. How big does the *other* need to be to beat ${target}?`,
    });
  } else {
    hints.push({
      id: "reverse-from-target-lt",
      emphasis: "Stay below.",
      body: `Pick one card. How small does the *other* need to be to stay under ${target}?`,
    });
  }

  // ── SWAP — process suggestion.
  hints.push({
    id: "swap-card",
    emphasis: "Try a swap.",
    body: `You have *5 cards* — try a different one.`,
  });

  // ── ENCOURAGEMENT — never the only hint, just one in the rotation.
  hints.push({
    id: "encouragement",
    emphasis: "Great try!",
    body: `Math is like a *puzzle*. Move one card and try again.`,
  });

  return hints;
}

// Pick a random hint, avoiding `avoidId` if a non-trivial pool remains.
// Returns null only when the pool is empty (caller guards on this).
export function pickRandomHint(
  hints: readonly Hint[],
  avoidId: string | null,
  random: () => number = Math.random,
): Hint | null {
  if (hints.length === 0) return null;
  const filtered = avoidId ? hints.filter((h) => h.id !== avoidId) : hints;
  const pool = filtered.length > 0 ? filtered : hints;
  return pool[Math.floor(random() * pool.length)] ?? null;
}

// ─── find-missing-result (R5–R6) hints ───────────────────────────────────
// Levels of the form `K + ? = ?` (R5, add) or `K - ? = ?` (R6, subtract).
// `K` is the static operand, the kid plays the OTHER operand AND the
// result. Loss states fall into three buckets:
//   - both kid slots empty → "drop a card here, then a card there"
//   - operand placed, result empty → "now what's K + a?"
//   - both placed but inconsistent → "your math doesn't match — try another"
//
// `outcome.expectedValue` carries the kid's CURRENT result-slot value
// (slotValue(2)), so direction nudges work the same as find-sum.
function generateFindMissingResultHints(state: AddingGameState): Hint[] {
  const round = state.round;
  if (!round?.outcome) return [];
  const eq = round.equation;
  const operator = eq.operator;
  const computed = round.outcome.computedValue; // K op a (or a op K)
  const result = round.outcome.expectedValue; // kid's result card (or 0 if empty)

  // Find the static value AND the kid's chosen operand.
  const slot0 = eq.operandSlots[0];
  const slot1 = eq.operandSlots[1];
  const slot2 = eq.operandSlots[2];
  const lockedSlot = (() => {
    if (slot0?.locked) return slot0;
    if (slot1?.locked) return slot1;
    return null;
  })();
  const playerOperandSlot = slot0?.locked ? slot1 : slot0;
  const staticValue = cardValueOf(state, lockedSlot?.cardId);
  const playerOperand = cardValueOf(state, playerOperandSlot?.cardId);
  const operandPlaced = !!playerOperandSlot?.cardId;
  const resultPlaced = !!slot2?.cardId;
  const tooBig = result > computed;
  const tooSmall = result < computed;
  const opGlyph = operator === "subtract" ? "−" : "+";

  const hints: Hint[] = [];

  // ── EMPTY-STATE STARTERS ─────────────────────────────────────────────
  if (!operandPlaced && !resultPlaced) {
    hints.push({
      id: "fmr-fill-both",
      emphasis: "Fill both slots.",
      body: `Put one card in the *empty box* on the left, then a card in the *answer box* on the right.`,
    });
  }
  if (operandPlaced && !resultPlaced) {
    // Compute what the answer SHOULD be given the kid's current operand.
    const need = operator === "add" ? staticValue + playerOperand : staticValue - playerOperand;
    hints.push({
      id: "fmr-need-result",
      emphasis: `Find ${need}.`,
      body: `${staticValue} ${opGlyph} ${playerOperand} = ?  Drop the answer in the *right box*.`,
      ...(fits(need) ? { hands: { count: need, caption: `Make ${need}` } } : {}),
    });
  }
  if (!operandPlaced && resultPlaced) {
    hints.push({
      id: "fmr-need-operand",
      emphasis: "Pick a left card.",
      body: `Put a card in the *empty left box*. The right box is your answer for ${staticValue} ${opGlyph} that card.`,
    });
  }

  // ── DIRECTION (both placed but inconsistent) ─────────────────────────
  if (operandPlaced && resultPlaced) {
    if (tooBig) {
      hints.push({
        id: "fmr-result-too-big",
        emphasis: "Answer is too big.",
        body: `${staticValue} ${opGlyph} ${playerOperand} = *${computed}*. Pick a *smaller* answer card.`,
      });
    } else if (tooSmall) {
      hints.push({
        id: "fmr-result-too-small",
        emphasis: "Answer is too small.",
        body: `${staticValue} ${opGlyph} ${playerOperand} = *${computed}*. Pick a *bigger* answer card.`,
      });
    }
    hints.push({
      id: "fmr-mismatch",
      emphasis: `${computed} ≠ ${result}`,
      body: `Your math doesn't match. Either change a card on the *left*, or change the *answer*.`,
    });
  }

  // ── ADD-SPECIFIC (R5) ────────────────────────────────────────────────
  if (operator === "add") {
    hints.push({
      id: "fmr-add-count-up",
      emphasis: `Count up from ${staticValue}.`,
      body: `Start at ${staticValue}. Add the *left card* one finger at a time. Where do you stop?`,
      ...(operandPlaced && fits(staticValue + playerOperand)
        ? {
            hands: {
              count: staticValue + playerOperand,
              caption: `${staticValue} + ${playerOperand}`,
            },
          }
        : {}),
    });
    hints.push({
      id: "fmr-add-bigger-bigger",
      emphasis: "Bigger left, bigger answer.",
      body: `When the left card grows, the *answer grows too*. Pick a bold left card and a bold right card.`,
    });
    hints.push({
      id: "fmr-add-pair-up",
      emphasis: "Pair them up.",
      body: `Find two of YOUR cards where one PLUS ${staticValue} *equals* the other.`,
    });
  }

  // ── SUB-SPECIFIC (R6) ────────────────────────────────────────────────
  if (operator === "subtract") {
    hints.push({
      id: "fmr-sub-count-down",
      emphasis: `Count down from ${staticValue}.`,
      body: `Start at ${staticValue}. Take *the left card away* one finger at a time. Where do you land?`,
      ...(operandPlaced && fits(staticValue - playerOperand) && staticValue >= playerOperand
        ? {
            hands: {
              count: staticValue - playerOperand,
              caption: `${staticValue} − ${playerOperand}`,
            },
          }
        : {}),
    });
    hints.push({
      id: "fmr-sub-pick-small-left",
      emphasis: "Small left, big answer.",
      body: `In ${staticValue} − ?, a *small left card* leaves a BIG answer. A big left card leaves a small one.`,
    });
    hints.push({
      id: "fmr-sub-pair-up",
      emphasis: "Find the pair.",
      body: `Pick a left card. The answer is ${staticValue} *minus* that — find a card that matches.`,
    });
  }

  // ── ENCOURAGEMENT — never the only hint, just one in the rotation. ───
  hints.push({
    id: "fmr-encouragement",
    emphasis: "You got this.",
    body: `Two boxes to fill. The *left card* is your choice; the *right card* must equal ${staticValue} ${opGlyph} that.`,
  });

  return hints;
}

// ─── true-false-multiply (R9) hints ──────────────────────────────────────
// The kid has NEVER seen multiplication before. Every hint must teach by
// COUNTING the dot array, never by appealing to memorized facts. Templates
// frame "3 × 4" as "3 groups of 4" (or "3 fours"), and the only correct
// mental move is to count the dots that the equation renderer puts on
// screen.
//
// We surface the actual a, b, claimed-c values in the hint copy so the
// kid sees the specific numbers AND the dot-count routine attached to
// them, not generic prose. All hint ids start with "tfm-" so the route's
// recently-shown filter keeps them in their own rotation.
function generateTrueFalseMultiplyHints(state: AddingGameState): Hint[] {
  const round = state.round;
  if (!round?.outcome) return [];
  const eq = round.equation;

  const a = cardValueOf(state, eq.operandSlots[0]?.cardId);
  const b = cardValueOf(state, eq.operandSlots[1]?.cardId);
  const c = cardValueOf(state, eq.operandSlots[2]?.cardId);
  const real = a * b;
  const truth = real === c;

  // Verdict pick — read the kid's card directly so the hint can call out
  // what they actually said.
  const verdictCardId = eq.verdictSlot?.cardId;
  const verdictCard = verdictCardId ? state.cards[verdictCardId] : undefined;
  const kidVerdict = verdictCard && isVerdictCard(verdictCard) ? verdictCard.verdict : null;

  const hints: Hint[] = [];

  // Always-on grounding: tell the kid what `a × b` MEANS. Repeating this
  // every wrong-answer is intentional — it's a brand-new concept, and
  // hearing the same framing each time builds the schema.
  hints.push({
    id: "tfm-meaning",
    emphasis: `${a} × ${b} means ${a} groups of ${b}.`,
    body: `Count the dots! There are ${a} rows of ${b}. *Touch each dot* as you count.`,
  });

  // Repeated-addition framing — the only multiplication procedure the kid
  // can apply on day one. Spelled out as `b + b + b` because the kid CAN
  // add. Caps at 3 + groups (matches the R9 scope).
  hints.push({
    id: "tfm-repeated-add",
    emphasis: "It's just adding.",
    body: `${a} × ${b} is the *same* as ${repeatedAddString(b, a)}. Add them up!`,
  });

  // Direction nudge — was the claim too big or too small? Helps the kid
  // narrow without giving the answer.
  if (kidVerdict !== null && !truth) {
    if (c > real) {
      hints.push({
        id: "tfm-too-many",
        emphasis: "There aren't that many dots.",
        body: `The card says ${c}, but ${a} groups of ${b} is *fewer than that*. Count again.`,
      });
    } else if (c < real) {
      hints.push({
        id: "tfm-not-enough",
        emphasis: "There are MORE dots than that.",
        body: `The card says ${c}, but ${a} groups of ${b} is *more*. Count again.`,
      });
    }
  }

  // What did the kid pick + what is the truth? Pure verdict feedback so
  // they connect the True/False card with the dot count.
  if (kidVerdict !== null) {
    const kidSaid = kidVerdict ? "TRUE" : "FALSE";
    const reality = truth ? "TRUE" : "FALSE";
    hints.push({
      id: "tfm-verdict-mismatch",
      emphasis: `You said ${kidSaid}. The dots say ${reality}.`,
      body: `Count the dots one more time. ${a} groups of ${b} is *${real}*. The card says ${c}.`,
    });
  }

  // Encouragement — the kid is doing brand-new math; tell them so.
  hints.push({
    id: "tfm-encouragement",
    emphasis: "This is brand-new math.",
    body: `You're learning *multiplication*! Just count the dots — that's the whole trick.`,
  });

  return hints;
}

// "3 + 3 + 3" for repeatedAddString(3, 3); "4" for repeatedAddString(4, 1).
// Caps at ~6 terms defensively (R12 caps factors at 3, so this is fine).
function repeatedAddString(addend: number, times: number): string {
  if (times <= 0) return "0";
  if (times === 1) return String(addend);
  const capped = Math.min(times, 6);
  return Array.from({ length: capped }, () => String(addend)).join(" + ");
}

// "one more time" for 1, "N more times" for 2+. Hoisted to dodge
// sonarjs's no-nested-template-literals on the stepper-sum direction
// hints.
function formatTapsPhrase(taps: number): string {
  if (taps === 1) return "one more time";
  return `${taps} more times`;
}

// ─── stepper-sum (R9–R11) hints ──────────────────────────────────────────
// The kid sees `a OP b = ?` with a stepper card. They've already solved
// a OR b in their head (find-missing-result territory) — the new
// mechanic here is the tap rhythm. Hints frame the gap as a direction
// + a count: "tap + 3 more times", "tap − until you hit 7", etc.
//
// All hint ids start with "sum-" so the recently-shown filter keeps
// them in their own pool.
function generateStepperSumHints(state: AddingGameState): Hint[] {
  const round = state.round;
  if (!round?.outcome) return [];
  const eq = round.equation;
  const a = cardValueOf(state, eq.operandSlots[0]?.cardId);
  const b = cardValueOf(state, eq.operandSlots[1]?.cardId);
  const stepperValue = cardValueOf(state, eq.operandSlots[2]?.cardId);
  const real = eq.operator === "subtract" ? a - b : a + b;
  const gap = real - stepperValue;
  const tooLow = gap > 0;
  const tooHigh = gap < 0;
  const opGlyph = eq.operator === "subtract" ? "−" : "+";

  const hints: Hint[] = [];

  // Always-on grounding: re-state the equation. Helps the kid re-anchor
  // after a wrong answer.
  hints.push({
    id: "sum-meaning",
    emphasis: `${a} ${opGlyph} ${b} is the answer.`,
    body: `Work out *${a} ${opGlyph} ${b}* in your head, then tap the card up or down to match.`,
  });

  // Direction nudge: which way to tap. Surfaces the gap as a concrete
  // number of taps. Caps at 10 taps for the body copy to stay reasonable
  // (R11 worst case = 20, but if the kid is off by 15+ they need the
  // direction more than a precise count).
  if (tooLow) {
    const tapsPhrase = formatTapsPhrase(Math.min(10, gap));
    hints.push({
      id: "sum-tap-up",
      emphasis: "Tap the + side!",
      body: `Your card is *${stepperValue}*; the answer is bigger. Tap the top of the card ${tapsPhrase}.`,
      ...(real >= 0 && real <= HANDS_MAX
        ? { hands: { count: real, caption: `Land on ${real}` } }
        : {}),
    });
  } else if (tooHigh) {
    const tapsPhrase = formatTapsPhrase(Math.min(10, -gap));
    hints.push({
      id: "sum-tap-down",
      emphasis: "Tap the − side!",
      body: `Your card is *${stepperValue}*; the answer is smaller. Tap the bottom of the card ${tapsPhrase}.`,
      ...(real >= 0 && real <= HANDS_MAX
        ? { hands: { count: real, caption: `Land on ${real}` } }
        : {}),
    });
  }

  // Operator-specific framing.
  if (eq.operator === "add") {
    hints.push({
      id: "sum-add-counting",
      emphasis: `Start at ${a}, then add ${b}.`,
      body: `Hold up *${a} fingers*, then count ${b} more. That's your target.`,
      ...(real >= 0 && real <= HANDS_MAX
        ? { hands: { count: real, caption: `Count to ${real}` } }
        : {}),
    });
  } else {
    hints.push({
      id: "sum-sub-counting",
      emphasis: `Start at ${a}, then take away ${b}.`,
      body: `Hold up *${a} fingers*. Put ${b} of them down. What's left is the answer.`,
      ...(real >= 0 && real <= HANDS_MAX
        ? { hands: { count: real, caption: `Count down to ${real}` } }
        : {}),
    });
  }

  // Encouragement — fills out the rotation so consecutive losses don't
  // repeat.
  hints.push({
    id: "sum-encouragement",
    emphasis: "Take your time.",
    body: `Tap the top to go up, the bottom to go down. The card waits for you.`,
  });

  return hints;
}
