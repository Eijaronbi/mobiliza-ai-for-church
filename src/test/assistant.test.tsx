import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Assistant } from "@/routes/app.assistant";

const state = vi.hoisted(() => ({ services: [] as { id: string; name: string; date: string; workflowId: string }[], run: vi.fn() }));
vi.mock("@/hooks/use-data", () => ({
  useListData: (key: string) => key === "services" ? state.services : [],
  useAction: () => state.run,
}));

vi.mock("@/hooks/use-app", () => ({ useApp: () => ({ mode: "demo", tenantId: "t1" }) }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (f: unknown) => f, createServerFn: () => ({ middleware: () => ({ inputValidator: () => ({ handler: () => vi.fn() }) }) }) }));
vi.mock("@/lib/ai.functions", () => ({ askMobiliza: vi.fn() }));

afterEach(() => { cleanup(); state.services = []; vi.clearAllMocks(); });

describe("Ask AI regression", () => {
  it("does not treat scrollIntoView's return value as an effect cleanup", () => {
    // A non-void browser/polyfill return reproduced the navigation crash.
    const scroll = vi.fn(() => true);
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: scroll });
    const view = render(<Assistant />);
    fireEvent.change(screen.getByRole("textbox", { name: "Ask a question" }), { target: { value: "Who needs transportation?" } });
    expect(() => fireEvent.click(screen.getByRole("button", { name: "Send question" }))).not.toThrow();
    expect(scroll).toHaveBeenCalled();
    expect(() => view.unmount()).not.toThrow();
  });

  it("does not dispatch mobilization when there is no service", () => {
    render(<Assistant />);
    fireEvent.click(screen.getByRole("button", { name: "Start the mobilization workflow" }));
    expect(screen.getByRole("log")).toHaveTextContent("No upcoming service is available.");
    expect(state.run).not.toHaveBeenCalled();
  });
});