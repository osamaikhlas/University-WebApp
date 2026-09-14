// Vitest stand-in for the `server-only` package.
//
// `server-only`'s real package.json only swaps in its no-op build under the `react-server`
// export condition, which Next.js's bundler sets and Vitest/Node does not — so importing
// the real package from a plain Vitest run throws unconditionally by design (it's meant to
// break a client bundle that imports server-only code). This file replaces it in tests
// (see vitest.config.mts's `resolve.alias`) with an actual no-op so `src/lib/auth/session.ts`
// and `src/lib/auth/guard.ts` can be unit tested directly.
export {};
