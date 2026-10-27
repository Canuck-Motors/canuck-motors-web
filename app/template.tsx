// Re-mounts on every page change, giving each page a soft fade-in (opacity only, so sticky headers keep working).
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="cm-page-in">{children}</div>;
}
