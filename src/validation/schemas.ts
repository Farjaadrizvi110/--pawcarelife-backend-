import { z } from "zod";
import { ARTICLE_STATUSES, CATEGORIES } from "../models/Article.js";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Dates must use the YYYY-MM-DD format");

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const sectionSchema = z.object({
  heading: z.string().trim().min(3, "Section headings need at least 3 characters"),
  body: z.array(z.string()).default([]),
});

const faqSchema = z.object({
  q: z.string().trim().min(5, "FAQ questions need at least 5 characters"),
  a: z.string().trim().min(10, "FAQ answers need at least 10 characters"),
});

/**
 * Editorial rules live here rather than in the dashboard, so no client can
 * store content that would weaken the site's topical authority. Every article
 * must ship intro copy, body sections, at least 5 FAQs (they become FAQ
 * structured data) and at least 3 internal links.
 */
export const articleSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase words joined by single hyphens",
    ),
  title: z.string().trim().min(10, "Title needs at least 10 characters").max(200),
  category: z.enum(CATEGORIES),
  excerpt: z
    .string()
    .trim()
    .min(20, "Excerpt needs at least 20 characters")
    .max(400, "Excerpt must stay under 400 characters"),
  readTime: z.coerce.number().int().min(1).max(60).default(5),
  keyword: z.string().trim().max(120).default(""),
  datePublished: isoDate.optional(),
  dateModified: isoDate.optional(),
  featured: z.boolean().default(false),
  health: z.boolean().default(false),
  image: z.string().trim().default(""),
  imageAlt: z.string().trim().default(""),
  intro: z.array(z.string().trim().min(1)).min(2, "Add at least 2 intro paragraphs"),
  sections: z.array(sectionSchema).min(1, "Add at least 1 body section"),
  faq: z.array(faqSchema).min(5, "Add at least 5 FAQs"),
  related: z.array(z.string().trim().min(1)).min(3, "Add at least 3 related article slugs"),
  status: z.enum(ARTICLE_STATUSES).default("draft"),
});

export type ArticleInput = z.infer<typeof articleSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
