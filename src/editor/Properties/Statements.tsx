import { useAutoAnimate } from "@formkit/auto-animate/react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import ListItem from "@mui/material/ListItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { ChangeEvent, MouseEvent, useState } from "react";

import type { Statement, Store } from "../../behavior-tree/type";
import { autoAttachKey } from "../../common/ExtValue";
import { useMoveableList } from "../../components/MoveableList";
import { useRefresh } from "../../components/Refresh";
import Snack from "../../components/Snack";
import { TransFunction } from "../../storage/Locale";
import StoreReader, { getStoreReaderText } from "./StoreReader";

interface Props {
  trans: TransFunction;
  node: any;
  name: string;
  item: { desc?: string; optional?: true };
  storeScopes: { label: string; value: string }[];
}
export default function Statements({
  trans,
  node,
  name,
  item,
  storeScopes,
}: Props) {
  name in node || (node[name] = []);

  const [dialogState, setDialogState] = useState(
    null as null | {
      index: number;
      resolve(value: Statement | null): void;
      statement: StatementState;
    }
  );
  const [, refresh] = useRefresh();

  const appendStatementPrompt = (index: number) =>
    new Promise<Statement | null>((resolve) => {
      const statements: Statement[] = node[name];
      const cid =
        index > 0
          ? (statements[index - 1] as { id?: Statement.ID })?.id ?? ""
          : "";
      return setDialogState({
        index,
        resolve: (value) => {
          resolve(value);
          setDialogState(null);
        },
        statement: { cid },
      });
    });

  const modifyStatement = async (index: number) => {
    const statement = await new Promise<Statement | null>((resolve) => {
      const statements: Statement[] = node[name];
      const statement = statements[index];
      const define = getStatementDefine(statement);
      const state = define.logic
        ? {
            id: "id" in statement ? statement.id : "",
            op: logicOperation.operate,
            logic: statement as { lid: string } & Statement.Logic,
          }
        : ({ ...statement } as StatementState);
      if (!("cid" in state)) {
        state.cid =
          index > 0
            ? (statements[index - 1] as { id?: Statement.ID })?.id ?? ""
            : "";
      }
      return setDialogState({ index, resolve, statement: state });
    });
    statement == null || (statements[index] = statement);
    setDialogState(null);
    refresh();
  };

  const statements: Statement[] = node[name];
  const idsTypeDict: StatementsIdDict = Object.fromEntries(
    statements
      .map((statement, index) => {
        if (!("id" in statement)) return ["", ""];
        const define = getStatementDefine(statement);
        switch (define.group) {
          case "Logic Operation:": // 逻辑运算返回值为 boolean
          case "Compare Operation:": // 比较运算返回值为 boolean
            return [statement.id, { index, type: "boolean" }];
          case "Numeric Operation:": // 算数运算返回值为 number
            return [statement.id, { index, type: "number" }];
          case "Other Operation:": {
            if ("val" in statement) {
              const type =
                typeof statement.val === "object"
                  ? statement.val.type
                  : (typeof statement.val as "number" | "string" | "boolean");
              return [statement.id, { index, type }];
            } else {
              return [""];
            }
          }
        }
      })
      .filter(([id]) => id !== "")
      .reverse() // 倒序遍历，id 重复时保证以第一次的定义为准
  );

  const moveableList = useMoveableList(
    statements,
    appendStatementPrompt,
    refresh,
    (statement, index, showMenu, anchor) => (
      <ListItem
        key={autoAttachKey(statement, "op")}
        onContextMenu={showMenu}
        sx={{ padding: 0 }}
      >
        <StatementItem
          index={index}
          statement={statement}
          typeDict={idsTypeDict}
          onClick={modifyStatement.bind(null, index)}
        />
        {anchor(index)}
      </ListItem>
    )
  );

  const [animateRef] = useAutoAnimate();

  return (
    <Box title={item.desc} ref={animateRef}>
      <Typography
        color={({ palette }) =>
          !item.optional && statements.length === 0
            ? palette.error[palette.mode]
            : palette.text.secondary
        }
        sx={{ m: 1, textAlign: "center" }}
      >
        {`- ${trans("Statements List")} -`}
      </Typography>
      {moveableList.listItems.length <= 0
        ? moveableList.appender
        : moveableList.listItems}
      {moveableList.itemMenu}
      {dialogState && (
        <StatementDialog
          trans={trans}
          storeScopes={storeScopes}
          typeDict={idsTypeDict}
          {...dialogState}
        />
      )}
    </Box>
  );
}

