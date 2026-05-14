import { describe, expect, it } from "bun:test";
import { formatTime } from "../time";

describe("formatTime", () => {
  it("formats zero seconds", () => {
    expect(formatTime(0)).toBe("00:00");
  });

  it("formats seconds only (< 60)", () => {
    expect(formatTime(5)).toBe("00:05");
    expect(formatTime(45)).toBe("00:45");
    expect(formatTime(59)).toBe("00:59");
  });

  it("formats exactly one minute", () => {
    expect(formatTime(60)).toBe("01:00");
  });

  it("formats minutes and seconds", () => {
    expect(formatTime(90)).toBe("01:30");
    expect(formatTime(125)).toBe("02:05");
    expect(formatTime(3661)).toBe("61:01");
  });

  it("pads single-digit minutes and seconds", () => {
    expect(formatTime(7)).toBe("00:07");
    expect(formatTime(67)).toBe("01:07");
  });

  it("handles large values", () => {
    expect(formatTime(3600)).toBe("60:00");
    expect(formatTime(10000)).toBe("166:40");
  });
});
