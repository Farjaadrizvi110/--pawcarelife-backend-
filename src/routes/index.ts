import { Router } from "express";
import { articlesRouter } from "./articles.routes.js";
import { authRouter } from "./auth.routes.js";
import { buildRouter } from "./build.routes.js";
import { uploadRouter } from "./upload.routes.js";

/** All feature routers, mounted under /api by the app factory. */
export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/articles", articlesRouter);
apiRouter.use("/upload", uploadRouter);
apiRouter.use("/build", buildRouter);
