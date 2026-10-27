/** Full-screen centered column, for sign-in. */
export function CenteredLayout({ children }: { children: React.ReactNode }) {
  return <main className="grid min-h-dvh place-items-center px-4">{children}</main>;
}
