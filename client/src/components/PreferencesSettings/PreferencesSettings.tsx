import { useEffect, useState } from "react";
import {
  CURRENCY_CODES,
  type DescriptionLength,
  type PricingStrategy,
  type SellerPreferences,
  type SupportedCurrency,
  type ToneOfVoice,
} from "@seller/shared";
import {
  getSellerPreferences,
  updateSellerPreferences,
} from "../../api/preferences.js";

interface PreferencesSettingsProps {
  isOpen: boolean;
  sellerId: string;
  onClose: () => void;
}

function readErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

export function PreferencesSettings({
  isOpen,
  sellerId,
  onClose,
}: PreferencesSettingsProps) {
  const [preferences, setPreferences] = useState<SellerPreferences | null>(null);
  const [toneOfVoice, setToneOfVoice] = useState<ToneOfVoice | "">("");
  const [descriptionLength, setDescriptionLength] = useState<DescriptionLength | "">("");
  const [pricingStrategy, setPricingStrategy] = useState<PricingStrategy | "">("");
  const [defaultCurrency, setDefaultCurrency] = useState<SupportedCurrency | "">("");
  const [shippingPreference, setShippingPreference] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const populateForm = (next: SellerPreferences) => {
    setPreferences(next);
    setToneOfVoice(next.toneOfVoice);
    setDescriptionLength(next.descriptionLength);
    setPricingStrategy(next.pricingStrategy);
    setDefaultCurrency(next.defaultCurrency);
    setShippingPreference(next.shippingPreference ?? "");
  };

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setSavedMessage(null);

    getSellerPreferences(sellerId)
      .then((next) => {
        if (!cancelled) populateForm(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(readErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, sellerId]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!toneOfVoice || !descriptionLength || !pricingStrategy || !defaultCurrency) {
      setError("Preferences are still loading. Please try again.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSavedMessage(null);
    try {
      const next = await updateSellerPreferences(sellerId, {
        toneOfVoice,
        descriptionLength,
        pricingStrategy,
        defaultCurrency,
        shippingPreference,
      });
      populateForm(next);
      setSavedMessage("Preferences saved.");
    } catch (err) {
      setError(readErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const controlsDisabled = isLoading || isSaving || !preferences;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-end bg-primary-text/20 p-4"
      role="presentation"
    >
      <section
        aria-label="Seller preferences"
        className="mt-16 flex w-full max-w-md flex-col rounded-lg border border-border bg-surface p-5 shadow-lg"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-primary-text">Preferences</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm font-medium text-secondary-text transition-colors hover:text-primary-text"
          >
            Close
          </button>
        </div>

        {isLoading && <p className="text-sm text-secondary-text">Loading preferences...</p>}

        {!isLoading && preferences && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSave();
            }}
          >
            <div>
              <label htmlFor="tone-of-voice" className="mb-1 block text-xs text-secondary-text">
                Tone of voice
              </label>
              <select
                id="tone-of-voice"
                className="w-full rounded-lg border border-border bg-main-bg px-3 py-2 text-sm text-primary-text focus:border-primary-accent focus:bg-surface focus:outline-none"
                value={toneOfVoice}
                onChange={(event) => setToneOfVoice(event.target.value as ToneOfVoice)}
                disabled={controlsDisabled}
              >
                <option value="concise">Concise</option>
                <option value="friendly">Friendly</option>
                <option value="professional">Professional</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="description-length"
                className="mb-1 block text-xs text-secondary-text"
              >
                Description length
              </label>
              <select
                id="description-length"
                className="w-full rounded-lg border border-border bg-main-bg px-3 py-2 text-sm text-primary-text focus:border-primary-accent focus:bg-surface focus:outline-none"
                value={descriptionLength}
                onChange={(event) => setDescriptionLength(event.target.value as DescriptionLength)}
                disabled={controlsDisabled}
              >
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="detailed">Detailed</option>
              </select>
            </div>

            <div>
              <label htmlFor="pricing-strategy" className="mb-1 block text-xs text-secondary-text">
                Pricing strategy
              </label>
              <select
                id="pricing-strategy"
                className="w-full rounded-lg border border-border bg-main-bg px-3 py-2 text-sm text-primary-text focus:border-primary-accent focus:bg-surface focus:outline-none"
                value={pricingStrategy}
                onChange={(event) => setPricingStrategy(event.target.value as PricingStrategy)}
                disabled={controlsDisabled}
              >
                <option value="sell_fast">Sell fast</option>
                <option value="balanced">Balanced</option>
                <option value="maximize_price">Maximize price</option>
              </select>
            </div>

            <div>
              <label htmlFor="default-currency" className="mb-1 block text-xs text-secondary-text">
                Default currency
              </label>
              <select
                id="default-currency"
                className="w-full rounded-lg border border-border bg-main-bg px-3 py-2 text-sm text-primary-text focus:border-primary-accent focus:bg-surface focus:outline-none"
                value={defaultCurrency}
                onChange={(event) => setDefaultCurrency(event.target.value as SupportedCurrency)}
                disabled={controlsDisabled}
              >
                {CURRENCY_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="shipping-preference" className="mb-1 block text-xs text-secondary-text">
                Shipping preference
              </label>
              <input
                id="shipping-preference"
                className="w-full rounded-lg border border-border bg-main-bg px-3 py-2 text-sm text-primary-text placeholder-secondary-text focus:border-primary-accent focus:bg-surface focus:outline-none"
                value={shippingPreference}
                onChange={(event) => setShippingPreference(event.target.value)}
                disabled={controlsDisabled}
                placeholder="Optional"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm font-medium text-secondary-accent">
                {error}
              </p>
            )}
            {savedMessage && <p className="text-sm font-medium text-success">{savedMessage}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-secondary-text transition-colors hover:text-primary-text disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={controlsDisabled}
                className="rounded-md bg-primary-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-secondary-accent disabled:cursor-not-allowed disabled:bg-secondary-surface disabled:text-secondary-text"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        )}

        {!isLoading && !preferences && error && (
          <p role="alert" className="text-sm font-medium text-secondary-accent">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
