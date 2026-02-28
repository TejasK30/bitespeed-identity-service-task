import {
  Router,
  Request,
  Response,
  NextFunction,
  type Router as ExpressRouter,
} from "express"
import { identifyRequestSchema } from "../validators/identify.schema"
import { identifyContact } from "../services/identity.service"

const router: ExpressRouter = Router()

router.post(
  "/identify",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = identifyRequestSchema.parse(req.body)
      const result = await identifyContact(parsed)
      res.status(200).json({ contact: result })
    } catch (error) {
      next(error)
    }
  },
)

export default router
