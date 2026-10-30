// JSON request helper shared by all API functions. Base URL contract lives
// in ../config.js; this module never hard-codes a host.
import { API_BASE_URL } from "../config.js";

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

function errorMessageFromBody(body, status, statusText) {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const { detail } = body;
    if (typeof detail === "string") {
      return detail;
    }
    if (Array.isArray(detail)) {
      return detail.map((item) => item.msg ?? String(item)).join(", ");
    }
  }
  return `HTTP ${status} ${statusText}`;
}

export async function request(path, init = {}) {
  const { body, headers, ...rest } = init;
  const hasBody = body !== undefined;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: hasBody
        ? { "Content-Type": "application/json", ...headers }
        : headers,
      body: hasBody ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ApiError(err.message, 0, undefined);
  }

  const text = await response.text();
  let parsed;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = undefined;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      errorMessageFromBody(parsed, response.status, response.statusText),
      response.status,
      parsed,
    );
  }

  if (response.status === 204 || !text) {
    return undefined;
  }

  return parsed;
}