type Operate = Statement extends { op: infer O }
  ? Exclude<O, Statement.Logic["op"]> | "&& || !"
  : never;

interface OperateDefine {
  operate: Operate;
  showOp?: string;
  logic?: true;
  noLeft?: true;
  noRight?: true;
  value?: true;
  noId?: true;
  optId?: true;
  condition?: true;
  returns?: true;
}
const logicOperation = {
  operate: "&& || !" as const,
  logic: true,
  noLeft: true,
  noRight: true,
  optId: true,
};
const compareOperations: OperateDefine[] = [
  {
    operate: "==",
    optId: true,
  },
  {
    operate: "!=",
    showOp: "≠",
    optId: true,
  },
  {
    operate: "<",
    optId: true,
  },
  {
    operate: "<=",
    optId: true,
  },
  {
    operate: ">",
    optId: true,
  },
  {
    operate: ">=",
    optId: true,
  },
];
const numericOperations: OperateDefine[] = [
  {
    operate: "+",
  },
  {
    operate: "-",
  },
  {
    operate: "*",
  },
  {
    operate: "/",
  },
  {
    operate: "%",
  },
  {
    operate: "+1",
    noRight: true,
  },
  {
    operate: "-1",
    noRight: true,
  },
];
const otherOperations: OperateDefine[] = [
  {
    operate: "=",
    noLeft: true,
    noRight: true,
    value: true,
  },
  {
    operate: "?",
    noLeft: true,
    noRight: true,
    noId: true,
    condition: true,
    returns: true,
  },
];
const operations = {
  "Logic Operation:": [logicOperation as OperateDefine],
  "Compare Operation:": compareOperations,
  "Numeric Operation:": numericOperations,
  "Other Operation:": otherOperations,
};
type StatementDefine = OperateDefine & {
  group: keyof typeof operations;
  operate: Operate;
};
const statementsDict = Object.fromEntries(
  Object.entries(operations).flatMap(([group, defines]) =>
    defines.map(({ operate, ...define }) => [
      operate as Operate,
      { group, operate, ...define },
    ])
  )
) as {
  [op in Operate]: StatementDefine;
};
function getStatementDefine(statement: Statement): StatementDefine {
  return statement.op in statementsDict
    ? statementsDict[statement.op as keyof typeof statementsDict]
    : statementsDict[logicOperation.operate];
}

interface StatementState {
  op?: Operate;
  logic?: string | ({ lid: Statement.ID } & Statement.Logic);
  id?: string;
  lid?: string;
  rid?: string;
  val?: Store.Reader;
  cid?: string;
  ret?: boolean;
}

interface StatementsIdDict {
  [id: string]: {
    type: "number" | "string" | "boolean";
    index: number;
  };
}

function StatementItem({
  index,
  statement,
  typeDict,
  onClick,
}: {
  index: number;
  statement: Statement;
  typeDict: StatementsIdDict;
  onClick(): void;
}) {
  const define = getStatementDefine(statement);
  const text = getStatementText(statement, define);
  const idError = "id" in statement && invalidId(statement.id);
  const leftError =
    "lid" in statement && invalidIdType(index, statement.lid, typeDict, define);
  const rightError =
    "rid" in statement && invalidIdType(index, statement.rid, typeDict, define);
  const conditionError =
    "cid" in statement && invalidIdType(index, statement.cid, typeDict, define);
  return (
    <Button
      fullWidth
      size="small"
      sx={{ textAlign: "left", textTransform: "none" }}
      onClick={onClick}
    >
      <Typography
        color={({ palette }) =>
          idError || leftError || rightError || conditionError
            ? palette.error[palette.mode]
            : palette.text.primary
        }
        sx={{ width: "100%" }}
      >
        <small>{1 + index}. </small>
        {text}
      </Typography>
    </Button>
  );
}

