import { describe, expect, it } from "bun:test";
import {
  buildDiceBearLoreleiUrl,
  BACKGROUND_COLORS,
  SKIN_COLORS,
  HAIR_COLORS,
} from "../avatar-url";

describe("buildDiceBearLoreleiUrl", () => {
  it("builds URL with required seed", () => {
    const url = buildDiceBearLoreleiUrl({ seed: "test123" });
    expect(url).toContain("seed=test123");
    expect(url).toContain("backgroundType=solid");
  });

  it("includes optional backgroundColor", () => {
    const url = buildDiceBearLoreleiUrl({ seed: "abc", backgroundColor: "84e7a5" });
    expect(url).toContain("backgroundColor=84e7a5");
  });

  it("includes optional hairColor", () => {
    const url = buildDiceBearLoreleiUrl({ seed: "abc", hairColor: "000000" });
    expect(url).toContain("hairColor=000000");
  });

  it("includes optional skinColor", () => {
    const url = buildDiceBearLoreleiUrl({ seed: "abc", skinColor: "ffe4c4" });
    expect(url).toContain("skinColor=ffe4c4");
  });

  it("sets glassesProbability when glasses is true", () => {
    const url = buildDiceBearLoreleiUrl({ seed: "abc", glasses: true });
    expect(url).toContain("glassesProbability=100");
  });

  it("sets frecklesProbability when freckles is true", () => {
    const url = buildDiceBearLoreleiUrl({ seed: "abc", freckles: true });
    expect(url).toContain("frecklesProbability=100");
  });

  it("sets beardProbability when beard is true", () => {
    const url = buildDiceBearLoreleiUrl({ seed: "abc", beard: true });
    expect(url).toContain("beardProbability=100");
  });

  it("sets earringsProbability when earrings is true", () => {
    const url = buildDiceBearLoreleiUrl({ seed: "abc", earrings: true });
    expect(url).toContain("earringsProbability=100");
  });

  it("uses DiceBear API base URL", () => {
    const url = buildDiceBearLoreleiUrl({ seed: "x" });
    expect(url).toStartWith("https://api.dicebear.com/9.x/lorelei/svg?");
  });

  it("combines multiple options", () => {
    const url = buildDiceBearLoreleiUrl({
      seed: "multi",
      backgroundColor: "3bd3fd",
      hairColor: "8b5e3c",
      skinColor: "c6866b",
      glasses: true,
    });
    expect(url).toContain("seed=multi");
    expect(url).toContain("backgroundColor=3bd3fd");
    expect(url).toContain("hairColor=8b5e3c");
    expect(url).toContain("skinColor=c6866b");
    expect(url).toContain("glassesProbability=100");
  });
});

describe("BACKGROUND_COLORS", () => {
  it("has 8 color options", () => {
    expect(BACKGROUND_COLORS).toHaveLength(8);
  });

  it("each option has label and value", () => {
    for (const c of BACKGROUND_COLORS) {
      expect(c).toHaveProperty("label");
      expect(c).toHaveProperty("value");
    }
  });
});

describe("SKIN_COLORS", () => {
  it("has 5 skin tone options", () => {
    expect(SKIN_COLORS).toHaveLength(5);
  });
});

describe("HAIR_COLORS", () => {
  it("has 7 hair color options", () => {
    expect(HAIR_COLORS).toHaveLength(7);
  });
});
