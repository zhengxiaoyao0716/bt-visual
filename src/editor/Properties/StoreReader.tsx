import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import TextField, { TextFieldProps } from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { ChangeEvent, ReactNode, useContext, useRef, useState } from "react";

import type { Store } from "../../behavior-tree/type";
import { DatasourceView } from "../../common/share";
import Snack from "../../components/Snack";
import { TransFunction } from "../../storage/Locale";
import { DatasourceContext } from "./Datasource";
import { usePropHelpWidget } from "./PropHelpWidget";
import { inputOnKeyDown } from "../../components/Hotkey";

function resolveBooleanValue(value: string): "true" | "false" | null {
  const lower = value.toLowerCase();
  return lower === "true" || lower === "false" ? lower : null;
}

function resolveIdentityValue(value: string): string | undefined {
  if (!value) return undefined;
  return value.match(/^[\/\.]?[a-zA-Z_]?[a-zA-Z_0-9\/\.]*$/) === null
    ? undefined
    : value;
}

function resolveStringValue(
  value: string,
  type?: "string" | "dict" | "list"
): string | null {
  if (!value) return "``";
  switch (value[0]) {
    case "'":
    case '"':
    case "`":
      if (type && type !== "string") return null;
      return value.length === 1
        ? "``"
        : value[value.length - 1] === value[0]
        ? `\`${value.slice(1, -1)}\``
        : null;
    case "{":
      if (type && type !== "dict") return null;
      return value.length === 1
        ? "{}"
        : value[value.length - 1] === "}"
        ? value
        : null;
    case "[":
      if (type && type !== "list") return null;
      return value.length === 1
        ? "[]"
        : value[value.length - 1] === "]"
        ? value
        : null;
    default:
      return null;
  }
}

function getStoreReaderInitText(
  value: Exclude<Store.Reader, Store.Value>
): string {
  if (typeof value.init !== "number") return String(value.init);
  else if (!("zoom" in value)) return String(value.init);
  const { init, zoom } = value;
  const sum = init + zoom;
  return sum > init
    ? `ξ in [${init}, ${sum})`
    : sum < init
    ? `ξ in (${sum}, ${init}]`
    : String(init);
}

export function getStoreReaderText(value: Store.Reader | undefined): string {
  if (value == null) return "";
  switch (typeof value) {
    case "string":
      return value;
    case "number":
      return value.toString();
    case "boolean":
      return value ? "true" : "false";
    default:
      const def = value.bind === "_" ? "" : `${value.bind}: `;
      return `${def}${getStoreReaderInitText(value)}`;
  }
}

function parseJson(input: string) {
  try {
    return JSON.parse(input) != null;
  } catch (_e) {
    return false;
  }
}

function resolveValueByType(
  type: Store.ValueType,
  value: string
): number | string | boolean | null {
  switch (type) {
    case "number": {
      const numberValue = Number(value);
      return Number.isNaN(numberValue) ? null : numberValue;
    }
    case "string": {
      return resolveStringValue(value, "string");
    }
    case "dict": {
      const stringValue = resolveStringValue(value, "dict");
      if (stringValue == null) return null;
      return parseJson(stringValue) ? stringValue : null;
    }
    case "list": {
      const stringValue = resolveStringValue(value, "list");
      if (stringValue == null) return null;
      return parseJson(stringValue) ? stringValue : null;
    }
    case "boolean": {
      const booleanValue = resolveBooleanValue(value);
      return booleanValue == null ? null : booleanValue === "true";
    }
    case "unknown": {
      if (value === "") return null; // 类型未知时不可省略默认值，否则无法推断类型
      return (
        resolveValueByType("string", value) ??
        resolveValueByType("dict", value) ??
        resolveValueByType("list", value) ??
        resolveValueByType("boolean", value) ??
        resolveValueByType("number", value)
      );
    }
  }
}

function getScopeOfBind(
  bind: string,
  storeScopes?: { label: string; value: string }[]
) {
  if (storeScopes == null) return "";
  for (const { value } of storeScopes) {
    if (value === "") continue;
    if (bind.startsWith(value)) return value;
  }
  return "";
}

