import CalculateOutlinedIcon from "@mui/icons-material/CalculateOutlined";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowOutlinedIcon from "@mui/icons-material/PlayArrowOutlined";
import StopOutlinedIcon from "@mui/icons-material/StopOutlined";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import { useEffect, useState } from "react";

import { Tree } from "../behavior-tree/type";
import { Manager } from "../common/service/DebugService";
import FloatButtonGroup, {
  FloatButtonLabel,
} from "../components/FloatButtonGroup";
import { TransFunction } from "../storage/Locale";
import TextField from "@mui/material/TextField";
import { inputOnKeyDown } from "../components/Hotkey";
import LinearProgress from "@mui/material/LinearProgress";

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

  const { start, pause, stop, query } = attachDebugState;
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
      <Divider />
      <PropEvaluator trans={trans} query={query} />
    </FloatButtonGroup>
  );
}

function PropEvaluator({
  trans,
  query,
}: {
  trans: TransFunction;
  query: (bind: string) => Promise<string>;
}) {
  const [bind, setBind] = useState("");
  const [open, setOpen] = useState(false);
  const [[value, quering], setValue] = useState<[string, boolean]>(["", false]);

  const title = trans("Evaluate Store Value");
  const onCancel = () => setOpen(false);
  const onSubmit = async () => {
    setValue(["", true]);
    const value = await query(bind);
    setValue([value, false]);
  };

  return (
    <>
      <IconButton title={title} onClick={() => setOpen(true)}>
        <CalculateOutlinedIcon />
      </IconButton>
      <Dialog open={open} onKeyDown={inputOnKeyDown({ onCancel, onSubmit })}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label={trans("Please input the key of the store item")}
            value={bind}
            variant="standard"
            onChange={(event) => setBind(event.target.value.trim())}
            autoFocus={true}
          />
          <TextField
            fullWidth
            label={trans("Read the value of `${name}` from store", {
              name: bind || "_",
            })}
            variant="standard"
            value={value}
            InputProps={{ readOnly: true }}
            onClick={onSubmit}
          />
          <LinearProgress
            style={{ visibility: quering ? "visible" : "hidden" }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{trans("CANCEL")}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
