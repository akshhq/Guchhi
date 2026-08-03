/**
 * storage.js
 * Thin wrapper around window.localStorage so the rest of the app never
 * touches the browser API directly. Swapping this for IndexedDB, a cookie,
 * or a remote session store later only means editing this one file.
 */

const memoryFallback = new Map();
let localStorageAvailable = true;

try {
  const testKey = '__guchhi_storage_test__';
  window.localStorage.setItem(testKey, '1');
  window.localStorage.removeItem(testKey);
} catch (err) {
  localStorageAvailable = false;
}

export function getItem(key, fallback = null) {
  try {
    const raw = localStorageAvailable
      ? window.localStorage.getItem(key)
      : memoryFallback.get(key);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`storage.getItem failed for "${key}"`, err);
    return fallback;
  }
}

export function setItem(key, value) {
  try {
    const raw = JSON.stringify(value);
    if (localStorageAvailable) {
      window.localStorage.setItem(key, raw);
    } else {
      memoryFallback.set(key, raw);
    }
    return true;
  } catch (err) {
    console.error(`storage.setItem failed for "${key}"`, err);
    return false;
  }
}

export function removeItem(key) {
  try {
    if (localStorageAvailable) {
      window.localStorage.removeItem(key);
    } else {
      memoryFallback.delete(key);
    }
    return true;
  } catch (err) {
    console.error(`storage.removeItem failed for "${key}"`, err);
    return false;
  }
}
