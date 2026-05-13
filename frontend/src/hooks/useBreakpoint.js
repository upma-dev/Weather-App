import { useState, useEffect, useMemo } from "react";

/**
 * Tracks window width for responsive layout (resize listener, SSR-safe default).
 */
export function useBreakpoint() {
  const [width, setWidth] = useState(
    () => (typeof window !== "undefined" ? window.innerWidth : 1024)
  );

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return useMemo(
    () => ({
      width,
      isXs: width < 400,
      isSm: width < 640,
      isMd: width < 768,
      isLg: width < 1024,
    }),
    [width]
  );
}
