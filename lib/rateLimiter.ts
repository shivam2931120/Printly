/**
 * Client-side rate limiter with token bucket algorithm.
 * Protects RPCs, payment endpoints, and auth flows from abuse.
 */

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, RateLimitBucket>();

/**
 * Check if an action is allowed under rate limiting.
 * @param key - Unique key for the action (e.g. 'payment', 'signup', 'rpc:get_admin_orders')
 * @param maxTokens - Max burst size (default 10)
 * @param refillRate - Tokens added per second (default 2)
 * @returns true if allowed, false if rate-limited
 */
export const checkRateLimit = (
  key: string,
  maxTokens: number = 10,
  refillRate: number = 2
): boolean => {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { tokens: maxTokens, lastRefill: now };
    buckets.set(key, bucket);
  }

  // Refill tokens based on elapsed time
  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(maxTokens, bucket.tokens + elapsed * refillRate);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return true;
  }

  return false;
};

/**
 * Rate-limited wrapper for async functions.
 * Shows a toast warning when rate-limited.
 */
export const withRateLimit = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  key: string,
  options?: { maxTokens?: number; refillRate?: number; onLimited?: () => void }
): T => {
  const { maxTokens = 10, refillRate = 2, onLimited } = options || {};

  return (async (...args: any[]) => {
    if (!checkRateLimit(key, maxTokens, refillRate)) {
      console.warn(`Rate limited: ${key}`);
      onLimited?.();
      throw new Error('Too many requests. Please wait a moment.');
    }
    return fn(...args);
  }) as T;
};

// Pre-configured rate limiters for specific actions
export const RateLimits = {
  /** Payment: 3 attempts per 30s */
  payment: (fn: () => Promise<any>) => {
    if (!checkRateLimit('payment', 3, 0.1)) {
      throw new Error('Too many payment attempts. Please wait before trying again.');
    }
    return fn();
  },

  /** Auth signup: 5 attempts per minute */
  signup: (fn: () => Promise<any>) => {
    if (!checkRateLimit('auth:signup', 5, 0.083)) {
      throw new Error('Too many signup attempts. Please try again in a minute.');
    }
    return fn();
  },

  /** Auth signin: 8 attempts per minute */
  signin: (fn: () => Promise<any>) => {
    if (!checkRateLimit('auth:signin', 8, 0.133)) {
      throw new Error('Too many sign-in attempts. Please try again shortly.');
    }
    return fn();
  },

  /** RPC calls: 20 per 10s */
  rpc: (key: string, fn: () => Promise<any>) => {
    if (!checkRateLimit(`rpc:${key}`, 20, 2)) {
      throw new Error('Too many requests. Please slow down.');
    }
    return fn();
  },

  /** Order creation: 5 per minute */
  createOrder: (fn: () => Promise<any>) => {
    if (!checkRateLimit('order:create', 5, 0.083)) {
      throw new Error('Too many orders placed. Please wait before placing another.');
    }
    return fn();
  },

  /** File upload: 10 per minute */
  upload: (fn: () => Promise<any>) => {
    if (!checkRateLimit('upload', 10, 0.167)) {
      throw new Error('Too many uploads. Please wait a moment.');
    }
    return fn();
  },
};

/**
 * Debounce utility for search inputs and rapid-fire events.
 */
export const debounce = <T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): T & { cancel: () => void } => {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: any[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };

  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
  };

  return debounced as T & { cancel: () => void };
};

/**
 * Throttle utility for scroll/resize events.
 */
export const throttle = <T extends (...args: any[]) => void>(
  fn: T,
  limit: number
): T => {
  let throttling = false;

  return ((...args: any[]) => {
    if (!throttling) {
      fn(...args);
      throttling = true;
      setTimeout(() => { throttling = false; }, limit);
    }
  }) as T;
};
