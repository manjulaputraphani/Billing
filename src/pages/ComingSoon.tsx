/** Placeholder for screens that arrive in a later phase. */
export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <h1 className="page-title">{title}</h1>
      <section className="rounded border border-dashed border-line p-6 text-center text-muted">
        Coming soon
      </section>
    </div>
  );
}