interface Item {
  desc?: string;
  help?: string;
  optional?: true;
  valueType: Store.ValueType;
}
interface Props {
  trans: TransFunction;
  name: string;
  read(): Store.Reader | undefined;
  save(value: Store.Reader | undefined): void;
  item: Item;
  storeScopes?: { label: string; value: string }[];
  embedded?: true;
}

function PreviewButton({
  embedded,
  item,
  name,
  value,
  error,
  disabled,
  onClick,
}: {
  embedded: boolean | undefined;
  item: Item;
  name: string;
  value: string;
  error?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      fullWidth
      size="small"
      sx={{
        textAlign: "left",
        textTransform: "none",
        padding: embedded ? 0 : "3px",
      }}
      title={item.desc}
      onClick={onClick}
      // onFocus={embedded ? showDialog : undefined}
    >
      <TextField
        fullWidth
        multiline
        label={name}
        value={value}
        error={error}
        disabled={disabled}
        variant="standard"
        sx={{ mb: 1, pointerEvents: "none" }}
        inputProps={{ tabIndex: -1 }}
      />
    </Button>
  );
}

function EditorDialog({
  title,
  subtitle,
  onCancel,
  onSubmit,
  cancelText,
  submitText,
  children,
}: {
  title: ReactNode | string;
  subtitle: string;
  onCancel: () => void;
  onSubmit: () => void;
  cancelText: string;
  submitText: string;
  children: ReactNode;
}) {
  return (
    <Dialog
      open={true}
      sx={{ backdropFilter: "blur(3px)" }}
      onKeyDown={inputOnKeyDown({ onCancel, onSubmit })}
    >
      <DialogTitle sx={{ minWidth: "16em" }} component="div">
        {typeof title === "string" ? <span>{title}</span> : title}
        {subtitle ? (
          <Typography variant="subtitle1">{subtitle}</Typography>
        ) : null}
      </DialogTitle>
      <DialogContent>{children}</DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>{cancelText}</Button>
        <Button onClick={onSubmit}>{submitText}</Button>
      </DialogActions>
    </Dialog>
  );
}

function onValueChange(
  target: HTMLInputElement | HTMLTextAreaElement,
  value: any,
  newValue: string,
  setValue: (value: string) => void,
  identity?: (value: string) => void
) {
  const booleanValue = resolveBooleanValue(newValue);
  if (booleanValue != null) {
    setValue(booleanValue.toLowerCase());
    return;
  }

  const numberValue = Number(newValue);
  if (!Number.isNaN(numberValue)) {
    setValue(newValue.toLowerCase());
    return;
  }

  if (identity) {
    const identityValue = resolveIdentityValue(newValue);
    if (identityValue != null) {
      identity(identityValue);
      return;
    }
  }

  const stringValue = resolveStringValue(newValue);
  if (stringValue == null) {
    setValue(newValue);
    return;
  }
  // 从完整的引号中删除一个引号，这种情况不再自动补回引号
  if (
    (value === "``" || value === "{}" || value === "[]") &&
    newValue === value[0]
  ) {
    setValue(newValue);
    return;
  }
  setValue(stringValue);
  // 自动补全了一个引号，光标移到补全的引号前
  if (newValue.length === 1) {
    target.value = stringValue;
    const index = stringValue.length - 1;
    target.setSelectionRange(index, index);
  }
}

