import { useAutoAnimate } from "@formkit/auto-animate/react";
import Box from "@mui/material/Box";
import ListItemButton from "@mui/material/ListItemButton";

import type { Store } from "../../behavior-tree/type";
import { useDialogPrompt } from "../../components/DialogPrompt";
import { useMoveableList } from "../../components/MoveableList";
import { useRefresh } from "../../components/Refresh";
import Snack from "../../components/Snack";
import { TransFunction } from "../../storage/Locale";
import StoreReader from "./StoreReader";

interface Props {
  trans: TransFunction;
  scope: string;
  read(): undefined | { [key: string]: Store.Reader | undefined };
  save(preset: undefined | { [key: string]: Store.Reader | undefined }): void;
  storeScopes: { label: string; value: string }[];
}

export default function StorePreset({
  trans,
  scope,
  read,
  save,
  storeScopes,
}: Props) {
  const storeItems = Object.entries(read() || {});
  const [, refresh] = useRefresh();

  const snack = Snack.use();
  const { dialog, prompt } = useDialogPrompt();

  const appendStorePrompt = prompt.bind(null, {
    async onSubmit([name]: string[]) {
      if (!name) {
        snack.show(trans("Invalid input"));
        return null;
      }
      const presets = read();
      const storeKey = `${scope}${name}`;
      if (presets && storeKey in presets) {
        snack.show(trans("Duplicate store key"));
        return null;
      }
      // 虽然是 undefined，但也必须 put 进去，不然再次添加相同 key 时去重判定会有问题
      if (presets == null) save({ [storeKey]: undefined });
      else presets[storeKey] = undefined;
      return [storeKey, undefined];
    },
    cancel: trans("CANCEL"),
    submit: trans("APPEND"),
    title: trans("Append Item"),
    message: trans("Please the key of the store item"),
    values: [""],
  }) as () => Promise<[string, Store.Value] | null>;

  const change = (index: number, value: Store.Reader) => {
    const item = storeItems[index];
    if (item[1] === value) return;
    item[1] = value;
    const presets = read();
    if (presets == null) {
      save({ [item[0]]: value });
    } else {
      presets[item[0]] = value;
    }
    refresh();
  };

  const moveableList = useMoveableList(
    storeItems,
    appendStorePrompt,
    () => {
      // 删除、调整顺序等操作，直接替换整个 presets
      save(storeItems.length <= 0 ? undefined : Object.fromEntries(storeItems));
      refresh();
    },
    ([name, value], index, showMenu, anchor) => (
      <ListItemButton
        key={name}
        onContextMenu={showMenu}
        sx={{
          "&>*:first-of-type": {
            flexGrow: 1,
          },
          padding: 0,
        }}
      >
        <StoreReader
          trans={trans}
          name={name}
          read={() => value}
          save={(value) => change(index, value || "")}
          item={{ valueType: "unknown" }}
          storeScopes={storeScopes}
        />
        {anchor(index)}
      </ListItemButton>
    )
  );

  const [animateRef] = useAutoAnimate();

  return (
    <Box ref={animateRef}>
      {moveableList.listItems.length <= 0
        ? moveableList.appender
        : moveableList.listItems}
      {moveableList.itemMenu}
      {dialog}
    </Box>
  );
}
