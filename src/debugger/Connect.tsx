import BugReportIcon from "@mui/icons-material/BugReport";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Container from "@mui/material/Container";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { ChangeEvent, FormEvent, useState } from "react";

import Config from "../storage/Config";
import { useTrans } from "../storage/Locale";

const hostPattern = `[^/:]+`;
const portPattern = `\\d{1,5}`;
const pathPattern = `.*`;
const addressPattern = `^(wss?)://(${hostPattern})?(?::(${portPattern}))?(/${pathPattern})?$`;

function parseAddress(address: string): null | {
  schema: string;
  host: string;
  port: string;
  path: string;
} {
  if (address === "") return { schema: "ws", host: "", port: "", path: "" };
  const matched = address.match(addressPattern);
  if (matched == null) return null;
  const [, schema, host = "", port = "", path = ""] = matched;
  return { schema, host, port: port, path };
}

interface Props {
  connect(address: string): void;
}
export default function Connect({ connect }: Props) {
  const config = Config.use();
  if (config?.value == null) return null; // never
  const trans = useTrans();

  const { serverAddress } = config.value;
  const [address, setAddress] = useState(serverAddress);
  const parsed = parseAddress(address);

  const handleHost = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.trim();
    if (parsed == null) {
      setAddress(value);
      return;
    }
    if (value && value.match(`^${hostPattern}$`) === null) {
      const { host } = parseAddress(value) ?? { host: value };
      console.log(value, parseAddress(value), host); // TODO
      setAddress(host);
      return;
    }
    const { schema, port, path } = parsed ?? parseAddress("")!;
    const host = value;
    setAddress(`${schema}://${host}${port ? `:${port}` : ""}${path}`);
  };
  const handlePort = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.trim();
    if (value && value.match(`^${portPattern}$`) == null) return;
    const { schema, host, path } = parsed ?? parseAddress("")!;
    const port = value ? `:${value}` : "";
    setAddress(`${schema}://${host}${port}${path}`);
  };
  const handlePath = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.trim();
    if (value && value.match(`^${pathPattern}$`) == null) return;
    const { schema, host, port } = parsed ?? parseAddress("")!;
    const path = !value || value.startsWith("/") ? value : `/${value}`;
    setAddress(`${schema}://${host}${port ? `:${port}` : ""}${path}`);
  };

  const [remember, setRemember] = useState(!!serverAddress);
  const toggleRemember = () => setRemember(!remember);

  const error = parsed == null ? address === "" : parsed.host === "";
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (error) return;
    if (config.saving) return;
    const data = new FormData(event.currentTarget);
    // console.log(data);
    remember &&
      (await config.update({ ...config.value, serverAddress: address }));
    connect(address);
  };

  return (
    <Container
      sx={{
        marginTop: 8,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Stack direction="row" alignItems="center">
        <Avatar sx={{ m: 1, bgcolor: "primary.main" }}>
          <BugReportIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          {trans("Connect to the server")}
        </Typography>
      </Stack>

      <Box
        component="form"
        onSubmit={handleSubmit}
        noValidate
        sx={{ mt: 1, minWidth: "24em" }}
      >
        <TextField
          margin="normal"
          fullWidth
          label={trans(parsed ? "Server Host" : "Server Address")}
          name="host"
          autoComplete="server-host"
          value={parsed == null ? address : parsed.host}
          onChange={handleHost}
          error={error}
          autoFocus
        />
        {parsed && (
          <>
            <TextField
              margin="normal"
              fullWidth
              name="port"
              label={trans("Server Port")}
              type="number"
              autoComplete="server-port"
              value={parsed.port}
              onChange={handlePort}
            />
            <TextField
              margin="normal"
              fullWidth
              label={trans("Server Path")}
              name="path"
              autoComplete="server-path"
              value={parsed.path}
              onChange={handlePath}
            />
          </>
        )}
        <Stack direction="row" alignItems="center">
          <FormControlLabel
            control={
              <Checkbox
                name="remember"
                checked={remember}
                onChange={toggleRemember}
                color="primary"
              />
            }
            label={trans("Remember address")}
          />
          <Typography color={({ palette }) => palette.text.disabled}>
            {address || "ws(s)://${host}:${port}/${path}"}
          </Typography>
        </Stack>
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
          disabled={error}
        >
          {trans("CONNECT")}
        </Button>
      </Box>
    </Container>
  );
}
