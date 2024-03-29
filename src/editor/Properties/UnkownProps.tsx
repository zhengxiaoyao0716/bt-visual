import TextField from "@mui/material/TextField";

import { useDialogConfirm } from "../../components/DialogConfirm";
import { useRefresh } from "../../components/Refresh";
import { TransFunction } from "../../storage/Locale";
import Box from "@mui/material/Box";

interface Props {
  trans: TransFunction;
  node: any;
  unknownProps: [string, unknown][];
}
export default function UnkownProps({ trans, node, unknownProps }: Props) {
  const [, refresh] = useRefresh();
  const { dialog, confirm } = useDialogConfirm();
  const remove = async (name: string) => {
    const confirmRemoveProps = {
      cancel: trans("CANCEL"),
      submit: trans("REMOVE"),
      title: trans("Confirm to remove the item?"),
    };
    const confirmed = confirm(confirmRemoveProps);
    if (!(await confirmed)) return;
    delete node[name];
    refresh();
  };
  return (
    <>
      {unknownProps
        .filter(([name]) => name in node)
        .map(([name, value]) => (
          <Box key={name} onClick={remove.bind(null, name)}>
            <TextField
              label={name}
              fullWidth
              value={JSON.stringify(value)}
              disabled
              size="small"
              sx={{ mb: 1 }}
            />
          </Box>
        ))}
      {dialog}
    </>
  );
}
