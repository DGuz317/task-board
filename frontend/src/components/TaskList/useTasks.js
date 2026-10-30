import { useCallback, useEffect, useRef, useState } from "react";
import { listTasks } from "../../api/tasks.js";

/**
 * Loads tasks from the API and exposes a stable reload() so later
 * create/edit/delete epics can re-trigger a fetch without re-mounting.
 * Loading/error UI is intentionally out of scope here; a failed or
 * pending fetch simply leaves `tasks` as null.
 */
export function useTasks() {
  const [tasks, setTasks] = useState(null);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(() => {
    const requestId = ++requestIdRef.current;
    return listTasks()
      .then((data) => {
        if (mountedRef.current && requestIdRef.current === requestId) {
          setTasks(data);
        }
      })
      .catch(() => {
        // Error UI belongs to the Loading, Error States & Data-Reset
        // Notice epic; this hook stays silent on failure.
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { tasks, reload: load };
}
