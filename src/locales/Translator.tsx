import { useMemo, useState } from "react";
import Button from "@mui/material/Button";
import ListItem from "@mui/material/ListItem";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Grid from "@mui/material/Grid";

import { Props, useDialogPage } from "../components/DialogPage";
import { useLocale, useTrans } from "../storage/Locale";
import { useMoveableList } from "../components/MoveableList";
import { useDialogPrompt } from "../components/DialogPrompt";
import { useWindowSize } from "../components/WindowSize";
import { useRefresh } from "../components/Refresh";
import Snack from "../components/Snack";
import Accordion from "@mui/material/Accordion";
import { AccordionDetails, AccordionSummary } from "@mui/material";

function Content({ hide, appBar }: Props) {
  const locale = useLocale();
  const trans = useTrans();
  const snack = Snack.use();
  const [, refresh] = useRefresh();

  const saved = locale?.value;
  const items = useMemo(() => {
    if (saved == null) return [];
    return Object.entries(saved).map(([key, value]) => [key, value]);
  }, [locale]);

  const dialogPrompt = useDialogPrompt();
  const appendPromitProps = {
    async onSubmit([text, translated]: string[]) {
      return [text, translated];
    },
    cancel: trans("CANCEL"),
    submit: trans("APPEND"),
    title: trans("Append Item"),
    message: trans("Please input the original text and the translated value"),
    values: [trans("original text"), trans("translated value")],
  };
  const prompt = dialogPrompt.prompt.bind(
    null,
    appendPromitProps
  ) as () => Promise<string[] | null>;

  const [width] = useWindowSize();
  const gridXs = Math.min(12 / ((width / 300) | 0), 12);

  const moveableList = useMoveableList(
    items,
    prompt,
    refresh,
    ([text, translated], index, showMenu, _anchor) => {
      const newTab = text.startsWith("//") && !translated;
      const listItem = (
        <ListItem button onContextMenu={showMenu}>
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
        </ListItem>
      );
      return newTab ? (
        listItem
      ) : (
        <Grid item xs={gridXs} key={`${text}#${index}`}>
          {listItem}
        </Grid>
      );
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
    if (locale?.value == null) return;
    const savedItems = Object.entries(saved);
    const clean =
      savedItems &&
      savedItems.length === items.length &&
      savedItems.every(
        ([key, value], index) =>
          items[index][0] === key && items[index][1] === value
      );
    if (clean) {
      await snack.show(trans("No modifications"));
      return;
    }
    if (locale.saving) {
      await snack.show(trans("Saving, try again later"));
    }
    const dirty = Object.fromEntries(items);
    await locale.update(dirty);
    hide();
  };
  const change = (index: number, value: string) => {
    const item = items[index];
    if (item[1] === value) return;
    item[1] = value;
    refresh();
  };

  const listTabs = moveableList.listItems.reduce((tabs, item) => {
    if (!("item" in item.props)) tabs.push([]);
    if (tabs.length <= 0) tabs.push([]);
    const tab = tabs[tabs.length - 1];
    tab.push(item);
    return tabs;
  }, [] as JSX.Element[][]);
  return (
    <Box style={{ overflowY: "hidden" }}>
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
      <Box style={{ overflowY: "auto", maxHeight: "100%" }}>
        {listTabs.length <= 0
          ? moveableList.appender
          : listTabs.map((tab, index) => (
              <Accordion key={index} TransitionProps={{ unmountOnExit: true }}>
                <AccordionSummary>{tab[0]}</AccordionSummary>
                <AccordionDetails>
                  <Grid container>{tab.slice(1)}</Grid>
                </AccordionDetails>
              </Accordion>
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
