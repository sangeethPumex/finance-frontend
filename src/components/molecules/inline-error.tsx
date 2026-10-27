/** Renders nothing when there is no error. Accepts an Error, a string or anything thrown. */
export function InlineError({ error }: { error?: unknown }) {
  if (!error) return null;
  const text = error instanceof Error ? error.message : typeof error === "string" ? error : "Something went wrong";
  return <p role="alert" className="text-[13px] text-ink underline decoration-dotted underline-offset-2">{text}</p>;
}
