import type { ComponentProps } from "react";
import { AdminTopBar, AdminTopBarIconButton } from "./AdminTopBar";

export type { AdminTopBarProps as AdminHeaderProps } from "./AdminTopBar";

/** @deprecated Prefer AdminTopBar — kept for existing screens during migration. */
export function AdminHeader(
  props: ComponentProps<typeof AdminTopBar> & { showAccent?: boolean }
) {
  const { showAccent: _showAccent, ...rest } = props;
  return <AdminTopBar {...rest} />;
}

export const AdminHeaderIconButton = AdminTopBarIconButton;
