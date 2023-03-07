import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { MouseEvent, ReactNode, useEffect } from "react";

import { useRefresh } from "./Refresh";

function LabelTab({
  labels,
  index,
  setTab,
  refreshHooks,
  contextMenu,
}: {
  labels: ReactNode[];
  index: number;
  setTab(index: number, event: MouseEvent): void;
  refreshHooks: { [index: number]: () => void };
  contextMenu?: (
    index: number
  ) => ((event: MouseEvent<HTMLElement>) => void) | undefined;
}) {
  const [, refresh] = useRefresh();
  useEffect(() => {
    refreshHooks[index] = refresh;
  }, [refreshHooks, index, refresh]);
  return (
    <Tab
      label={labels[index]}
      value={index}
      onClick={setTab.bind(null, index)}
      onContextMenu={contextMenu && contextMenu(index)}
    />
  );
}

export function useTabs(
  labels: ReactNode[],
  tab: number,
  setTab: (tab: number, event: MouseEvent) => void,
  contextMenu?: (
    index: number
  ) => ((event: MouseEvent<HTMLElement>) => void) | undefined
) {
  const refreshHooks = {} as { [index: number]: () => void };

  const tabs = (
    <Tabs
      value={tab}
      variant="scrollable"
      scrollButtons="auto"
      aria-label="tree-tabs"
    >
      {labels.map((_label, index) => (
        <LabelTab
          key={index}
          labels={labels}
          index={index}
          setTab={setTab}
          refreshHooks={refreshHooks}
          contextMenu={contextMenu}
        />
      ))}
    </Tabs>
  );
  return {
    tab,
    tabs,
    setTab,
    refresh(index: number) {
      refreshHooks[index]?.();
    },
  };
}
