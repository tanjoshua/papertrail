"use server";

import { redirect } from "next/navigation";
import { isStatementParserType } from "@/lib/importers";

function redirectWithMessage(message: string, extra?: Record<string, string | undefined>): never {
  const params = new URLSearchParams();
  params.set("message", message);

  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value) {
      params.set(key, value);
    }
  }

  redirect(`/upload?${params.toString()}`);
}

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function uploadStatementAction(formData: FormData) {
  const statementTypeValue = getStringValue(formData, "statementType");
  const statement = formData.get("statement");
  const statementType = isStatementParserType(statementTypeValue) ? statementTypeValue : undefined;

  if (!(statement instanceof File) || statement.size === 0) {
    redirectWithMessage("Please provide a statement file.");
  }

  let result:
    | {
        message: string;
        statementId: string;
      }
    | undefined;

  try {
    const { importStatement } = await import("@/lib/importers");
    result = await importStatement({
      file: statement,
      statementType: statementType || undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The statement upload failed.";
    redirectWithMessage(message);
  }

  redirectWithMessage(result.message, { statement: result.statementId });
}