function StoreReader({
  trans,
  name,
  read,
  save,
  item,
  storeScopes,
  embedded,
}: Props) {
  const rawValue = read();
  const text = getStoreReaderText(rawValue);

  const [value, setValue] = useState(
    null as
      | null
      | string
      | { bind: string; init: string; maximum?: string; scope: string }
      | undefined
  );
  const isEmptyValue = value === undefined || value === "";

  const hideDialog = () => setValue(null);
  const showDialog = () => {
    // if (embedded && "blur" in event.target) {
    //   (event.target as HTMLOrSVGElement).blur();
    // }
    if (typeof rawValue === "object") {
      setValue({
        bind: rawValue.bind,
        init: String(rawValue.init),
        maximum:
          typeof rawValue.init === "number" && "zoom" in rawValue
            ? String(rawValue.init + rawValue.zoom)
            : undefined,
        scope: getScopeOfBind(rawValue.bind, storeScopes),
      });
    } else {
      setValue(rawValue === undefined ? undefined : String(rawValue));
    }
  };

  const onStoreBindChange = (
    target: HTMLInputElement | HTMLTextAreaElement,
    newValue: string
  ) => {
    if (!newValue) {
      setValue(undefined);
      return;
    }
    onValueChange(target, value, newValue, setValue, (identityValue) => {
      const oldValue = typeof value === "object" ? value : null;
      const scope = getScopeOfBind(identityValue, storeScopes);
      switch (item.valueType) {
        case "number":
          setValue({ init: "0", ...oldValue, bind: identityValue, scope });
          return;
        case "string":
          setValue({ init: "``", ...oldValue, bind: identityValue, scope });
          return;
        case "dict":
          setValue({ init: "{}", ...oldValue, bind: identityValue, scope });
          return;
        case "list":
          setValue({ init: "[]", ...oldValue, bind: identityValue, scope });
          return;
        case "unknown":
          setValue({ init: "", ...oldValue, bind: identityValue, scope });
          return;
        case "boolean":
          setValue({
            init: "false",
            ...oldValue,
            bind: identityValue,
            scope,
          });
      }
    });
  };
  const onStoreInitChange = (
    target: HTMLInputElement | HTMLTextAreaElement,
    newValue: string
  ) => {
    if (value == null || typeof value !== "object") return;
    if (newValue) {
      onValueChange(target, value, newValue, (init) =>
        setValue({ ...value, init })
      );
    } else {
      setValue({ ...value, init: "" });
    }
  };

  const onStoreUseRandomChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (value == null || typeof value !== "object") return;
    const init = Number(value.init);
    if (Number.isNaN(init)) return;
    const zoom =
      typeof rawValue === "object" && "zoom" in rawValue ? rawValue.zoom : 1;
    setValue({
      ...value,
      maximum: event.target.checked ? String(init + zoom) : undefined,
    });
  };
  const onStoreZoomChange = (
    _target: HTMLInputElement | HTMLTextAreaElement,
    newValue: string
  ) => {
    if (value == null || typeof value !== "object") return;
    if (!value.init) return;
    const init = Number(value.init);
    if (Number.isNaN(init)) return;
    setValue({ ...value, maximum: newValue });
  };

  const onStoreScopeChange = (
    _target: HTMLInputElement | HTMLTextAreaElement,
    newValue: string
  ) => {
    if (value == null || typeof value !== "object") return;
    if (newValue === value.scope) return;
    const bind = `${newValue}${value.bind.slice(value.scope.length)}`;
    setValue({ ...value, bind, scope: newValue });
  };

  const snack = Snack.use();
  const onSubmit = () => {
    if (value === null) return; // never

    if (isEmptyValue) {
      if (!item.optional) {
        snack.show(trans("Invalid input"));
      } else {
        save(undefined);
        hideDialog();
      }
      return;
    }

    if (typeof value === "string") {
      const resolved = resolveValueByType(item.valueType, value);
      if (resolved == null) {
        snack.show(trans("Invalid input"));
      } else {
        save(resolved);
        hideDialog();
      }
      return;
    }

    if (item.valueType === "unknown" && value.init === "") {
      snack.show(trans("Invalid input"));
      return;
    }

    const resolved = resolveValueByType(item.valueType, value.init);
    if (resolved == null) {
      snack.show(trans("Invalid input"));
      return;
    }

    const rawValue: { bind: string; init: Store.Value; zoom?: number } = {
      bind: value.bind,
      init: resolved,
    };
    if (typeof resolved === "number" && value.maximum) {
      const maximum = Number(value.maximum);
      if (Number.isNaN(maximum)) {
        snack.show(trans("Invalid input"));
        return;
      }
      const zoom = maximum - resolved;
      zoom === 0 || (rawValue.zoom = zoom);
    }
    save(rawValue);
    hideDialog();
  };

  const readFromStore = typeof value === "object";

  const helpWidet = usePropHelpWidget(item.help);

  return (
    <>
      <PreviewButton
        embedded={embedded}
        item={item}
        name={name}
        value={text}
        error={
          !item.optional &&
          (rawValue === undefined || rawValue === "" || isEmptyValue)
        }
        onClick={showDialog}
      />
      {
        //  这里必须用严格比较，因为 null 和 undefined 在此处含义是不同的，前者是对话框未开启，后者是值为空
        value === null ? null : (
          <EditorDialog
            title={
              <>
                <span>{trans("Edit Props")}</span>
                {helpWidet.troggle}
              </>
            }
            subtitle={trans(
              `type: \${type}, ${item.optional ? "optional" : "required"}`,
              { type: item.valueType }
            )}
            onCancel={hideDialog}
            onSubmit={onSubmit}
            cancelText={trans("CANCEL")}
            submitText={trans("SUBMIT")}
          >
            <ValueTextField
              fullWidth
              label={trans(
                readFromStore
                  ? "Read the value of `${name}` from store"
                  : "Input the value of `${name}` directly",
                { name }
              )}
              value={
                readFromStore ? value.bind : value === undefined ? "" : value
              }
              error={
                isEmptyValue
                  ? !item.optional
                  : !readFromStore &&
                    resolveValueByType(item.valueType, value) == null
              }
              variant="standard"
              sx={{ mb: 1 }}
              autoFocus
              onChange={onStoreBindChange}
              type={
                // 虽然值类型是数字，但因为这里可能输入的是黑板的 key，所以不能限制为只输入数字
                item.valueType === "number" ? "unknown" : item.valueType
              }
              title={item.desc}
            />
            {readFromStore ? (
              <>
                <ValueTextField
                  fullWidth
                  label={trans(
                    value.maximum == null
                      ? "Default value of store `${name}`"
                      : "Minimum default value of store `${name}`",
                    { name: value.bind }
                  )}
                  value={value.init}
                  error={resolveValueByType(item.valueType, value.init) == null}
                  variant="standard"
                  sx={{ mb: 1 }}
                  onChange={onStoreInitChange}
                  type={item.valueType}
                />
                {!value.init || Number.isNaN(Number(value.init)) ? null : (
                  <>
                    {value.maximum == null ? null : (
                      <ValueTextField
                        fullWidth
                        label={trans(
                          "Maximum default value of store `${name}`",
                          {
                            name: value.bind,
                          }
                        )}
                        value={value.maximum}
                        error={
                          !value.maximum || Number.isNaN(Number(value.maximum))
                        }
                        variant="standard"
                        sx={{ mb: 1 }}
                        onChange={onStoreZoomChange}
                        type={item.valueType}
                      />
                    )}
                    <FormControlLabel
                      control={
                        <Switch
                          checked={value.maximum != null}
                          onChange={onStoreUseRandomChange}
                        />
                      }
                      label={trans("use random default value")}
                    />
                  </>
                )}
                {storeScopes && (
                  <ValueTextField
                    fullWidth
                    label={trans("Scope of store `${name}`", {
                      name: value.bind,
                    })}
                    value={value.scope}
                    variant="standard"
                    sx={{ mb: 1 }}
                    onChange={onStoreScopeChange}
                    type={storeScopes}
                  />
                )}
              </>
            ) : null}
            {helpWidet.widget}
          </EditorDialog>
        )
      }
    </>
  );
}

