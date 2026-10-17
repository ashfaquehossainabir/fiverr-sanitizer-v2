export function notFound(req, res, next) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
}

export function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(" ");
    return res.status(400).json({ message });
  }

  // A malformed id (e.g. /api/tabs/not-an-id) or an unparseable date used to
  // surface as a 500; it is a bad request.
  if (err.name === "CastError") {
    return res.status(400).json({ message: `Invalid ${err.path || "value"}.` });
  }

  // express.json() rejects bad JSON bodies with a 400-level error.
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Request body is not valid JSON." });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({ message: `An account with this ${field} already exists.` });
  }

  const statusCode = err.status || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  res.status(statusCode).json({
    message: err.message || "Something went wrong on the server."
  });
}
