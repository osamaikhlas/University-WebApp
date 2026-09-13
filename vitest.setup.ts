// Loaded before any test file's imports run, so modules that validate/read process.env at
// import time (e.g. src/lib/env.ts) see the same variables the app would in dev/build.
import "dotenv/config";
import "@testing-library/jest-dom/vitest";
