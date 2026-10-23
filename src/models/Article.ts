import { Schema, model, type InferSchemaType } from "mongoose";

/**
 * The five content pillars. Adding a value here automatically widens the Zod
 * enum used by the API, so the dashboard and database stay in step.
 */
export const CATEGORIES = [
  "Dog Care",
  "Cat Care",
  "Pet Health",
  "Street Animals",
  "Donkey Welfare",
] as const;

/** Drafts stay private; only published articles reach the public site. */
export const ARTICLE_STATUSES = ["draft", "published"] as const;

/** Body sections use the lightweight markup the site's renderer understands. */
const sectionSchema = new Schema(
  {
    heading: { type: String, required: true, trim: true },
    body: { type: [String], default: [] },
  },
  { _id: false },
);

const faqSchema = new Schema(
  {
    q: { type: String, required: true, trim: true },
    a: { type: String, required: true, trim: true },
  },
  { _id: false },
);

/**
 * Field names and types deliberately mirror the frontend `Article` interface
 * (app/src/data/articles.ts). That 1:1 match is what lets published content
 * drop into the static build without any transformation, so SEO output stays
 * identical to the hand-written articles.
 *
 * Dates are stored as plain "YYYY-MM-DD" strings rather than Date objects:
 * the site renders and sorts them as strings, so keeping them as strings
 * avoids off-by-one timezone bugs.
 */
const articleSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: [...CATEGORIES], required: true, index: true },
    excerpt: { type: String, required: true, trim: true },
    readTime: { type: Number, default: 5, min: 1 },
    keyword: { type: String, default: "", trim: true },
    datePublished: { type: String, required: true },
    dateModified: { type: String, required: true },
    featured: { type: Boolean, default: false },
    health: { type: Boolean, default: false },
    image: { type: String, default: "" },
    imageAlt: { type: String, default: "" },
    intro: { type: [String], default: [] },
    sections: { type: [sectionSchema], default: [] },
    faq: { type: [faqSchema], default: [] },
    related: { type: [String], default: [] },
    status: { type: String, enum: [...ARTICLE_STATUSES], default: "draft", index: true },
  },
  { timestamps: true },
);

/** Speeds up the public feed, which always filters by status and sorts by date. */
articleSchema.index({ status: 1, datePublished: -1 });

export type Article = InferSchemaType<typeof articleSchema>;

export const ArticleModel = model("Article", articleSchema);
