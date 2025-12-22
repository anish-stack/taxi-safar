import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { API_URL_APP } from "../constant/api";
import useDriverStore from "../store/driver.store";


const useEarnings = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const {driver} = useDriverStore()

  const fetchEarnings = useCallback(async () => {
    if (!driver?._id) return;

    try {
      setLoading(true);
      setError(null);

      const res = await axios.get(
        `${API_URL_APP}/api/v1/driver-earnings/${driver?._id}`);

      setData(res.data?.data);
    } catch (err) {
      console.log("❌ Earnings fetch error:", err?.response?.data || err.message);
      setError(
        err?.response?.data?.message || "Failed to load earnings"
      );
    } finally {
      setLoading(false);
    }
  }, [driver]);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  return {
    earnings: data,
    loading,
    error,
    refetch: fetchEarnings,
  };
};

export default useEarnings;