function StatementDialog({
  trans,
  storeScopes,
  typeDict,
  index,
  resolve,
  statement,
}: {
  trans: TransFunction;
  storeScopes: { label: string; value: string }[];
  typeDict: StatementsIdDict;
  index: number;
  resolve: null | ((statement: Statement | null) => void);
  statement: StatementState;
}) {
  const [state, setState] = useState(statement as StatementState);
  const define = statementsDict[state.op ?? "="];

  const changeOperate = (
    _event: MouseEvent<HTMLElement>,
    op: Operate | null
  ) => {
    if (op == null) return;
    const defineNew = statementsDict[op];
    if (defineNew === define) return;
    setState({ ...state, op });
  };

  const onIDSubmit = (name: string, value: string) =>
    setState({ ...state, [name]: value });

  const changeReturns = (
    _event: ChangeEvent<HTMLInputElement>,
    checked: boolean
  ) => setState({ ...state, ret: checked });

  const snack = Snack.use();
  const submit = () => {
    const statement: StatementState | Statement = { op: define.operate };
    if (!define.noId) {
      if (invalidId(state.id, define.optId)) {
        snack.show(trans("Invalid input"));
        return;
      }
      if (duplicatedId(index, state.id, typeDict)) {
        snack.show(trans("Duplicate id"));
        return;
      }
      statement.id = state.id || "_";
    }
    if (!define.noLeft) {
      if (invalidIdType(index, state.lid, typeDict, define)) {
        snack.show(trans("Invalid input"));
        return;
      }
      statement.lid = state.lid;
    }
    if (!define.noRight) {
      if (invalidIdType(index, state.rid, typeDict, define)) {
        snack.show(trans("Invalid input"));
        return;
      }
      statement.rid = state.rid;
    }
    if (define.value) {
      statement.val = state.val ?? "";
    }
    if (define.condition) {
      if (invalidIdType(index, state.cid, typeDict, define)) {
        snack.show(trans("Invalid input"));
        return;
      }
      statement.cid = state.cid;
    }
    if (define.returns) {
      statement.ret = state.ret ?? false;
    }
    if (!define.logic) {
      resolve?.(statement as Statement);
      return;
    }
    if (typeof state.logic !== "object") {
      snack.show(trans("Invalid input"));
      return;
    }
    resolve?.({ ...state.logic, id: statement.id! });
  };

  const operatorTable = (
    <Table size="small" sx={{ mb: 1 }}>
      <TableBody>
        {Object.entries(operations).map(([group, defines]) => (
          <TableRow key={group}>
            <TableCell>
              <Typography
                whiteSpace="nowrap"
                alignItems="center"
                fontSize="small"
              >
                {trans(group)}
              </Typography>
            </TableCell>
            <TableCell>
              <ToggleButtonGroup
                exclusive
                value={define.operate}
                onChange={changeOperate}
              >
                {defines.map(({ operate, showOp }, index) => (
                  <ToggleButton
                    key={index}
                    value={operate}
                    sx={{ height: "2em", minWidth: "3em" }}
                    title={trans(operate + " operator")}
                    tabIndex={-1}
                  >
                    {showOp ?? operate}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    resolve && (
      <Dialog open={true}>
        <DialogTitle sx={{ minWidth: "16em" }}>
          {trans(
            statement.op == null ? "Append statement" : "Modify statement"
          )}
        </DialogTitle>
        <DialogContent>
          {operatorTable}
          {define && (
            <>
              {define.noId ? null : (
                <StatementId
                  index={index}
                  label="id"
                  value={state.id || ""}
                  submit={onIDSubmit.bind(null, "id")}
                  typeDict={typeDict}
                  optId={define.optId}
                />
              )}
              {define.logic ? (
                <StatementLogic
                  index={index}
                  label="logic"
                  value={state.logic || ""}
                  submit={(logic) => setState({ ...state, logic })}
                  typeDict={typeDict}
                  define={define}
                />
              ) : null}
              {define.noLeft ? null : (
                <StatementId
                  index={index}
                  label="left id"
                  value={state.lid || ""}
                  submit={onIDSubmit.bind(null, "lid")}
                  typeDict={typeDict}
                  define={define}
                />
              )}
              {define.noRight ? null : (
                <StatementId
                  index={index}
                  label="right id"
                  value={state.rid || ""}
                  submit={onIDSubmit.bind(null, "rid")}
                  typeDict={typeDict}
                  define={define}
                />
              )}
              {define.value ? (
                <StoreReader
                  trans={trans}
                  name="value"
                  read={() => state.val}
                  save={(val) => setState({ ...state, val })}
                  item={{ valueType: "unknown", optional: true }}
                  storeScopes={storeScopes}
                  embedded={true}
                />
              ) : null}
              {define.condition ? (
                <StatementId
                  index={index}
                  label="condition id"
                  value={state.cid || ""}
                  submit={onIDSubmit.bind(null, "cid")}
                  typeDict={typeDict}
                  define={define}
                />
              ) : null}
              {define.returns ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography>returns: </Typography>
                  <Switch
                    checked={state.ret ?? false}
                    onChange={changeReturns}
                  />
                  <Typography>{String(state.ret ?? false)}</Typography>
                </Stack>
              ) : null}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => resolve(null)}>{trans("CANCEL")}</Button>
          <Button onClick={submit}>{trans("SUBMIT")}</Button>
        </DialogActions>
      </Dialog>
    )
  );
}

function invalidId(id: string | undefined, allowEmpty?: true) {
  if (!id) return !allowEmpty;
  return id.match(/^[a-zA-Z_]+[a-zA-Z_0-9]*$/) == null;
}

function duplicatedId(
  index: number,
  id: string | undefined,
  dict: StatementsIdDict
) {
  if (!id || id === "_") return false;
  if (!(id in dict)) return false;
  const { index: foundIndex } = dict[id];
  return index !== foundIndex;
}

function invalidIdType(
  index: number,
  value: string | undefined,
  dict: StatementsIdDict,
  define: StatementDefine
) {
  if (!value) return true;
  const not = value[0] === "!";
  const id = not ? value.slice(1) : value;
  if (invalidId(id)) return true;
  if (!(id in dict)) return true;
  const { index: foundIndex, type } = dict[id];
  if (index <= foundIndex) return true;
  if (not && type !== "boolean") return true;
  switch (define.group) {
    case "Logic Operation:": // 逻辑运算参数必须为 boolean
      return type !== "boolean";
    case "Compare Operation:": // 比较运算参数没有限制
      return false;
    case "Numeric Operation:": // 算数运算参数必须为 number
      return type !== "number";
    case "Other Operation:":
      // ? 运算符参数 condition 必须为 boolean
      if (define.condition) return type !== "boolean";
      return false;
  }
}

function StatementId({
  index,
  label,
  value,
  submit,
  typeDict,
  define,
  optId,
}: {
  index: number;
  label: string;
  value: string;
  submit(value: string): void;
  typeDict: StatementsIdDict;
  define?: StatementDefine;
  optId?: true;
}) {
  const error = define
    ? invalidIdType(index, value, typeDict, define)
    : invalidId(value, optId) || duplicatedId(index, value, typeDict);
  const onChange = (event: ChangeEvent<HTMLInputElement>) =>
    submit(event.target.value.trim());
  return (
    <TextField
      fullWidth
      label={label}
      variant="standard"
      sx={{ mb: 1 }}
      error={error}
      value={value}
      onChange={onChange}
    />
  );
}

function getStatementText(
  statement: Statement,
  define: StatementDefine
): string {
  if (!("id" in statement)) {
    return `${statement.cid} ${statement.op} ${statement.ret}`;
  }
  if (define.logic) {
    const text = getLogicOperationText(
      statement as { lid: Statement.ID } & Statement.Logic
    );
    return `${statement.id} = ${text}`;
  }
  const value = [
    define.value ? null : "=",
    "lid" in statement ? statement.lid : null,
    statement.op === "+1"
      ? "+ 1" // 加一特殊处理一下，加个空格，排版会好看很多
      : statement.op === "-1"
      ? "- 1" // 加一特殊处理一下，特殊处理一下，加个空格，排版会好看很多
      : statement.op,
    "rid" in statement ? statement.rid : null,
    "val" in statement ? getStoreReaderText(statement.val) : null,
  ]
    .filter((line) => line != null)
    .join(" ");
  return `${statement.id} ${value}`;
}

function getLogicOperationText(
  statement: { lid?: Statement.ID } & Statement.Logic
): string {
  if (!("op" in statement)) return "";
  const next =
    "next" in statement && statement.next
      ? ` ${getLogicOperationText(statement.next)}`
      : "";
  const right = `${statement.op[0]} ${statement.rid}${next}`;
  return "lid" in statement ? `${statement.lid} ${right}` : right;
}

const logicIdReg = /^(!?\w+)\s*/;
const logicOpReg = /^([&\|]{1,2})\s*/;
function parseLogicStateText(
  index: number,
  logic: string | ({ lid: Statement.ID } & Statement.Logic),
  typeDict: StatementsIdDict,
  define: StatementDefine
): ({ lid: Statement.ID } & Statement.Logic) | null {
  if (typeof logic === "object") return logic;

  const lid = logic.match(logicIdReg);
  if (lid == null || lid[1] == null) return null;
  if (invalidIdType(index, lid[1], typeDict, define)) return null;

  const statement: { lid: Statement.ID } & Partial<Statement.Logic> = {
    lid: lid[1],
  };
  let text = logic.slice(lid[0].length);
  let parent: Statement.Logic | null = null;
  let cursor: null | Partial<Statement.Logic> = statement;
  while (true) {
    const op = text.match(logicOpReg);
    if (op == null || op[1] == null) break; // 没有更多操作符了，完成
    text = text.slice(op[0].length);

    const rid = text.match(logicIdReg);
    if (rid == null || rid[1] == null) return null; // 缺少操作符的右参数，异常
    if (invalidIdType(index, rid[1], typeDict, define)) return null;
    text = text.slice(rid[0].length);

    cursor.op = (
      op[1].length === 1 ? op[1].repeat(2) : op[1]
    ) as Statement.Logic["op"];
    cursor.rid = rid[1];
    const logic = cursor as Statement.Logic;
    parent == null || (parent.next = logic);
    parent = logic;
    cursor = {};
  }
  return "op" in statement && "rid" in statement
    ? (statement as { lid: Statement.ID } & Statement.Logic)
    : null;
}

function StatementLogic({
  index,
  label,
  value,
  submit,
  typeDict,
  define,
}: {
  index: number;
  label: string;
  value: string | ({ lid: Statement.ID } & Statement.Logic);
  submit(value: string | ({ lid: Statement.ID } & Statement.Logic)): void;
  typeDict: StatementsIdDict;
  define: StatementDefine;
}) {
  const error = typeof value === "string";
  const text = error ? value : getLogicOperationText(value);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.trimStart();
    const statement = parseLogicStateText(index, value, typeDict, define);
    submit(statement ?? value);
  };
  return (
    <TextField
      fullWidth
      label={label}
      variant="standard"
      sx={{ mb: 1 }}
      error={error}
      value={text}
      onChange={onChange}
    />
  );
}
