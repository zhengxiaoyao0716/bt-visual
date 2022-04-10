import { ReactNode, useEffect } from "react";
import { Tab, Tabs } from "@mui/material";

import { useRefresh } from "./Refresh";

function LabelTab({
  labels,
  index,
  setTab,
  refreshHooks,
}: {
  labels: ReactNode[];
  index: number;
  setTab(index: number): void;
  refreshHooks: { [index: number]: () => void };
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
    />
  );
}

export function useTabs(
  labels: ReactNode[],
  tab: number,
  setTab: (tab: number) => void
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
