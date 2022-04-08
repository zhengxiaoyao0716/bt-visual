import { useEffect, useState } from "react";

export function useWindowSize() {
  const [{ innerWidth, innerHeight }, setWindowSize] = useState({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
  });
  useEffect(() => {
    const onResize = () => {
      if (
        window.innerWidth === innerWidth &&
        window.innerHeight === innerHeight
      ) {
        return;
      }
      setWindowSize({
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
      });
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);
  return [innerWidth, innerHeight];
}
