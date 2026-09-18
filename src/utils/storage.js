// small helper for localStorage (safe JSON)
export const load = (key, fallback = []) => {
    try {
      return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
    } catch {
      return fallback;
    }
  };
  
  export const save = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  };
  