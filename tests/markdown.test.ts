import { describe, expect, it } from "vitest";
import markdownit from "markdown-it";

const md = markdownit();

describe("markdown-it rendering", () => {
  it("renders ordinary Markdown", () => {
    expect(md.render("**bold** and `code`")).toBe(
      "<p><strong>bold</strong> and <code>code</code></p>\n"
    );
  });

  it("escapes raw HTML because html is disabled by default", () => {
    const html = md.render('<script>alert("xss")</script>');

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("does not create javascript: links", () => {
    const html = md.render("[click me](javascript:alert(1))");

    expect(html).not.toContain('href="javascript:');
    expect(html).toContain("[click me](javascript:alert(1))");
  });
});
