import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Grid from "@mui/material/Grid";
import InputAdornment from "@mui/material/InputAdornment";
import ListItemButton from "@mui/material/ListItemButton";
import TextField from "@mui/material/TextField";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useRef } from "react";

import { Props, useDialogPage } from "../components/DialogPage";
import { useDialogPrompt } from "../components/DialogPrompt";
import { addHotkeyListener } from "../components/Hotkey";
import { useMoveableList } from "../components/MoveableList";
import { useRefresh } from "../components/Refresh";
import Snack from "../components/Snack";
import { useWindowSize } from "../components/WindowSize";
import { useLocale, useTrans } from "../storage/Locale";

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
        <ListItemButton onContextMenu={showMenu}>
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
        </ListItemButton>
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

  const save = async () => {
    if (locale?.value == null || locale.saving || saved == null) return;

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
    await snack.show(trans("Modification has been saved"));
  };
  const ref = useRef(null as HTMLDivElement | null);
  useEffect(() => {
    if (!ref.current) return;
    const removeHotkeyListeners = addHotkeyListener(ref.current, {
      code: "KeyS",
      ctrlKey: true,
      ignore: (_event) => false, // Ctrl+S 事件针对全局生效
      callback: save,
    });
    return () => {
      removeHotkeyListeners();
    };
  }, []);

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
    <Box sx={{ overflowY: "hidden" }} ref={ref}>
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
      <Box sx={{ overflowY: "auto", height: "100%" }}>
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
        <Toolbar variant="dense" />
      </Box>
      {dialogPrompt.dialog}
      {moveableList.itemMenu}
    </Box>
  );
}

export function useTranslator() {
  return useDialogPage(Content);
}
