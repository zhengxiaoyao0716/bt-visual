import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  ComponentType,
  createContext,
  ReactElement,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import BTDefine, { Item } from "../behavior-tree/Define";
import type { Action, Composite, Decorator, Node } from "../behavior-tree/type";
import { getNodeType } from "../behavior-tree/utils";
import { useDragMoving } from "../components/DragMoving";
import WidthController from "../components/WidthController";
import Config from "../storage/Config";
import { TransFunction, useTrans } from "../storage/Locale";

type Option =
  | { type: "component"; Component: ComponentType }
  | { type: "element"; element: ReactElement }
  | {
      type: "input";
      key: string; // 因为 TextField 用的 defaultValue，非直接控制，会导致切换面板时缓存了旧面板上的输入，所以需要 key 来辅助检测输入框变化
      label: string;
      value?: string;
      submit?: (value: string) => void;
      multiline?: boolean;
      disabled?: boolean;
      desc?: string;
    }
  | {
      type: "select";
      key: string;
      label: string;
      value?: string | number;
      items: [string | number, string][];
      submit?: (value: string | number) => void;
    }
  | {
      type: "subheader";
      value: string;
      align: "left" | "center" | "right";
      adornment?: ReactNode;
    }
  | {
      type: "error";
      reason: string;
    }
  | { type: "divider" };

export type PropertiesOption = Option;

function RenderOption({
  trans,
  option,
}: {
  trans: TransFunction;
  option: Option;
}): JSX.Element {
  switch (option.type) {
    case "component": {
      return <option.Component />;
    }
    case "element": {
      return option.element;
    }
    case "input": {
      return (
        <TextField
          key={`${option.key}#${option.value}`}
          label={option.label}
          fullWidth
          multiline={option.multiline}
          defaultValue={option.value}
          onChange={(event) =>
            option.submit && option.submit(event.target.value.trim())
          }
          disabled={option.disabled}
          sx={{ marginBottom: 2 }}
          title={option.desc}
        />
      );
    }
    case "select": {
      return (
        <FormControl
          fullWidth
          key={`${option.key}#${option.value}`}
          sx={{ marginBottom: 2 }}
        >
          <InputLabel>Age</InputLabel>
          <Select
            label={option.label}
            defaultValue={option.value}
            onChange={(event) =>
              option.submit && option.submit(event.target.value)
            }
          >
            {option.items.map(([value, text], index) => (
              <MenuItem key={index} value={value}>
                {text}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }
    case "subheader": {
      return (
        <Stack direction="row">
          {option.adornment}
          <Typography
            color={({ palette }) => palette.text.secondary}
            sx={{ flexGrow: 1, m: 1, textAlign: option.align || "left" }}
          >
            {option.value}
          </Typography>
        </Stack>
      );
    }
    case "error": {
      return (
        <Typography
          color={({ palette }) => palette.error[palette.mode]}
          sx={{ flexGrow: 1, m: 1, textAlign: "center" }}
        >
          {option.reason}
        </Typography>
      );
    }
    case "divider": {
      return <Divider />;
    }
  }
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

  const troggleWidth = () => {
    const width = properties.width < 60 ? properties.minWidth * 2 : 0;
    config.saving ||
      config.update({ ...config.value, properties: { ...properties, width } });
  };

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
      <PropertiesContext.Provider
        value={{
          setOptions(options) {
            setOptions(options);
            properties.width < 60 && troggleWidth();
          },
        }}
      >
        {children}
      </PropertiesContext.Provider>
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
      <WidthController
        style={{
          right: `${Math.max(0, properties.width - 10) - wcLeft}px`,
        }}
        ref={widthControllerRef}
        onDoubleClick={troggleWidth}
      />
    </Box>
  );
}

export function useHistoryEditor(
  trans: TransFunction,
  components: ComponentType[]
) {
  const context = useContext(PropertiesContext);
  const hide = () => context?.setOptions(null);

  const show = () => {
    const options: Option[] = [
      {
        type: "subheader",
        value: trans("History"),
        align: "right",
        adornment: (
          <IconButton onClick={hide}>
            <ArrowBackIcon />
          </IconButton>
        ),
      },
      ...components.map(
        (Component) => ({ type: "component", Component } as Option)
      ),
    ];
    context?.setOptions(options);
  };
  return { hide, show };
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

    const nodes = define.value[nodeType];

    const options: Option[] = [
      {
        type: "subheader",
        value: trans("Node Properties"),
        align: "right",
        adornment: (
          <IconButton onClick={hide}>
            <ArrowBackIcon />
          </IconButton>
        ),
      },
      {
        type: "select",
        key: depsKey, // 每次切换节点必定刷新
        label: trans("Node Type"),
        value: node.type,
        items: Object.keys(nodes).map((type) => [type, trans(type)]),
        submit(value) {
          delete node.alias;
          node.type = value as string;
          refresh();
          show(node); // 节点类型变了，需要重新刷新面板
        },
      },
      {
        type: "input",
        key: depsKey, // 每次切换节点必定刷新
        label: trans("Node Alias"),
        value: node.alias || "",
        submit(value: string) {
          if (value === node.alias) return;
          const type = trans(node.type);
          if (!value) delete node.alias;
          else if (value === type || value === node.type) delete node.alias;
          else node.alias = value;
          refresh();
        },
      },
    ];

    const { props } = nodes[node.type];
    props == null &&
      options.push({
        type: "error",
        reason: trans("Node define not found!"),
      });

    const propNames = props == null ? [] : Object.keys(props);
    if (props != null && propNames.length > 0) {
      options.push({ type: "divider" });
      options.push({
        type: "subheader",
        value: `- ${trans("Props List")} -`,
        align: "center",
      });
      for (const name of propNames) {
        const item = props[name];
        options.push(nodeItemOption(trans, depsKey, node, name, item));
      }
    }

    context?.setOptions([
      ...options,
      ...unknownPropsOptions(trans, depsKey, node, propNames),
    ]);
  };

  return { show, hide };
}

enum ignoredNodeProps {
  type,
  nodes,
  node,
  fold,
}

export function nodeItemOption(
  trans: TransFunction,
  key: string,
  node: any,
  name: string,
  item: Item
): Option {
  const value = node[name];
  const desc = item.desc || name;
  const submit = (value: string) => {
    node[name] = value;
    console.log(node, value);
  };
  // TODO 根据类型定义不同的输入方式
  switch (item.type) {
    // TODO 根据类型定义不同的输入方式
    case "Store.Key": {
    }
    case "Store.Reader": {
    }
    case "dict": {
      return {
        type: "input",
        key: `${key}.${name}`,
        label: name,
        value,
        desc,
        submit,
      };
    }
  }
}

function unknownPropsOptions(
  trans: TransFunction,
  key: string,
  node: Node,
  propNames: string[]
): Option[] {
  const unknownProps: Option[] = Object.entries(node)
    .filter(
      ([name]) =>
        !(name in ignoredNodeProps) && propNames.every((pn) => pn !== name)
    )
    .map(([name, value]) => ({
      type: "element",
      element: (
        <TextField
          key={`${key}.${name}`}
          label={name}
          fullWidth
          value={value}
          disabled
          size="small"
        />
      ),
    }));
  if (unknownProps.length === 0) return [];
  const unknownHeader: Option = {
    type: "subheader",
    value: trans("Unknown props:"),
    align: "left",
  };
  return [{ type: "divider" }, unknownHeader, ...unknownProps];
}
