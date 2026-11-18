/** Paper copy of the open draft. Native inputs can clip long or multiline values on paper. */
export function FinanceDraftPrint({ title, fields }: {
  title: string;
  fields: [string, string | undefined][];
}) {
  return (
    <section className="entrip-print-only finance-draft-print">
      <h2>{title}</h2>
      <p className="operations-print-scope">작성 중 · 미제출</p>
      <dl>
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value?.trim() ? value : '미입력'}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
