import { describe, it, expect } from "vitest";
import { extractImageSources, stripHtml } from "../src/tp/html-images.js";

describe("extractImageSources", () => {
  it("returns empty for null/empty", () => {
    expect(extractImageSources(undefined)).toEqual([]);
    expect(extractImageSources("")).toEqual([]);
    expect(extractImageSources("no images here")).toEqual([]);
  });

  it("extracts a single src", () => {
    const html = `<p>see <img src="https://tp.example.com/Attachment.aspx?AttachmentID=42" alt="screenshot"></p>`;
    expect(extractImageSources(html)).toEqual([
      { src: "https://tp.example.com/Attachment.aspx?AttachmentID=42", alt: "screenshot" },
    ]);
  });

  it("dedupes repeated srcs", () => {
    const html = `<img src="a.png"><br><img src="a.png"><img src="b.png">`;
    const out = extractImageSources(html);
    expect(out.map((x) => x.src)).toEqual(["a.png", "b.png"]);
  });

  it("decodes HTML entities in src", () => {
    const html = `<img src="https://tp.example.com/file.aspx?id=1&amp;v=2">`;
    expect(extractImageSources(html)[0].src).toBe("https://tp.example.com/file.aspx?id=1&v=2");
  });

  it("handles single quotes", () => {
    const html = `<img src='one.png' alt='x'>`;
    expect(extractImageSources(html)).toEqual([{ src: "one.png", alt: "x" }]);
  });
});

describe("stripHtml", () => {
  it("returns empty for null", () => {
    expect(stripHtml(undefined)).toBe("");
  });

  it("removes tags but keeps text", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("turns <br> and block ends into newlines", () => {
    expect(stripHtml("<p>line 1</p><p>line 2</p>line 3<br>line 4")).toBe(
      "line 1\nline 2\nline 3\nline 4"
    );
  });

  it("formats list items with dashes", () => {
    expect(stripHtml("<ul><li>a</li><li>b</li></ul>")).toBe("- a\n- b");
  });
});
