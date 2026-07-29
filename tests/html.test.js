import { assertEqual, test } from "./runner.js";

import {
  sanitizeHTML,
  setSanitizedHTML,
} from "../js/utils/html.js";

test("sanitizeHTML keeps allowed formatting elements", () => {
  const sanitized = sanitizeHTML(
    "<p>Hello <strong>reader</strong><br><em>today</em></p>",
  );

  assertEqual(
    sanitized,
    "<p>Hello <strong>reader</strong><br><em>today</em></p>",
  );
});

test("sanitizeHTML removes dangerous elements and their contents", () => {
  const sanitized = sanitizeHTML(
    "<p>Safe</p><script>alert(1)</script><iframe>hidden</iframe>",
  );

  assertEqual(sanitized, "<p>Safe</p>");
});

test("sanitizeHTML unwraps unapproved elements but keeps safe text", () => {
  const sanitized = sanitizeHTML("<section><p>News</p><span>reader</span></section>");

  assertEqual(sanitized, "<p>News</p>reader");
});

test("sanitizeHTML removes unsafe attributes and links", () => {
  const sanitized = sanitizeHTML(
    '<p onclick="alert(1)">Hi <a href="javascript:alert(1)" data-id="1">bad</a></p>',
  );

  assertEqual(sanitized, "<p>Hi <a>bad</a></p>");
});

test("sanitizeHTML keeps safe links with external link protections", () => {
  const sanitized = sanitizeHTML(
    '<a href="https://example.com/story" onclick="alert(1)">story</a>',
  );

  assertEqual(
    sanitized,
    '<a href="https://example.com/story" target="_blank" rel="noopener noreferrer nofollow">story</a>',
  );
});

test("sanitizeHTML treats missing HTML as an empty string", () => {
  assertEqual(sanitizeHTML(), "");
  assertEqual(sanitizeHTML(null), "");
});

test("setSanitizedHTML never assigns raw API HTML directly", () => {
  const element = document.createElement("div");

  setSanitizedHTML(element, '<img src=x onerror="alert(1)">Plain text');

  assertEqual(element.querySelector("img"), null);
  assertEqual(element.textContent, "Plain text");
});
