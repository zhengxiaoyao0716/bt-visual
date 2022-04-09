import {
  createContext,
  MouseEvent,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import { useDragMoving } from "../components/DragMoving";
import Config from "../storage/Config";
import { TransFunction, useTrans } from "../storage/Locale";
import WidthController from "../components/WidthController";
import Typography from "@mui/material/Typography";
import type { Action, Composite, Decorator } from "../behavior-tree/type";
import BTDefine from "../behavior-tree/Define";
import { getNodeType } from "../behavior-tree/utils";

type Option =
  | {
      type: "input";
      key: string; // 因为 TextField 用的 defaultValue，非直接控制，会导致切换面板时缓存了旧面板上的输入，所以需要 key 来辅助检测输入框变化
      label: string;
      value?: string;
      submit?: (value: string) => void;
      multiline?: boolean;
    }
  | {
      type: "subheader";
      value: string;
      adornment?: ReactNode;
    }
  | {
      type: "error";
      reason: string;
    };

export type PropertiesOption = Option;

function RenderOption({
  trans,
  option,
}: {
  trans: TransFunction;
  option: Option;
}) {
  if (option.type === "subheader") {
    return (
      <Stack direction="row">
        {option.adornment}
        <Typography
          color={({ palette }) => palette.text.secondary}
          sx={{ flexGrow: 1, m: 1, textAlign: "right" }}
        >
          {option.value}
        </Typography>
      </Stack>
    );
  }
  if (option.type === "error") {
    return (
      <Typography
        color={({ palette }) => palette.error[palette.mode]}
        sx={{ flexGrow: 1, m: 1, textAlign: "center" }}
      >
        {option.reason}
      </Typography>
    );
  }
  return (
    <TextField
      key={option.key}
      label={option.label}
      fullWidth
      multiline={option.multiline}
      defaultValue={option.value}
      onChange={(event) => option.submit && option.submit(event.target.value)}
    />
  );
}

const PropertiesContext = createContext(
  null as {
    setOptions: (options: Option[] | null) => void;
  } | null
);

export default function Properties({
  options: defaultOptions,
  children,
}: {
  options: Option[];
  children: JSX.Element;
}) {
  const config = Config.use();
  if (config?.value == null) return null; // never
  const trans = useTrans();

  const { properties } = config.value;

  const widthControllerRef = useRef<HTMLDivElement>(null);
  const [wcProps, { left: wcLeft, dragging: wcDragging }, setWCState] =
    useDragMoving((event) => {
      if (event.target !== widthControllerRef.current && !wcDragging)
        return true;
      event.preventDefault();
      event.stopPropagation();
      return false;
    });
  useEffect(() => {
    if (wcDragging || wcLeft === 0) return;
    const width = properties.width - wcLeft;
    config.saving ||
      config.update({
        ...config.value,
        properties: {
          ...properties,
          width:
            width < 60
              ? 0
              : Math.max(properties.minWidth, Math.min(width, 1000)),
        },
      });
    setWCState({ left: 0, top: 0, dragging: false });
  }, [wcDragging]);

  const [options, setOptions] = useState(null as Option[] | null);

  return (
    <Box
      sx={{
        height: "100%",
        overflow: "hidden",
        display: "flex",
        position: "relative",
      }}
      {...wcProps}
    >
      <PropertiesContext.Provider value={{ setOptions }}>
        {children}
      </PropertiesContext.Provider>
      <WidthController
        style={{
          right: `${Math.max(0, properties.width - 10) - wcLeft}px`,
        }}
        ref={widthControllerRef}
      />
      {properties.width <= 0 ? null : (
        <Stack
          sx={{
            width: `${properties.width}px`,
            padding: "0.5em 0.5em 0 1em ",
            flex: "0 0 auto",
            height: "100%",
            overflowY: "scroll",
            "&::-webkit-scrollbar": {
              display: "none",
            },
          }}
        >
          {(options || defaultOptions).map((option, index) => (
            <RenderOption key={index} trans={trans} option={option} />
          ))}
        </Stack>
      )}
    </Box>
  );
}

export function useNodePropsEditor(trans: TransFunction, refresh: () => void) {
  const define = BTDefine.use();
  const context = useContext(PropertiesContext);

  const hide = () => context?.setOptions(null);

  const depsKey = performance.now().toString();
  const show = (node: Composite | Decorator | Action) => {
    if (define?.value == null) return;
    const nodeType = getNodeType(node.type);
    if (nodeType === "Unknown") return; // NEVER

    const type = trans(node.type);
    const options = [
      {
        type: "subheader",
        value: trans("Node Properties"),
        adornment: (
          <IconButton onClick={hide}>
            <ArrowBackIcon />
          </IconButton>
        ),
      },
      {
        type: "input",
        key: depsKey, // 每次切花节点必定刷新
        label: `${trans("Node Name")} - ${type}`,
        value: node.alias || type,
        submit(value: string) {
          node.alias = value;
          refresh();
        },
      },
    ] as Option[];

    const nodes = define.value[nodeType];
    const props = nodes[node.type];
    // TODO 测试用
    if (props == null || true) {
      options.push({
        type: "error",
        reason: trans("Node define not found!"),
      });
    }

    context?.setOptions(options);
  };
  return {
    show,
    onClick(node: Composite | Decorator | Action, event: MouseEvent) {
      event.stopPropagation();
      event.preventDefault();
      show(node);
    },
  };
}
