import PlayArrowOutlinedIcon from "@mui/icons-material/PlayArrowOutlined";
import StopOutlinedIcon from "@mui/icons-material/StopOutlined";
import IconButton from "@mui/material/IconButton";
import PauseIcon from "@mui/icons-material/Pause";
import { useEffect, useState } from "react";

import { Tree } from "../behavior-tree/type";
import { Manager } from "../common/service/DebugService";
import FloatButtonGroup, {
  FloatButtonLabel,
} from "../components/FloatButtonGroup";
import { TransFunction } from "../storage/Locale";

interface Props {
  trans: TransFunction;
  tree: Tree;
  manager: Manager;
}
export default function DebugController({ trans, tree, manager }: Props) {
  const [playing, setPlaying] = useState(false);
  const [attachDebugState, setAttachDebugState] = useState(
    null as ReturnType<typeof manager.attachDebug> | null
  );
  useEffect(() => {
    const state = manager.attachDebug(tree);
    setAttachDebugState(state);
    const debugPlaying = window.localStorage.getItem("debugPlaying") ?? "true";
    debugPlaying === "true" && state.start().then(() => setPlaying(true));
    return () => {
      state.done();
    };
  }, [tree]);

  if (attachDebugState == null) return null;

  const { start, pause, stop } = attachDebugState;
  const onPause = () => {
    window.localStorage.setItem("debugPlaying", "false");
    pause().then(() => setPlaying(false));
  };
  const onStart = () => {
    window.localStorage.setItem("debugPlaying", "true");
    start().then(() => setPlaying(true));
  };
  const onStop = () => {
    window.localStorage.setItem("debugPlaying", "false");
    stop().then(() => setPlaying(false));
  };

  return (
    <FloatButtonGroup left="2em">
      <FloatButtonLabel>{}</FloatButtonLabel>
      {playing ? (
        <IconButton title={trans("Pause play")} onClick={onPause}>
          <PauseIcon />
        </IconButton>
      ) : (
        <IconButton title={trans("Start play")} onClick={onStart}>
          <PlayArrowOutlinedIcon />
        </IconButton>
      )}
      <IconButton title={trans("Stop play")} onClick={onStop}>
        <StopOutlinedIcon />
      </IconButton>
    </FloatButtonGroup>
  );
}
