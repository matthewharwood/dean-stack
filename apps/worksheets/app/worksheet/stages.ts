import { type Stage, StageSchema } from "./schema";

// 15 stages mirroring the Halidzone game's 15 rounds. Ranges and locked
// positions are derived from `apps/web/app/games/adding-game/levels.ts` and
// the per-round Playwright specs (`apps/web/tests/adding-game-round-N.app.spec.ts`).
//
// Source-of-truth split:
//   - The Halidzone *game* owns problem rendering, scoring, and progression.
//   - This Worksheets app owns *paper* rendering for the same mechanics.
// The two stay in sync by mirroring the round taxonomy here, NOT by importing
// from `apps/web` (which would couple two deployable apps).
//
// To add a stage: append to STAGES_RAW, bump ordinal, and the index page
// picks it up automatically.

const STAGES_RAW: readonly Stage[] = (
  [
    {
      id: "s1",
      ordinal: 1,
      title: "Stage 1: Adding Up",
      subtitle: "Pick two numbers that add to the target.",
      introCopy:
        "Welcome to Stage 1! Find two numbers that add up to the target on the right side of each equation. There are many right answers — pick any pair that works.",
      fieldLog: "Halidzone needs pairs of numbers that add up. Build twelve.",
      instruction: "Write two numbers in the blanks that add up to each target.",
      paperShape: "fill-pair",
      operator: "add",
      comparator: "eq",
      operandRange: { min: 1, max: 5 },
      resultRange: { min: 5, max: 10 },
      problemCount: 12,
    },
    {
      id: "s2",
      ordinal: 2,
      title: "Stage 2: Taking Away",
      subtitle: "Subtract to reach the target.",
      introCopy:
        "Now we subtract! Write two numbers so that the first minus the second equals the target. The first number must be bigger than (or equal to) the second.",
      fieldLog: "Something took some away. Find what's left.",
      instruction: "Write two numbers so the first minus the second equals each target.",
      paperShape: "fill-pair",
      operator: "subtract",
      comparator: "eq",
      operandRange: { min: 1, max: 9 },
      resultRange: { min: 1, max: 7 },
      problemCount: 12,
    },
    {
      id: "s3",
      ordinal: 3,
      title: "Stage 3: Bigger or Smaller",
      subtitle: "Make the equation true — but it's an inequality.",
      introCopy:
        "These equations use the greater-than (>) or less-than (<) sign instead of equals. Add or subtract two numbers so the answer is bigger (or smaller) than the target.",
      fieldLog: "Balance the scale. Bigger than? Smaller than? You decide.",
      instruction: "Fill in two numbers so the inequality is true. There are many right answers.",
      paperShape: "fill-pair",
      operator: "mixed-add-sub",
      comparator: "mixed-gt-lt",
      operandRange: { min: 1, max: 7 },
      resultRange: { min: 5, max: 14 },
      problemCount: 10,
    },
    {
      id: "s4",
      ordinal: 4,
      title: "Stage 4: Gauntlet",
      subtitle: "Mixed operators and mixed comparators.",
      introCopy:
        "The gauntlet! Every equation might use +, −, =, > or <. Read carefully and write two numbers that make each one true.",
      fieldLog: "The gauntlet. Any operator. Any comparison. Stay sharp.",
      instruction: "Fill in two numbers so each equation or inequality is true.",
      paperShape: "fill-pair",
      operator: "mixed-add-sub",
      comparator: "mixed-gt-lt",
      operandRange: { min: 1, max: 9 },
      resultRange: { min: 8, max: 18 },
      problemCount: 10,
    },
    {
      id: "s5",
      ordinal: 5,
      title: "Stage 5: Add to Find Both",
      subtitle: "One number is given. Pick the rest.",
      introCopy:
        "One number is already filled in. Pick a friendly addend, then write what the two would equal. Both blanks have to match!",
      fieldLog: "We give you one piece. Find the other — and the total it makes.",
      instruction: "Fill the blank addend AND the result so the equation is consistent.",
      paperShape: "fill-consistent-pair",
      operator: "add",
      comparator: "eq",
      operandRange: { min: 1, max: 5 },
      resultRange: { min: 2, max: 9 },
      lockedOperandRange: { min: 1, max: 4 },
      lockedPosition: "a",
      problemCount: 12,
    },
    {
      id: "s6",
      ordinal: 6,
      title: "Stage 6: Subtract to Find Both",
      subtitle: "The bigger number is given. Find the rest.",
      introCopy:
        "The first number is filled in. Pick how much to take away, then write the result. The two blanks must agree!",
      fieldLog: "Decide how much to remove. Then say what remains.",
      instruction: "Fill the subtracted number AND the result so the equation is consistent.",
      paperShape: "fill-consistent-pair",
      operator: "subtract",
      comparator: "eq",
      operandRange: { min: 1, max: 5 },
      resultRange: { min: 0, max: 9 },
      lockedOperandRange: { min: 5, max: 9 },
      lockedPosition: "a",
      problemCount: 12,
    },
    {
      id: "s7",
      ordinal: 7,
      title: "Stage 7: Adding Bigger Numbers",
      subtitle: "Same idea, bigger numbers.",
      introCopy:
        "Same as Stage 5 — fill both blanks so the equation works — but the given number is bigger now. Counting on your fingers is fine and good!",
      fieldLog: "Bigger payloads now. Fingers, dots, marks — whatever helps.",
      instruction: "Fill the blank addend AND the result so the equation is consistent.",
      paperShape: "fill-consistent-pair",
      operator: "add",
      comparator: "eq",
      operandRange: { min: 1, max: 14 },
      resultRange: { min: 6, max: 30 },
      lockedOperandRange: { min: 5, max: 14 },
      lockedPosition: "a",
      problemCount: 10,
    },
    {
      id: "s8",
      ordinal: 8,
      title: "Stage 8: Subtracting from the Teens",
      subtitle: "Take away from numbers up to 20.",
      introCopy:
        "We're counting down from a number in the teens. Pick how much to take away, then write what's left. Both blanks must agree.",
      fieldLog: "Counting down from the teens. Take away. Say what's left.",
      instruction: "Fill the subtracted number AND the result so the equation is consistent.",
      paperShape: "fill-consistent-pair",
      operator: "subtract",
      comparator: "eq",
      operandRange: { min: 1, max: 10 },
      resultRange: { min: 0, max: 18 },
      lockedOperandRange: { min: 10, max: 19 },
      lockedPosition: "a",
      problemCount: 10,
    },
    {
      id: "s9",
      ordinal: 9,
      title: "Stage 9: Find the Missing Addend",
      subtitle: "What number makes the equation true?",
      introCopy:
        "On the screen you'd tap a stepper. On paper, just write the missing number! Each equation has one number missing — figure out what it should be.",
      fieldLog: "One number is missing from each line. Find it.",
      instruction: "Write the missing number that makes each equation true.",
      paperShape: "fill-blank",
      operator: "add",
      comparator: "eq",
      operandRange: { min: 0, max: 6 },
      resultRange: { min: 1, max: 10 },
      blankPosition: "b",
      problemCount: 15,
    },
    {
      id: "s10",
      ordinal: 10,
      title: "Stage 10: Find the Missing Subtracted Number",
      subtitle: "What did we take away?",
      introCopy:
        "Same idea as Stage 9, but with subtraction. Figure out how much was taken away to land on the answer.",
      fieldLog: "Reverse engineer: how much went away to leave that?",
      instruction: "Write the missing number that makes each equation true.",
      paperShape: "fill-blank",
      operator: "subtract",
      comparator: "eq",
      operandRange: { min: 1, max: 10 },
      resultRange: { min: 0, max: 9 },
      blankPosition: "b",
      problemCount: 15,
    },
    {
      id: "s11",
      ordinal: 11,
      title: "Stage 11: Mixed Missing Numbers",
      subtitle: "Plus and minus, side by side.",
      introCopy:
        "Watch the operator! Some problems use + and some use −. Write the missing number in each blank.",
      fieldLog: "Read every sign. Some add. Some take away. Stay alert.",
      instruction: "Write the missing number. Read the + or − sign carefully before you answer.",
      paperShape: "fill-blank",
      operator: "mixed-add-sub",
      comparator: "eq",
      operandRange: { min: 1, max: 12 },
      resultRange: { min: 1, max: 20 },
      blankPosition: "b",
      problemCount: 12,
    },
    {
      id: "s12",
      ordinal: 12,
      title: "Stage 12: True or False?",
      subtitle: "Is the multiplication correct?",
      introCopy:
        "Multiplication! For each equation, decide if it's TRUE or FALSE. Circle your answer. You can draw rows of dots to check.",
      fieldLog: "Multiplication arrives. Verify each claim. Use the dots.",
      instruction: "Decide if each multiplication equation is TRUE or FALSE. Circle one.",
      paperShape: "true-false",
      operator: "multiply",
      comparator: "eq",
      operandRange: { min: 1, max: 3 },
      resultRange: { min: 1, max: 9 },
      problemCount: 12,
    },
    {
      id: "s13",
      ordinal: 13,
      title: "Stage 13: How Many In Each Group?",
      subtitle: "Find the missing factor on the right.",
      introCopy:
        "If we have a number of groups and a total, how many are in each group? Find the missing number that completes the multiplication.",
      fieldLog: "How many in each group? Reverse the rows.",
      instruction: "Write the missing factor that makes each multiplication true.",
      paperShape: "fill-blank",
      operator: "multiply",
      comparator: "eq",
      operandRange: { min: 1, max: 9 },
      resultRange: { min: 1, max: 45 },
      blankPosition: "b",
      problemCount: 12,
    },
    {
      id: "s14",
      ordinal: 14,
      title: "Stage 14: How Many Groups?",
      subtitle: "Find the missing factor on the left.",
      introCopy:
        "Same as Stage 13, but the missing number is on the left. Figure out how many groups of the second number you'd need to reach the total.",
      fieldLog: "How many groups? Stack the rows until they reach the total.",
      instruction: "Write the missing factor that makes each multiplication true.",
      paperShape: "fill-blank",
      operator: "multiply",
      comparator: "eq",
      operandRange: { min: 1, max: 9 },
      resultRange: { min: 1, max: 45 },
      blankPosition: "a",
      problemCount: 12,
    },
    {
      id: "s15",
      ordinal: 15,
      title: "Stage 15: Solve the Product",
      subtitle: "Multiply two numbers, write the answer.",
      introCopy:
        "Final stage! Multiply the two numbers and write the product. Drawing rows of dots or skip-counting both work.",
      fieldLog: "Final stage. Multiply the rows. Write the total.",
      instruction: "Multiply the two numbers and write the product.",
      paperShape: "fill-blank",
      operator: "multiply",
      comparator: "eq",
      operandRange: { min: 1, max: 9 },
      resultRange: { min: 1, max: 81 },
      blankPosition: "c",
      problemCount: 12,
    },
  ] as const
).map((s) => StageSchema.parse(s));

export const STAGES: readonly Stage[] = STAGES_RAW;

const STAGES_BY_ID = new Map(STAGES.map((s) => [s.id, s] as const));

export function findStage(id: string): Stage | undefined {
  return STAGES_BY_ID.get(id);
}

export function listStages(): readonly Stage[] {
  return STAGES;
}
