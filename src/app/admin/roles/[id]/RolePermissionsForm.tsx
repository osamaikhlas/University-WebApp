"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { updateRolePermissions, type UpdateRolePermissionsState } from "@/app/admin/roles/actions";

const initialState: UpdateRolePermissionsState = { error: null };

type Props = {
  roleId: string;
  groupedPermissions: Array<{ domain: string; keys: string[] }>;
  grantedKeys: Set<string>;
};

export function RolePermissionsForm({ roleId, groupedPermissions, grantedKeys }: Props) {
  const action = updateRolePermissions.bind(null, roleId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {groupedPermissions.map((group) => (
        <fieldset key={group.domain} className="flex flex-col gap-2 rounded-md border border-border-subtle p-4">
          <legend className="px-1 text-sm font-semibold text-foreground">{group.domain}</legend>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-6">
            {group.keys.map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm text-foreground/80">
                <input
                  type="checkbox"
                  name="permissions"
                  value={key}
                  defaultChecked={grantedKeys.has(key)}
                  className="h-4 w-4 rounded border-border-subtle text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                />
                {key}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : "Save permissions"}
      </Button>
    </form>
  );
}
