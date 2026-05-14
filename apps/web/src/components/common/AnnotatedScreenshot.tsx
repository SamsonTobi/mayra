"use client";

type Props = {
  src: string | null;
  alt: string;
};

/** Annotated screenshot preview (F10); binary comes from orchestrator / local disk (§C). */
export function AnnotatedScreenshot({ src, alt }: Props) {
  if (!src) {
    return <p className="muted">No screenshot</p>;
  }
  // eslint-disable-next-line @next/next/no-img-element -- static export, local file URLs
  return (
    <img
      src={src}
      alt={alt}
      style={{ maxWidth: "100%", borderRadius: 6, border: "1px solid var(--border)" }}
    />
  );
}
