import { useMemo, useState } from "react";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";

import { Props, useDialogPage } from "../components/DialogPage";
import { useLocale, useTrans } from "../storage/Locale";
import { useMoveableList } from "../components/MoveableList";
import { useDialogPrompt } from "../components/DialogPrompt";

function Content({ hide, snack, appBar }: Props) {
  const locale = useLocale();
  const trans = useTrans();
  const [refresh, setRefresh] = useState(0);

  const saved = locale?.value;
  const items = useMemo(() => {
    if (saved == null) return [];
    return Object.entries(saved).map(([key, value]) => [key, value]);
  }, [locale]);

  const dialogPrompt = useDialogPrompt(async ([text, translated]) =>
    Promise.resolve([text, translated])
  );
  const appendPromitProps = {
    cancel: trans("CANCEL"),
    submit: trans("APPEND"),
    title: trans("Append Item"),
    message: trans("Please input the original text and the translated value"),
    values: [trans("original text"), trans("translated value")],
  };

  const moveableList = useMoveableList(
    items,
    dialogPrompt.prompt.bind(null, appendPromitProps),
    () => setRefresh(1 + refresh),
    ([text, translated], index, showMenu, _anchor) => {
      const newTab = text.startsWith("//") && !translated;
      return [
        newTab,
        <ListItem
          key={`${text}#${index}`}
          button
          sx={{ width: "20em" }}
          onContextMenu={showMenu}
        >
          <TextField
            label={text}
            title={saved?.[text]}
            fullWidth
            multiline
            InputProps={{
              endAdornment:
                saved?.[text] === translated ? null : (
                  <InputAdornment position="end">●</InputAdornment>
                ),
            }}
            defaultValue={translated}
            onChange={(event) => change(index, event.target.value)}
          />
          {/* {anchor} */}
        </ListItem>,
      ] as const;
    }
  );

  if (locale?.saving || saved == null) {
    return (
      <>
        {appBar(null)}
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <CircularProgress />
        </Box>
      </>
    );
  }
  const save = async () => {
    if (locale?.value == null || locale.saving) return;
    const savedItems = Object.entries(saved);
    const clean =
      savedItems &&
      savedItems.length === items.length &&
      savedItems.every(
        ([key, value], index) =>
          items[index][0] === key && items[index][1] === value
      );
    if (clean) {
      await snack(trans("No modifications"));
      return;
    }
    const dirty = Object.fromEntries(items);
    await locale.update(dirty);
    hide();
  };
  const change = (index: number, value: string) => {
    const item = items[index];
    if (item[1] === value) return;
    item[1] = value;
    setRefresh(1 + refresh);
  };

  const listTabs = moveableList.listItems.reduce((tabs, [newTab, item]) => {
    if (newTab) tabs.push([]);
    if (tabs.length <= 0) tabs.push([]);
    const tab = tabs[tabs.length - 1];
    tab.push(item);
    return tabs;
  }, [] as JSX.Element[][]);
  return (
    <Box>
      {appBar(
        <>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            {trans("TranslatorPage")}
          </Typography>
          <Button autoFocus color="inherit" onClick={save}>
            {trans("SAVE")}
          </Button>
        </>
      )}
      <Box>
        {listTabs.map((tab, index) => (
          <List
            key={index}
            sx={{
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            {tab}
          </List>
        ))}
      </Box>
      {dialogPrompt.dialog}
      {moveableList.itemMenu}
    </Box>
  );
}

export function useTranslator() {
  return useDialogPage(Content);
}
