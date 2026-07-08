import type { ItemAttributes } from "@seller/shared";
import {
  ITEM_ATTRIBUTE_FIELDS,
  formatAttributeValue,
  formatFieldLabel,
} from "../../utils/itemAttributes.js";

interface ItemFactsPanelProps {
  attributes: ItemAttributes | null;
  changedFields: ReadonlySet<string>;
}

export function ItemFactsPanel({ attributes, changedFields }: ItemFactsPanelProps) {
  const values = attributes ?? {};

  return (
    <section
      className="rounded-lg border border-border bg-surface p-5"
      aria-label="Item facts"
    >
      <h3 className="mb-4 text-sm font-semibold text-primary-text">Item Facts</h3>
      <dl className="flex flex-col">
        {ITEM_ATTRIBUTE_FIELDS.map((field) => {
          const isKnown = values[field] !== undefined && values[field] !== null && values[field] !== "";
          const isChanged = changedFields.has(field);
          return (
            <div
              key={field}
              className={
                isChanged
                  ? "flex animate-highlight-fade items-baseline justify-between gap-3 py-1.5"
                  : "flex items-baseline justify-between gap-3 py-1.5"
              }
            >
              <dt className="flex-shrink-0 text-xs text-secondary-text">
                {formatFieldLabel(field)}
              </dt>
              <dd
                className={
                  isKnown
                    ? isChanged
                      ? "text-right text-sm font-semibold text-highlight-accent"
                      : "text-right text-sm font-medium text-primary-text"
                    : "text-right text-sm text-secondary-text"
                }
              >
                {formatAttributeValue(field, values)}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
