import { describe, expect, it } from "vitest";
import { csvToObjects, parseCsv } from "./csv";

describe("csv", () => {
  it("parses quotes, commas, escaped quotes and newlines inside quotes", () => {
    const rows = parseCsv('a,b,c\r\n1,"x, y","say ""hi"""\n"line1\nline2",2,3\n');
    expect(rows).toEqual([
      ["a", "b", "c"],
      ["1", "x, y", 'say "hi"'],
      ["line1\nline2", "2", "3"],
    ]);
  });
  it("skips blank lines and strips a BOM", () => {
    expect(parseCsv("﻿a,b\n\n1,2\n\n")).toEqual([["a", "b"], ["1", "2"]]);
  });
  it("maps rows to lower-cased header keys and pads short rows", () => {
    expect(csvToObjects("Label_Name, Weight\nIvy,14.6\nMochi")).toEqual([
      { label_name: "Ivy", weight: "14.6" },
      { label_name: "Mochi", weight: "" },
    ]);
  });
});
