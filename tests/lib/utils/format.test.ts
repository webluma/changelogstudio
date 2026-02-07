import { formatDate, formatDateWindow, formatRelativeTime } from "@/lib/utils/format";

describe("format utils", () => {
  it("formats a date in en-US", () => {
    expect(formatDate("2026-02-07T10:00:00.000Z")).toBe("Feb 07, 2026");
  });

  it("formats date window with both dates", () => {
    expect(formatDateWindow("2026-02-01", "2026-02-07")).toBe("Feb 01 - Feb 07");
  });

  it("formats date window fallback messages", () => {
    expect(formatDateWindow()).toBe("No date range");
    expect(formatDateWindow("2026-02-01")).toContain("Starts");
    expect(formatDateWindow(undefined, "2026-02-07")).toContain("Ends");
  });

  it("formats relative time deterministically", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-07T12:00:00.000Z"));

    expect(formatRelativeTime("2026-02-07T11:00:00.000Z")).toBe("1 hour ago");
    expect(formatRelativeTime("2026-02-07T12:30:00.000Z")).toBe("in 30 minutes");

    vi.useRealTimers();
  });
});
