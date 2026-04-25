"use client";

import DOMPurify from "isomorphic-dompurify";
import type { ElementType } from "react";

const DEFAULT_ALLOWED_TAGS = [
  "p",
  "br",
  "b",
  "strong",
  "i",
  "em",
  "u",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "span",
  "div",
  "a",
  "blockquote",
];

const DEFAULT_ALLOWED_ATTR = ["href", "target", "rel", "class", "style"];

type RichHtmlProps = {
  html?: string | null;
  as?: ElementType;
  className?: string;
  allowedTags?: string[];
  allowedAttributes?: string[];
};

export function RichHtml({
  html,
  as: Component = "div",
  className,
  allowedTags = DEFAULT_ALLOWED_TAGS,
  allowedAttributes = DEFAULT_ALLOWED_ATTR,
}: RichHtmlProps) {
  if (!html) return null;

  const safeHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: allowedAttributes,
  });

  return (
    <Component
      className={className}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
