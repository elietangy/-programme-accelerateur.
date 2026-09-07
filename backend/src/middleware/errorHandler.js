export function errorHandler(err, req, res, next) {
  console.error(err);
  if (res.headersSent) return next(err);
  const statut = err.statusCode || 500;
  res.status(statut).json({
    erreur: err.message || "Erreur interne du serveur.",
  });
}

export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}
