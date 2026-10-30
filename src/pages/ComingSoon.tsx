/** Placeholder for screens that arrive in a later phase. */
export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <section className="rounded border border-dashed border-gray-300 p-6 text-center text-gray-500">
        Coming soon
      </section>
    </div>
  );
}
