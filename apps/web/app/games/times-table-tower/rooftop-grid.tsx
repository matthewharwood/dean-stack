// R16 capstone view — the 11×11 times-table grid the kid plays like a
// xylophone. Each cell shows its product (a × b) for a ∈ 0..10, b ∈
// 0..10. The diagonal of squares (0, 1, 4, 9, 16, …, 100) glows gold
// so the spatial pattern of the table is visible at a glance.
//
// The parent supplies the active prompt (a product the NPC has called
// out). The kid taps any cell containing that value — there are
// usually two (a × b and b × a, commutativity), either is correct.
// Wrong taps don't punish; they're just no-ops.
//
// Pure visual leaf. State (prompt, mastered prompts) lives in the
// parent route.

export function RooftopGrid({
  promptProduct,
  onCellTap,
}: {
  // Current prompt — kid is hunting for any cell with this product.
  // `null` means no prompt (initial or post-win celebration).
  promptProduct: number | null;
  // Tap callback. Fired with the cell's a / b indices (0..10 each)
  // and its product. Parent decides whether the tap counts.
  onCellTap: (a: number, b: number, product: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4" data-test="rooftop-grid">
      <header className="text-center">
        <div className="text-xs italic uppercase tracking-wider text-muted-gray">The rooftop</div>
        {promptProduct == null ? (
          <div className="font-openrunde text-2xl font-semibold text-muted-gray">
            Waiting for a prompt…
          </div>
        ) : (
          <div className="font-openrunde text-3xl font-bold text-slate-ink">
            Tap any cell that shows{" "}
            <span className="rounded-md bg-amber-200 px-3 py-1 text-amber-900">
              {promptProduct}
            </span>
          </div>
        )}
      </header>
      <div
        className="grid gap-px rounded-lg border-2 border-slate-ink bg-slate-ink/20 p-1"
        style={{ gridTemplateColumns: "repeat(11, minmax(0, 1fr))" }}
        data-test="rooftop-grid-cells"
      >
        {Array.from({ length: 11 * 11 }, (_, i) => {
          const a = Math.floor(i / 11);
          const b = i % 11;
          const product = a * b;
          const isDiagonal = a === b;
          return (
            <button
              key={`${a}-${b}`}
              type="button"
              onClick={() => onCellTap(a, b, product)}
              className={`flex h-9 w-9 items-center justify-center rounded-sm font-openrunde text-xs font-bold transition-colors tabular-nums ${cellClass(product, isDiagonal)}`}
              data-test="rooftop-cell"
              data-cell-a={a}
              data-cell-b={b}
              data-cell-product={product}
            >
              {product}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Color-grade each cell by magnitude so the grid reads as a landscape
// (low values pale, high values deeper). The square-number diagonal
// glows amber. Hover lifts the cell slightly so the tap target is
// obvious on touch + mouse.
function cellClass(product: number, isDiagonal: boolean): string {
  if (isDiagonal) {
    return "bg-amber-100 text-amber-900 border border-amber-400 hover:bg-amber-200";
  }
  // 4 tiers: 0-9, 10-29, 30-59, 60-100. Deeper sky-blue with magnitude.
  if (product === 0) return "bg-canvas-white text-muted-gray hover:bg-whisper-purple";
  if (product < 10) return "bg-sky-50 text-slate-ink hover:bg-sky-100";
  if (product < 30) return "bg-sky-100 text-slate-ink hover:bg-sky-200";
  if (product < 60) return "bg-sky-200 text-slate-ink hover:bg-sky-300";
  return "bg-sky-300 text-slate-ink hover:bg-sky-400";
}
