import "dotenv/config"
import express, { type Express } from "express"
import identifyRouter from "./routes/identify"
import { errorHandler } from "./middleware/errorHandler"

const app: Express = express()
const PORT = process.env.PORT ?? 3000

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

// Health route
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() })
})

app.use("/", identifyRouter)

// error handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" })
})

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV ?? "development"}`)
})

export default app
