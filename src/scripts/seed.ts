import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { connectDatabase, disconnectDatabase } from "../config/db.js";
import { ArticleModel, CATEGORIES } from "../models/Article.js";
import { ensureAdminAccount } from "../services/admin.service.js";
import { todayISO } from "../utils/date.js";

/**
 * Imports the articles that used to be hardcoded in app/src/data/articles.ts so
 * they can be edited from the dashboard instead of in code.
 *
 * Safe to re-run: it upserts by slug, so existing slugs - and therefore every
 * existing URL and its search ranking - are preserved and nothing is
 * duplicated.
 */

const here = dirname(fileURLToPath(import.meta.url));
// api/src/scripts -> api/src -> api -> backend -> repository root
const SNAPSHOT_PATH = resolve(here, "../../../../app/src/data/seed.articles.json");

interface SourceArticle {
  slug?: string;
  title?: string;
  category?: string;
  excerpt?: string;
  readTime?: number;
  keyword?: string;
  datePublished?: string;
  dateModified?: string;
  featured?: boolean;
  health?: boolean;
  image?: string;
  imageAlt?: string;
  intro?: string[];
  sections?: { heading: string; body: string[] }[];
  faq?: { q: string; a: string }[];
  related?: string[];
}

function loadSnapshot(): SourceArticle[] {
  try {
    const rows: unknown = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"));
    if (Array.isArray(rows) && rows.length > 0) return rows as SourceArticle[];
  } catch {
    // Reported with a helpful message below.
  }

  throw new Error(
    `Could not read the article snapshot at ${SNAPSHOT_PATH}\n` +
      "Generate it first:  cd app && npm run dump:articles",
  );
}

/** Fills in missing optional fields so a partial snapshot still imports. */
function normalise(source: SourceArticle, today: string) {
  const category =
    source.category && (CATEGORIES as readonly string[]).includes(source.category)
      ? source.category
      : CATEGORIES[0];

  return {
    slug: source.slug ?? "",
    title: source.title ?? "",
    category,
    excerpt: source.excerpt ?? source.title ?? "",
    readTime: source.readTime ?? 5,
    keyword: source.keyword ?? "",
    datePublished: source.datePublished ?? today,
    dateModified: source.dateModified ?? source.datePublished ?? today,
    featured: Boolean(source.featured),
    health: Boolean(source.health),
    image: source.image ?? "",
    imageAlt: source.imageAlt ?? "",
    intro: source.intro ?? [],
    sections: source.sections ?? [],
    faq: source.faq ?? [],
    related: source.related ?? [],
    status: "published" as const,
  };
}

async function main(): Promise<void> {
  await connectDatabase();
  console.log("[seed] connected to MongoDB");
  await ensureAdminAccount();

  const rows = loadSnapshot();
  const today = todayISO();
  let created = 0;
  let updated = 0;

  for (const source of rows) {
    const article = normalise(source, today);
    if (!article.slug || !article.title) continue;

    const result = await ArticleModel.updateOne(
      { slug: article.slug },
      { $set: article },
      { upsert: true },
    );

    if (result.upsertedCount > 0) created += 1;
    else updated += 1;
  }

  console.log(`[seed] done - ${created} created, ${updated} updated, ${rows.length} in snapshot`);
  console.log('[seed] imported articles are marked "published" and will render on the site.');

  await disconnectDatabase();
}

main().catch((error: unknown) => {
  console.error("[seed] failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
