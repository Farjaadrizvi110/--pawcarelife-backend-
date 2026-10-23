import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { validateBody } from "../middleware/validate.js";
import { ArticleModel } from "../models/Article.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { todayISO } from "../utils/date.js";
import { articleSchema, type ArticleInput } from "../validation/schemas.js";

export const articlesRouter = Router();

/** Fields the public feed is allowed to expose. Internals never leave here. */
const PUBLIC_PROJECTION = "-_id -__v -status -createdAt -updatedAt";

/** Rejects a slug that another article already owns. */
async function assertSlugAvailable(slug: string, excludeId?: string): Promise<void> {
  const query: Record<string, unknown> = { slug };
  if (excludeId) query._id = { $ne: excludeId };

  if (await ArticleModel.exists(query)) {
    throw new AppError(409, `Slug "${slug}" is already in use`);
  }
}

/**
 * Read by the site build (app/scripts/sync-content.mjs) to bake published
 * articles into static HTML. Filtering on status here is what keeps drafts off
 * the live site.
 */
articlesRouter.get(
  "/public",
  asyncHandler(async (_req, res) => {
    const articles = await ArticleModel.find({ status: "published" })
      .sort({ datePublished: -1 })
      .select(PUBLIC_PROJECTION)
      .lean();

    res.json({ articles });
  }),
);

// Everything below this line requires a dashboard session.
articlesRouter.use(requireAuth);

/** Full list for the dashboard, drafts included. */
articlesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const articles = await ArticleModel.find().sort({ updatedAt: -1 }).lean();
    res.json({ articles });
  }),
);

articlesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const article = await ArticleModel.findById(req.params.id).lean();
    if (!article) throw new AppError(404, "Article not found");
    res.json({ article });
  }),
);

articlesRouter.post(
  "/",
  validateBody(articleSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as ArticleInput;
    await assertSlugAvailable(input.slug);

    const today = todayISO();
    const article = await ArticleModel.create({
      ...input,
      datePublished: input.datePublished ?? today,
      dateModified: today,
    });

    res.status(201).json({ article });
  }),
);

articlesRouter.put(
  "/:id",
  validateBody(articleSchema),
  asyncHandler(async (req, res) => {
    const { datePublished, ...rest } = req.body as ArticleInput;
    await assertSlugAvailable(rest.slug, req.params.id);

    const article = await ArticleModel.findByIdAndUpdate(
      req.params.id,
      {
        ...rest,
        // Preserve the original publish date unless the editor deliberately
        // supplied a new one - otherwise editing would rewrite history and
        // reset the article's freshness signals in search.
        ...(datePublished ? { datePublished } : {}),
        dateModified: todayISO(),
      },
      { new: true, runValidators: true },
    );

    if (!article) throw new AppError(404, "Article not found");
    res.json({ article });
  }),
);

articlesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const article = await ArticleModel.findByIdAndDelete(req.params.id);
    if (!article) throw new AppError(404, "Article not found");
    res.json({ ok: true });
  }),
);
