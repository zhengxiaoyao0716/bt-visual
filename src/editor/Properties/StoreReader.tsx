import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import TextField, { TextFieldProps } from "@mui/material/TextField";
import { ChangeEvent, useRef, useState } from "react";

import type { Store } from "../../behavior-tree/type";
import Snack from "../../components/Snack";
import { TransFunction } from "../../storage/Locale";

function resolveBooleanValue(value: string): "true" | "false" | undefined {
  const lower = value.toLowerCase();
  return lower === "true" || lower === "false" ? lower : undefined;
}

function resolveIdentityValue(value: string): string | undefined {
  if (!value) return undefined;
  return value.match(/^[\/\.]?[a-zA-Z_]?[a-zA-Z_0-9\/\.]*$/) === null
    ? undefined
    : value;
}

function resolveStringValue(value: string): string | undefined {
  if (!value) return "";
  switch (value[0]) {
    case "'":
    case '"':
    case "`":
      return value.length === 1
        ? "``"
        : value[0] === value[value.length - 1]
        ? `\`${value.slice(1, -1)}\``
        : undefined;
    default:
      return undefined;
  }
}

export function getStoreReaderText(value: Store.Reader | undefined): string {
  if (value == null) return "";
  if (typeof value === "string") return `\`${value}\``;
  else if (typeof value === "number") return value.toString();
  else if (typeof value === "boolean") return value ? "true" : "false";

  if (value.type === "unknown") return value.bind;

  const def = value.bind === "_" ? "" : `${value.bind}: `;
  if (value.type === "string") {
    return `${def}\`${value.init}\``;
  } else if (value.type === "number" && "zoom" in value) {
    const { bind, init, zoom } = value as Store.Reader.Random;
    const sum = init + zoom;
    return sum > init
      ? `${def}ξ in [${init}, ${sum})`
      : sum < init
      ? `${def}ξ in (${sum}, ${init}]`
      : `${def}${init}`;
  } else {
    return `${def}${value.init}`;
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
      const stringValue = resolveStringValue(value);
      return stringValue == null ? null : stringValue.slice(1, -1);
    }
    case "boolean": {
      const booleanValue = resolveBooleanValue(value);
      return booleanValue == null ? null : booleanValue === "true";
    }
    case "unknown": {
      return (
        resolveValueByType("string", value) ??
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

interface Props {
  trans: TransFunction;
  name: string;
  read(): Store.Reader | undefined;
  save(value: Store.Reader | undefined): void;
  item: {
    desc?: string;
    optional?: true;
    valueType: Store.ValueType;
  };
  storeScopes?: { label: string; value: string }[];
}

export default function StoreReader({
  trans,
  name,
  read,
  save,
  item,
  storeScopes,
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
  const hideDialog = () => setValue(null);
  const showDialog = () => {
    if (typeof rawValue === "object") {
      setValue({
        bind: rawValue.bind,
        init:
          rawValue.type === "unknown"
            ? ""
            : typeof rawValue.init === "string"
            ? `\`${rawValue.init}\``
            : String(rawValue.init),
        maximum:
          rawValue.type === "number" && "zoom" in rawValue
            ? String(
                (rawValue as Store.Reader.Random).init +
                  (rawValue as Store.Reader.Random).zoom
              )
            : undefined,
        scope: getScopeOfBind(rawValue.bind, storeScopes),
      });
    } else {
      setValue(
        rawValue === undefined
          ? undefined
          : typeof rawValue === "string"
          ? `\`${rawValue}\``
          : String(rawValue)
      );
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

    const booleanValue = resolveBooleanValue(newValue);
    if (booleanValue != null) {
      setValue(newValue.toLowerCase());
      return;
    }

    const numberValue = Number(newValue);
    if (!Number.isNaN(numberValue)) {
      setValue(newValue.toLowerCase());
      return;
    }

    const identityValue = resolveIdentityValue(newValue);
    if (identityValue != null) {
      const oldValue = typeof value === "object" ? value : null;
      const scope = getScopeOfBind(identityValue, storeScopes);
      switch (item.valueType) {
        case "number":
          setValue({ init: "0", ...oldValue, bind: identityValue, scope });
          return;
        case "string":
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
          return;
      }
    }

    const stringValue = resolveStringValue(newValue);
    if (stringValue == null) {
      setValue(newValue);
      return;
    }
    // 从完整的引号中删除一个引号，这种情况不再自动补回引号
    if (value === "``" && newValue === value[0]) {
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
  };
  const onStoreInitChange = (
    target: HTMLInputElement | HTMLTextAreaElement,
    newValue: string
  ) => {
    if (value == null || typeof value !== "object") return;

    if (!newValue) {
      setValue({ ...value, init: "" });
      return;
    }

    const booleanValue = resolveBooleanValue(newValue);
    if (booleanValue != null) {
      setValue({ ...value, init: newValue.toLowerCase() });
      return;
    }

    const numberValue = Number(newValue);
    if (!Number.isNaN(numberValue)) {
      setValue({ ...value, init: newValue.toLowerCase() });
      return;
    }

    const stringValue = resolveStringValue(newValue);
    if (stringValue == null) {
      setValue({ ...value, init: newValue });
      return;
    }
    // 从完整的引号中删除一个引号，这种情况不再自动补回引号
    if (value.init === "``" && newValue === value.init[0]) {
      setValue({ ...value, init: newValue });
      return;
    }
    setValue({ ...value, init: stringValue });
    // 自动补全了一个引号，光标移到补全的引号前
    if (newValue.length === 1) {
      target.value = stringValue;
      const index = stringValue.length - 1;
      target.setSelectionRange(index, index);
    }
  };
  const onStoreUseRandomChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (value == null || typeof value !== "object") return;
    const init = Number(value.init);
    if (Number.isNaN(init)) return;
    const zoom =
      typeof rawValue === "object" && "zoom" in rawValue
        ? (rawValue as Store.Reader.Random).zoom
        : 1;
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

    if (
      value === undefined ||
      value === "" ||
      value === "`" ||
      value === "``"
    ) {
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
      if (value.bind === "_") {
        snack.show(trans("Invalid input"));
      } else {
        save({ bind: value.bind, type: "unknown" });
        hideDialog();
      }
      return;
    }

    const resolved = resolveValueByType(item.valueType, value.init);
    if (resolved == null) {
      snack.show(trans("Invalid input"));
      return;
    }

    const rawValue: Store.Reader = {
      bind: value.bind,
      init: resolved,
      type: typeof resolved as "number" | "string" | "boolean",
    };
    if (rawValue.type === "number" && value.maximum) {
      const maximum = Number(value.maximum);
      if (Number.isNaN(maximum)) {
        snack.show(trans("Invalid input"));
        return;
      }
      const zoom = maximum - (resolved as number);
      zoom == 0 || ((rawValue as Store.Reader.Random).zoom = zoom);
    }
    save(rawValue);
    hideDialog();
  };

  return (
    <>
      <Button
        fullWidth
        size="small"
        sx={{ textAlign: "left", textTransform: "none" }}
        onClick={showDialog}
        title={item.desc || `${name} : ${item.valueType}`}
      >
        <TextField
          fullWidth
          multiline
          label={name}
          value={text}
          error={
            !item.optional &&
            (rawValue === undefined ||
              rawValue === "" ||
              value === "`" ||
              value === "``")
          }
          variant="standard"
          sx={{ mb: 1, pointerEvents: "none" }}
        />
      </Button>
      {
        //  这里必须用严格比较，因为 null 和 undefined 在此处含义是不同的，前者是对话框未开启，后者是值为空
        value === null ? null : (
          <Dialog open={true}>
            <DialogTitle sx={{ minWidth: "16em" }}>
              {trans("Edit Store Value")}
            </DialogTitle>
            <DialogContent>
              <ValueTextField
                fullWidth
                label={trans("Please input the value of ${name}", { name })}
                value={
                  typeof value === "object"
                    ? value.bind
                    : value === undefined
                    ? ""
                    : value
                }
                error={
                  value === undefined || value === "`" || value === "``"
                    ? !item.optional
                    : typeof value === "string"
                    ? resolveValueByType(item.valueType, value) == null
                    : false
                }
                variant="standard"
                sx={{ mb: 1 }}
                autoFocus
                onChange={onStoreBindChange}
                type={
                  // 虽然值类型是数字，但因为这里可能输入的是黑板的 key，所以不能限制为只输入数字
                  item.valueType === "number" ? "unknown" : item.valueType
                }
              />
              {typeof value === "object" ? (
                <>
                  <ValueTextField
                    fullWidth
                    label={trans(
                      value.maximum == null
                        ? "Default value of store ${name}"
                        : "Minimum default value of store ${name}",
                      { name: value.bind }
                    )}
                    value={value.init}
                    error={
                      resolveValueByType(item.valueType, value.init) == null
                    }
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
                            "Maximum default value of store ${name}",
                            { name: value.bind }
                          )}
                          value={value.maximum}
                          error={
                            !value.maximum ||
                            Number.isNaN(Number(value.maximum))
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
                      label={trans("Scope of store ${name}", {
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
            </DialogContent>
            <DialogActions>
              <Button onClick={hideDialog}>{trans("CANCEL")}</Button>
              <Button onClick={onSubmit}>{trans("SUBMIT")}</Button>
            </DialogActions>
          </Dialog>
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
    | "boolean"
    | "unknown"
    | { label: string; value: string }[];
  value: string;
  onChange: (
    target: HTMLInputElement | HTMLTextAreaElement,
    value: string
  ) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
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
      return (
        <Autocomplete
          options={options}
          freeSolo
          inputValue={value}
          onInputChange={(_event, value) => {
            const element = ref.current;
            if (element == null) return;
            const newValue = value.trim();
            onChange(element, newValue in dict ? dict[newValue] : newValue);
          }}
          isOptionEqualToValue={(option, value) => option.value === value.value}
          renderInput={(params) => (
            <TextField {...params} {...props} ref={ref} />
          )}
        />
      );
    }
  }
}
