import { formatFieldLabel } from "../../utils/itemAttributes.js";

interface MissingFieldsProps {
  missingFields: string[];
}

export function MissingFields({ missingFields }: MissingFieldsProps) {
  if (missingFields.length === 0) return null;

  return (
    <section
      className="rounded-lg border border-border bg-surface p-4"
      aria-label="Still needed"
    >
      <h3 className="mb-3 text-sm font-semibold text-warning">Still needed</h3>
      <ul className="flex flex-wrap gap-2">
        {missingFields.map((field) => (
          <li
            key={field}
            className="rounded-md bg-secondary-surface px-3 py-1.5 text-sm text-primary-text"
          >
            {formatFieldLabel(field)}
          </li>
        ))}
      </ul>
    </section>
  );
}
