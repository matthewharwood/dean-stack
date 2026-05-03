import { use } from "react";

// Stable Promise — created at module scope so child renders see the same identity.
// Real production code will read from atoms backed by IDB; this is the M9 demo
// of `use(promise)` consuming a long-lived Promise.
const greetingPromise: Promise<string> = new Promise((resolve) => {
  setTimeout(() => resolve("hello, dean"), 50);
});

export function AsyncGreeting() {
  const greeting = use(greetingPromise);
  return <p className="font-openrunde rounded-card bg-radiant-violet p-4 text-white">{greeting}</p>;
}
