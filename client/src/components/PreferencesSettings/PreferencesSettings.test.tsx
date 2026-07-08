import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SellerPreferences } from "@seller/shared";
import { PreferencesSettings } from "./PreferencesSettings.js";

vi.mock("../../api/preferences.js", () => ({
  getSellerPreferences: vi.fn(),
  updateSellerPreferences: vi.fn(),
}));

import {
  getSellerPreferences,
  updateSellerPreferences,
} from "../../api/preferences.js";

const preferences: SellerPreferences = {
  sellerId: "seller-1",
  toneOfVoice: "concise",
  descriptionLength: "medium",
  pricingStrategy: "balanced",
  defaultCurrency: "CAD",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSellerPreferences).mockResolvedValue(preferences);
  vi.mocked(updateSellerPreferences).mockResolvedValue(preferences);
});

function renderSettings(onClose = vi.fn()) {
  render(<PreferencesSettings isOpen sellerId="seller-1" onClose={onClose} />);
  return { onClose };
}

describe("PreferencesSettings", () => {
  it("loads and displays backend preferences", async () => {
    renderSettings();

    expect(await screen.findByLabelText(/tone of voice/i)).toHaveValue("concise");
    expect(screen.getByLabelText(/description length/i)).toHaveValue("medium");
    expect(screen.getByLabelText(/pricing strategy/i)).toHaveValue("balanced");
    expect(screen.getByLabelText(/default currency/i)).toHaveValue("CAD");
    expect(getSellerPreferences).toHaveBeenCalledWith("seller-1");
  });

  it("saves edited preferences through the typed API", async () => {
    const user = userEvent.setup();
    vi.mocked(updateSellerPreferences).mockResolvedValue({
      ...preferences,
      toneOfVoice: "professional",
      descriptionLength: "short",
      pricingStrategy: "sell_fast",
      shippingPreference: "Local pickup preferred",
    });
    renderSettings();

    await user.selectOptions(await screen.findByLabelText(/tone of voice/i), "professional");
    await user.selectOptions(screen.getByLabelText(/description length/i), "short");
    await user.selectOptions(screen.getByLabelText(/pricing strategy/i), "sell_fast");
    await user.type(screen.getByLabelText(/shipping preference/i), "Local pickup preferred");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() =>
      expect(updateSellerPreferences).toHaveBeenCalledWith(
        "seller-1",
        expect.objectContaining({
          toneOfVoice: "professional",
          descriptionLength: "short",
          pricingStrategy: "sell_fast",
          defaultCurrency: "CAD",
          shippingPreference: "Local pickup preferred",
        }),
      ),
    );
    expect(await screen.findByText("Preferences saved.")).toBeInTheDocument();
  });

  it("preserves unsaved values when saving fails", async () => {
    const user = userEvent.setup();
    vi.mocked(updateSellerPreferences).mockRejectedValue(new Error("Save failed"));
    renderSettings();

    await user.selectOptions(await screen.findByLabelText(/tone of voice/i), "friendly");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Save failed");
    expect(screen.getByLabelText(/tone of voice/i)).toHaveValue("friendly");
  });

  it("allows closing without saving", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderSettings(onClose);

    await user.click(await screen.findByRole("button", { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(updateSellerPreferences).not.toHaveBeenCalled();
  });
});