function ValueTextField({
  type,
  value,
  onChange,
  ...props
}: Omit<TextFieldProps, "type" | "value" | "onChange"> & {
  type:
    | "number"
    | "string"
    | "dict"
    | "list"
    | "boolean"
    | "unknown"
    | { label: string; value: string }[];
  value: string;
  onChange: (
    target: HTMLInputElement | HTMLTextAreaElement,
    value: string
  ) => void;
}) {
  switch (type) {
    case "number":
      return (
        <TextField
          type="number"
          inputProps={{ inputMode: "numeric" }}
          {...props}
          value={value}
          onChange={(event) =>
            onChange(event.target, event.target.value.trim())
          }
        />
      );
    case "string":
    case "dict":
    case "list":
    case "unknown":
      return (
        <TextField
          {...props}
          value={value}
          onChange={(event) =>
            onChange(event.target, event.target.value.trim())
          }
        />
      );
    default: {
      const options =
        type === "boolean"
          ? [
              { label: "true", value: "true" },
              { label: "false", value: "false" },
            ]
          : type;
      const dict = Object.fromEntries(
        options.map(({ label, value }) => [label, value])
      );
      const ref = useRef(null as HTMLInputElement | null);
      return (
        <Autocomplete
          options={options}
          freeSolo
          inputValue={value}
          onInputChange={(_event, value) => {
            if (ref.current == null) return;
            const target = ref.current.querySelector("input");
            if (target == null) return;
            const newValue = value.trim();
            onChange(target, newValue in dict ? dict[newValue] : newValue);
          }}
          isOptionEqualToValue={(option, value) => option.value === value.value}
          renderInput={(params) => (
            <TextField ref={ref} {...params} {...props} />
          )}
        />
      );
    }
  }
}

