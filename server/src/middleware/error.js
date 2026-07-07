export const notFound = (req, res, _next) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

export const errorHandler = (err, _req, res, _next) => {
  let status = err.statusCode || 500;
  let message = err.message || "Internal server error";

  if (err?.name === "MulterError" && err?.code === "LIMIT_FILE_SIZE") {
    status = 400;
    message = "File is too large. Maximum allowed size is 25 MB.";
  } else if (err?.code === "ENOENT") {
    status = 500;
    message = "File upload failed. Please try again.";
  } else if (status >= 500 && !err?.expose && process.env.NODE_ENV === "production") {
    message = "Something went wrong. Please try again.";
  }

  res.status(status).json({
    message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack
  });
};

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
