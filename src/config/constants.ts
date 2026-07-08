export const APP = {
  name: "Flow Café",
  locale: "pt-BR",
  currency: "BRL",
  timeZone: "America/Manaus",
} as const;

export const HTTP_STATUS = {
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  conflict: 409,
  unprocessableEntity: 422,
  internalServerError: 500,
} as const;
