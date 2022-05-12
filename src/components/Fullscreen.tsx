import { useEffect, useState } from "react";
import share from "../common/share";

interface Props {
  children: (fullscreen: boolean, troggle: () => void) => JSX.Element;
}

export default function Fullscreen({ children }: Props) {
  const [fullscreen, setFullscreen] = useState(
    document.fullscreenElement != null
  );

  useEffect(() => {
    if (share?.troggleFullscreen) return;

    const onFullscreenChange = () =>
      setFullscreen(document.fullscreenElement != null);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  const troggleFullscreen = async () => {
    // pywebview 不支持浏览器 fullscreen api，留个接口
    if (share?.troggleFullscreen) {
      const isFullscreen = await share.troggleFullscreen();
      setFullscreen(isFullscreen);
      return;
    }

    if (document.fullscreenElement == null) {
      document.body.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return children(fullscreen, troggleFullscreen);
}
