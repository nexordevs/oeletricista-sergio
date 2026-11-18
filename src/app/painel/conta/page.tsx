import { panelContext } from "@/lib/panel";
import { AccountForm } from "./AccountForm";
export default async function Conta() {
  const { user } = await panelContext();
  return <AccountForm name={user.name} email={user.email} />;
}
