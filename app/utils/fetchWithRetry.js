export const fetchWithRetry = async (fn, retries = 3, delay = 500) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await fn();
      if (result && result.length !== 0) return result; // Success
    } catch (error) {
      console.log(`Attempt ${attempt} failed:`, error);
    }

    if (attempt < retries) {
      await new Promise(res => setTimeout(res, delay)); // wait before retry
    }
  }

  return []; // all attempts failed
};
