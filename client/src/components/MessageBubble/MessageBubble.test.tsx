import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageBubble } from "./MessageBubble.js";
import { makeMessage } from "../../test/fixtures.js";

describe("MessageBubble", () => {
  it("renders a seller message", () => {
    render(<MessageBubble message={makeMessage("seller", "I'm selling a jacket")} />);
    expect(screen.getByText("I'm selling a jacket")).toBeInTheDocument();
  });

  it("renders an assistant message", () => {
    render(<MessageBubble message={makeMessage("assistant", "What condition is it in?")} />);
    expect(screen.getByText("What condition is it in?")).toBeInTheDocument();
  });
});
