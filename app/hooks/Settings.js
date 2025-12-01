import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { API_URL_APP } from "../constant/api";

export default function useSettings({ autoFetch = true } = {}) {
  const url = `${API_URL_APP}/api/v1/admin/settings`;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const client = axios; // define axios client

  const fetchSettings = useCallback(
    async (config = {}) => {
      // Abort previous request if any
      if (abortRef.current) {
        try { abortRef.current.abort(); } catch (e) {}
      }

      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const resp = await client.get(url, { signal: controller.signal, ...config });
        setData(resp.data);
        return resp.data.data;
      } catch (err) {
        // Ignore abort errors
        if (err?.name === "CanceledError" || err?.message === "canceled") {
          return;
        }
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [url]
  );

  const refresh = useCallback(() => fetchSettings(), [fetchSettings]);

  useEffect(() => {
    if (autoFetch) fetchSettings();
    return () => {
      try { abortRef.current?.abort(); } catch (e) {}
    };
  }, [autoFetch, fetchSettings]);

  return {
    data,
    loading,
    error,
    fetchSettings,
    refresh,
  };
}
