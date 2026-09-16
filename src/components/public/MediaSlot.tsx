import { clsx } from "clsx";

/**
 * A placeholder image "slot" — real college photography (campus, classrooms, labs,
 * students, faculty, events, library, sports, seminars) belongs here once supplied, but
 * this project must never fabricate real photographs of the college (project instruction
 * §15) and the CSP's `img-src` only allows `'self' blob: data:` (next.config.ts) anyway, so
 * every "image" today is a generated gradient/pattern composition in the public palette,
 * not a stock photo standing in for a real one. Each slot is unmistakably a placeholder: a
 * visible caption names what belongs there, and the pattern itself is `aria-hidden` since
 * the caption is the real accessible content.
 *
 * When real photography is available, swap the rendered output for a Next <Image> reading
 * from the college's Media/Document store — this component's `scene`/`ratio`/`className`
 * API is designed to stay a drop-in replacement (see docs/public-design-system.md).
 */
const SCENES = {
  campus: "linear-gradient(135deg, var(--pub-navy-900), var(--pub-navy-700) 55%, var(--pub-teal-600))",
  library: "linear-gradient(150deg, var(--pub-navy-800), var(--pub-teal-700) 70%)",
  lab: "linear-gradient(140deg, var(--pub-teal-700), var(--pub-navy-900) 65%)",
  students: "linear-gradient(160deg, var(--pub-navy-700), var(--pub-gold-600) 120%)",
  faculty: "linear-gradient(145deg, var(--pub-navy-900), var(--pub-navy-600))",
  event: "linear-gradient(135deg, var(--pub-teal-600), var(--pub-navy-800) 70%)",
  sports: "linear-gradient(150deg, var(--pub-gold-600), var(--pub-navy-800) 75%)",
  seminar: "linear-gradient(140deg, var(--pub-navy-800), var(--pub-teal-500) 80%)",
  generic: "linear-gradient(135deg, var(--pub-navy-800), var(--pub-navy-600))",
} as const;

export type MediaScene = keyof typeof SCENES;

export function MediaSlot({
  scene = "generic",
  caption,
  ratio = "video",
  className,
  rounded = true,
}: {
  scene?: MediaScene;
  caption: string;
  ratio?: "video" | "square" | "portrait" | "wide";
  className?: string;
  rounded?: boolean;
}) {
  const aspectClass = {
    video: "aspect-video",
    square: "aspect-square",
    portrait: "aspect-[3/4]",
    wide: "aspect-[21/9]",
  }[ratio];

  return (
    <div
      className={clsx(
        "group relative isolate flex items-end overflow-hidden",
        aspectClass,
        rounded && "rounded-[var(--pub-radius-lg)]",
        className,
      )}
      style={{ background: SCENES[scene] }}
    >
      <div
        aria-hidden="true"
        className="pub-texture-dots absolute inset-0 text-white/[0.07] transition-transform duration-[var(--pub-duration-slow)] ease-[var(--pub-ease)] group-hover:scale-105"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-[var(--pub-navy-950)]/70 via-transparent to-transparent"
      />
      <p className="relative z-10 px-4 py-3 text-xs font-medium tracking-wide text-white/85">
        {caption}
        <span className="ml-1.5 text-white/50">— image placeholder</span>
      </p>
    </div>
  );
}
