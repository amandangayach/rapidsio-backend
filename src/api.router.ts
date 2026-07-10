import { Router } from "express";
import authRouter from "@/routers/auth.routes";
import orderRouter from "@/routers/order.routes";
import blogRouter from "@/routers/blog.routes";
import serviceRouter from "@/routers/service.routes";
import sampleRouter from "@/routers/sample.routes";
import dashboardRouter from "@/routers/dashboard.routes";
import userRouter from "@/routers/user.routes";
import testimonialRouter from "@/routers/testimonial.routes";
import imageAssetsRouter from "@/routers/imageAssets.routes";
import caseStudyRouter from "@/routers/caseStudy.routes";

const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/order", orderRouter);
apiRouter.use("/blogs", blogRouter);
apiRouter.use("/services", serviceRouter);
apiRouter.use("/samples", sampleRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/testimonials", testimonialRouter);
apiRouter.use("/image-assets", imageAssetsRouter);
apiRouter.use("/case-studies", caseStudyRouter);

export default apiRouter;
