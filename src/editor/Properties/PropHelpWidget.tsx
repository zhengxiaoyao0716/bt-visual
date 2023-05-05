import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import IconButton from "@mui/material/IconButton";
import { styled } from "@mui/material/styles";

import { useWindowSize } from "../../components/WindowSize";
import Config from "../../storage/Config";

const HelpWidget = styled("div")`
  position: fixed;
  overflow: visible;
  &::before {
    content: "";
    position: absolute;
    z-index: 1;
    left: -16px;
    top: 45px;
    border: 8px solid transparent;
    border-right-color: #eee;
  }
  & > embed {
    width: 100%;
    height: 100%;
    border-radius: 4px;
  }
`;

export const usePropHelpWidget = (
  help: string | undefined
): { troggle: JSX.Element | null; widget: JSX.Element | null } => {
  const size = useWindowSize();
  const config = Config.use();
  if (!config?.value || !help) return { troggle: null, widget: null };

  const troggleShow = async () => {
    if (config.saving) return;
    await config.update({
      ...config.value,
      nodePropsHelp: !config.value.nodePropsHelp,
    });
  };
  const troggleButton = (
    <IconButton
      sx={{ position: "absolute", right: 0, top: 0 }}
      onClick={troggleShow}
    >
      <HelpOutlineIcon />
    </IconButton>
  );
  if (!config.value.nodePropsHelp) {
    return { troggle: troggleButton, widget: null };
  }

  const attachWidget = (current: HTMLDivElement | null) => {
    if (current == null) return;
    const rect = current.parentElement?.parentElement?.getBoundingClientRect();
    if (!rect) return;
    current.style.left = `${rect.right + 8}px`;
    current.style.top = `${rect.top - 32}px`;
    const maxWidth = size[0] - rect.right - 30;
    const maxHeight = size[1] - rect.top - 30;
    current.style.width = `${maxWidth}px`;
    current.style.height = `${maxHeight}px`;
  };

  return {
    troggle: troggleButton,
    widget: (
      <HelpWidget ref={attachWidget}>
        <embed src={help} />
      </HelpWidget>
    ),
  };
};
