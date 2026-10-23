export default function AboutHero({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-ink text-white">
      <div className="cm-grid-drift pointer-events-none absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_70%_30%,#000_20%,transparent_70%)]" />
      <div className="cm-glow pointer-events-none absolute -right-24 -top-24 -z-10 h-96 w-96 rounded-full bg-brand/30 blur-3xl" />
      <div className="cm-glow pointer-events-none absolute -bottom-40 -left-24 -z-10 h-80 w-80 rounded-full bg-brand/15 blur-3xl [animation-delay:-3s]" />
      <div className="cm-container relative pb-16 pt-14 md:pb-24 md:pt-20">
        <span className="cm-mask">
          <p className="cm-eyebrow cm-up">{eyebrow}</p>
        </span>
        <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-[-0.045em] md:text-6xl">
          <span className="cm-mask">
            <span className="cm-up [--d:0.12s]">{title}</span>
          </span>
        </h1>
        {children && (
          <div className="cm-up mt-5 max-w-3xl text-base leading-7 text-white/70 [--d:0.3s] md:text-lg">{children}</div>
        )}
      </div>
    </section>
  );
}