function guessValueType(value: Store.Reader | undefined): Store.ValueType {
  switch (typeof value) {
    case "string": {
      switch (value[0]) {
        case "`":
          return "string";
        case "{":
          return "dict";
        case "[":
          return "list";
        default:
          return "unknown";
      }
    }
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "object":
      return guessValueType(value.init);
    default:
      return "unknown";
  }
}

function DatasourceReader({
  datasource,
  name,
  read,
  trans,
  embedded,
  item,
}: Props & { datasource: DatasourceView }) {
  const snack = Snack.use();
  const readed = read();
  const valueType =
    item.valueType === "unknown" ? guessValueType(readed) : item.valueType;
  const external =
    typeof readed === "object" &&
    readed.bind !== "_" &&
    datasource.exist(name, readed.bind, valueType);

  const [value, setValue] = useState(null as string | null);
  const onChange = (
    target: HTMLInputElement | HTMLTextAreaElement,
    newValue: string
  ) => {
    if (newValue) onValueChange(target, value, newValue, setValue);
    else setValue("");
  };
  const onSubmit = () => {
    if (value === null || !external) return; // never
    if (!value) {
      datasource.save(name, readed.bind, valueType, undefined);
      setValue(null);
      return;
    }
    const resolved = resolveValueByType(valueType, value);
    if (resolved == null) {
      snack.show(trans("Invalid input"));
    } else {
      datasource.save(name, readed.bind, valueType, resolved);
      setValue(null);
    }
  };
  return (
    <>
      <PreviewButton
        embedded={embedded}
        item={item}
        name={external ? `${name} : ${readed.bind}` : name}
        value={
          external
            ? String(
                datasource.read(name, readed.bind, valueType) ?? readed.init
              )
            : getStoreReaderText(readed)
        }
        disabled={!external}
        onClick={() => {
          if (external) {
            setValue(
              String(datasource.read(name, readed.bind, valueType) ?? "")
            );
          } else {
            snack.show(
              trans("Data outside the datasource is forbidden to be modified")
            );
          }
        }}
      />
      {!external || value == null ? null : (
        <EditorDialog
          title={trans("Edit datasource")}
          subtitle={trans(
            `type: \${type}, ${item.optional ? "optional" : "required"}`,
            { type: valueType }
          )}
          onCancel={() => setValue(null)}
          onSubmit={onSubmit}
          cancelText={trans("CANCEL")}
          submitText={trans("SUBMIT")}
        >
          <ValueTextField
            fullWidth
            label={trans("Modify `${bind}` of the datasource", {
              bind: readed.bind,
            })}
            value={value}
            placeholder={`init: ${String(readed.init)}`}
            error={value !== "" && resolveValueByType(valueType, value) == null}
            variant="standard"
            sx={{ mb: 1 }}
            autoFocus
            onChange={onChange}
            type={valueType}
            title={item.desc}
          />
        </EditorDialog>
      )}
    </>
  );
}

export default function StoreReaderWithDatasource(props: Props) {
  const datasource = useContext(DatasourceContext);
  return datasource == null ? (
    <StoreReader {...props} />
  ) : (
    <DatasourceReader datasource={datasource} {...props} />
  );
}
