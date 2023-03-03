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
  DragEvent,
  useMemo,
} from "react";

import BTDefine, { Item } from "../../behavior-tree/Define";
import type {
  Action,
  Composite,
  Decorator,
  Tree,
} from "../../behavior-tree/type";
import { getNodeType } from "../../behavior-tree/utils";
import { useDragMoving } from "../../components/DragMoving";
import WidthController from "../../components/WidthController";
import DebugService from "../../service/DebugService";
import Config from "../../storage/Config";
import { TransFunction, useTrans } from "../../storage/Locale";
import { createTypeDropProps } from "../NodeDrop";
import { LockerContext } from "../NodeRender/NodeLocker";
import Statements from "./Statements";
import StorePreset from "./StorePreset";
import StoreReader from "./StoreReader";
import UnkownProps from "./UnkownProps";

type Option =
  | { type: "component"; Component: ComponentType<any>; props: any }
  | { type: "element"; element: ReactElement }
  | {
      type: "input";
      key: string; // 因为 TextField 用的 defaultValue，非直接控制，会导致切换面板时缓存了旧面板上的输入，所以需要 key 来辅助检测输入框变化
      label: string;
      value?: string;
      submit?: (value: string) => void;
      multiline?: boolean;
      rows?: number;
      maxRows?: number;
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
      onDragEnter?: (event: DragEvent) => void;
      onDragOver?: (event: DragEvent) => void;
      onDrop?: (event: DragEvent) => void;
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

export function createComponentOption<P>(
  Component: ComponentType<P>,
  props: P
): Option {
  return { type: "component", Component, props };
}

function RenderOption({
  trans,
  option,
}: {
  trans: TransFunction;
  option: Option;
}): JSX.Element {
  switch (option.type) {
    case "component": {
      return <option.Component {...option.props} />;
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
          rows={option.rows}
          maxRows={option.maxRows}
          defaultValue={option.value}
          onChange={(event) =>
            option.submit && option.submit(event.target.value.trim())
          }
          disabled={option.disabled}
          sx={{ mb: 2 }}
          title={option.desc}
        />
      );
    }
    case "select": {
      return (
        <FormControl
          fullWidth
          key={`${option.key}#${option.value}`}
          sx={{ mb: 2 }}
        >
          <InputLabel>{option.label}</InputLabel>
          <Select
            label={option.label}
            defaultValue={option.value}
            onChange={(event) =>
              option.submit && option.submit(event.target.value)
            }
            onDragEnter={option.onDragEnter}
            onDragOver={option.onDragOver}
            onDrop={option.onDrop}
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

export const PropertiesContext = createContext(
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
  const [wcProps, { moveX: wcLeft, dragging: wcDragging }, setWCState] =
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
    setWCState({ moveX: 0, moveY: 0, dragging: false });
  }, [wcDragging]);

  const troggleWidth = () => {
    const width = properties.width < 60 ? properties.minWidth * 2 : 0;
    config.saving ||
      config.update({ ...config.value, properties: { ...properties, width } });
  };

  const [options, setOptions] = useState(null as Option[] | null);
  const context = useMemo(
    () => ({
      setOptions(options: Option[] | null) {
        setOptions(options);
        properties.width < 60 && troggleWidth();
      },
    }),
    [properties]
  );

  const locked = useContext(LockerContext);

  return (
    <Box
      sx={{
        height: "100%",
        overflow: "hidden",
        display: "flex",
        position: "relative",
        pointerEvents: locked ? "none" : "auto",
      }}
      {...wcProps}
    >
      <PropertiesContext.Provider value={context}>
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
  const debugService = DebugService.use();

  const hide = () => context?.setOptions(null);

  const depsKey = performance.now().toString();
  const show = (node: Composite | Decorator | Action | Tree) => {
    console.log("debugService", debugService); // TODO
    if (context == null) return;

    if ("root" in node) {
      context.setOptions(null);
      return;
    }

    if (define?.value == null) return;
    const nodeType = getNodeType(node.type);
    if (nodeType === "Unknown") return;

    const submitNodeType = (value: string | number) => {
      delete node.alias;
      node.type = value as string;
      refresh();
      show(node); // 节点类型变了，需要重新刷新面板
    };
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
        label: trans("Node Type"), // TODO
        value: node.type,
        items: Object.keys(nodes).map((type) => [type, trans(type)]),
        submit: submitNodeType,
        ...createTypeDropProps(nodeType, submitNodeType),
      },
      {
        type: "input",
        key: depsKey, // 每次切换节点必定刷新
        label: trans("Node Alias"),
        value: node.alias || "",
        multiline: true,
        maxRows: 3,
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

    node.type in nodes ||
      options.push({
        type: "error",
        reason: trans("Node define not found!"),
      });

    const { props = {} } = nodes[node.type] || {};
    const propNames = Object.keys(props);
    if (propNames.length > 0) {
      options.push({ type: "divider" });
      options.push({
        type: "subheader",
        value: `- ${trans("Props List")} -`,
        align: "center",
      });
      for (const name of propNames) {
        const item = props[name];
        options.push(
          nodeItemOption(
            trans,
            depsKey,
            node,
            name,
            item,
            define.value.storeScopes
          )
        );
      }
    }

    context.setOptions([
      ...options,
      ...unknownPropsOptions(trans, node, propNames),
    ]);
  };

  return { show, hide };
}

enum ignoredNodeProps {
  type,
  deck,
  nodes,
  node,
  fold,
  alias,
}

export function nodeItemOption(
  trans: TransFunction,
  _key: string,
  node: any,
  name: string,
  item: Item,
  storeScopes: { label: string; value: string }[]
): Option {
  const read = () => node[name];
  const save = (value: any) => {
    if (value == null) {
      name in node && delete node[name];
    } else {
      node[name] = value;
    }
  };
  switch (item.type) {
    case "Store.Key": {
      return {
        type: "error",
        reason: "Not support yet!",
      };
    }
    case "Store.Reader": {
      return createComponentOption(StoreReader, {
        trans,
        name,
        read,
        save,
        item,
        storeScopes,
      });
    }
    case "StorePreset": {
      return createComponentOption(StorePreset, {
        trans,
        scope: `${name}.`,
        read,
        save,
      });
    }
    case "statements": {
      return createComponentOption(Statements, {
        trans,
        node,
        name,
        item,
        storeScopes,
      });
    }
  }
}

function unknownPropsOptions(
  trans: TransFunction,
  node: any,
  propNames: string[]
): Option[] {
  const unknownProps = Object.entries(node).filter(
    ([name]) =>
      !(name in ignoredNodeProps) && propNames.every((pn) => pn !== name)
  );
  if (unknownProps.length === 0) return [];
  const unknownHeader: Option = {
    type: "subheader",
    value: trans("Unknown props:"),
    align: "left",
  };
  return [
    { type: "divider" },
    unknownHeader,
    createComponentOption(UnkownProps, { trans, node, unknownProps }),
  ];
}
