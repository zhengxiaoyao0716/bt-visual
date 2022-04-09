import { useTrans } from "../storage/Locale";

export default function Help() {
  const trans = useTrans();
  return <span>TODO {trans("HelpPage")}</span>;
}
Help.route = "/help";
