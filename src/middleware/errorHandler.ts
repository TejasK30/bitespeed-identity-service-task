import { Request, Response, NextFunction } from "express"
import { ZodError, ZodIssue } from "zod"

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: unknown,
  ) {
    super(message)
    this.name = "AppError"
    Error.captureStackTrace(this, this.constructor)
  }
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  console.error(
    `[ERROR] ${(req as Request).method} ${(req as Request).path} →`,
    err,
  )

  if (err instanceof ZodError) {
    const zodErr = err as ZodError
    res.status(400).json({
      error: "Validation Error",
      details: zodErr.issues.map((issue: ZodIssue) => ({
        path: issue.path.join(".") || "root",
        message: issue.message,
      })),
    })
    return
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    })
    return
  }

  const message = err instanceof Error ? err.message : "Unknown error occurred"

  res.status(500).json({
    error: "Internal Server Error",
    ...(process.env.NODE_ENV === "development" ? { message } : {}),
  })
}
