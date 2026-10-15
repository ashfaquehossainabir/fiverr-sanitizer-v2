import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api/axios.js";

// Planner tasks with optimistic updates: ticking a task feels instant and is rolled
// back by re-fetching if the server rejects it.
export default function useTasks(onError) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const errorRef = useRef(onError);
  errorRef.current = onError;

  const fail = (err, fallback) => errorRef.current?.(err?.response?.data?.message || fallback);

  const reload = useCallback(async () => {
    try {
      const { data } = await api.get("/tasks");
      setTasks(data.tasks);
    } catch (err) {
      fail(err, "Could not load your tasks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const add = useCallback(async (payload) => {
    try {
      const { data } = await api.post("/tasks", payload);
      setTasks((prev) => [data.task, ...prev]);
      return data.task;
    } catch (err) {
      fail(err, "Could not add the task.");
      return null;
    }
  }, []);

  const update = useCallback(
    async (id, patch) => {
      const now = new Date().toISOString();
      setTasks((prev) =>
        prev.map((t) =>
          t._id === id
            ? { ...t, ...patch, ...(patch.done !== undefined ? { doneAt: patch.done ? now : null } : {}) }
            : t
        )
      );
      try {
        const { data } = await api.put(`/tasks/${id}`, patch);
        setTasks((prev) => prev.map((t) => (t._id === id ? data.task : t)));
        return data.task;
      } catch (err) {
        fail(err, "Could not update the task.");
        reload();
        return null;
      }
    },
    [reload]
  );

  const remove = useCallback(
    async (id) => {
      setTasks((prev) => prev.filter((t) => t._id !== id));
      try {
        await api.delete(`/tasks/${id}`);
      } catch (err) {
        fail(err, "Could not delete the task.");
        reload();
      }
    },
    [reload]
  );

  const clearDone = useCallback(async () => {
    setTasks((prev) => prev.filter((t) => !t.done));
    try {
      await api.delete("/tasks/completed/all");
    } catch (err) {
      fail(err, "Could not clear completed tasks.");
      reload();
    }
  }, [reload]);

  const addFocusSession = useCallback(async (id) => {
    try {
      const { data } = await api.put(`/tasks/${id}`, { addFocusSession: true });
      setTasks((prev) => prev.map((t) => (t._id === id ? data.task : t)));
    } catch {
      /* counting sessions is best-effort */
    }
  }, []);

  return { tasks, loading, add, update, remove, clearDone, addFocusSession };
}
