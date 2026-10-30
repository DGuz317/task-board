// Typed task CRUD calls, all built on the shared request() helper.
import { request } from "./client.js";

/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} created_at
 */

export function listTasks() {
  return request("/tasks");
}

export function createTask(payload) {
  return request("/tasks", { method: "POST", body: payload });
}

export function updateTask(id, payload) {
  return request(`/tasks/${id}`, { method: "PUT", body: payload });
}

export function deleteTask(id) {
  return request(`/tasks/${id}`, { method: "DELETE" });
}
