import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { createContext, ReactNode, useMemo, useState } from "react";

import { Store } from "../../behavior-tree/type";
import share, { DatasourceView } from "../../common/share";
import Snack from "../../components/Snack";
import { TransFunction } from "../../storage/Locale";
import { createStorage } from "../../storage/Storage";

function defaultDriver(
  data: { [col: string]: Store.Value }[]
): DatasourceView[] {
  return data.map((store) => ({
    get id() {
      return store["id"] as string | number;
    },
    exist(_name, bind, _type) {
      return bind !== "_";
    },
    read(_name, bind, _type) {
      return store[bind] as Store.Value | undefined;
    },
    save(_name, bind, _type, data) {
      if (data == null) delete store[bind];
      else store[bind] = data;
    },
  }));
}
export const DatasourceContext = createContext(null as DatasourceView | null);

export default function Datasource({
  forestName,
  trans,
  children,
}: {
  forestName: string;
  trans: TransFunction;
  children: ReactNode;
}) {
  const Storage = createStorage(
    `datasource-${forestName}`,
    `/datasource/${forestName}.yaml`,
    () =>
      Promise.resolve({
        name: forestName,
        data: [] as { [col: string]: Store.Value }[],
      })
  );
  const driver = share?.datasourceDriver ?? defaultDriver;
  const [dsView, setDsView] = useState(null as DatasourceView | null);
  const snack = Snack.use();
  return (
    <Storage>
      {(dsCtx) => {
        const provider = (
          <DatasourceContext.Provider value={dsView}>
            {children}
          </DatasourceContext.Provider>
        );
        const data = dsCtx?.value?.data ?? [];
        const view = useMemo(() => driver(data), [dsCtx?.value]);
        if (dsCtx == null || dsCtx.value == null) {
          return provider;
        }
        return (
          <>
            {provider}
            <Autocomplete
              size="small"
              options={view.map(({ id }) => String(id))}
              renderInput={(params) => (
                <TextField
                  label={trans("Import datasource")}
                  {...params}
                ></TextField>
              )}
              onChange={(_event, value) => {
                if (value == null) {
                  setDsView(null);
                  snack.show(trans("Quit datasource mode"));
                  return;
                }
                const index = view.findIndex(({ id }) => String(id) === value);
                const { id, exist, read, save } = view[index];
                setDsView({
                  id,
                  exist,
                  read,
                  save(name, bind, type, data) {
                    if (dsCtx.saving) return;
                    save(name, bind, type, data);
                    dsCtx.update(dsCtx.value);
                  },
                });
                snack.show(trans("Into datasource mode"));
              }}
              sx={{
                position: "absolute",
                top: "2em",
                left: "2em",
                width: "12em",
                backdropFilter: "blur(3px)",
              }}
            />
          </>
        );
      }}
    </Storage>
  );
}
