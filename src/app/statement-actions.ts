"use server";

import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db, getUploadsDirectory } from "@/lib/db";

function redirectWithMessage(path: string, message: string): never {
  const params = new URLSearchParams();
  params.set("message", message);
  redirect(`${path}?${params.toString()}`);
}

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getSafeReturnPath(path: string) {
  if (path === "/upload" || path === "/statements") {
    return path;
  }

  return "/statements";
}

export async function deleteStatementAction(formData: FormData) {
  const statementId = getStringValue(formData, "statementId");
  const returnTo = getSafeReturnPath(getStringValue(formData, "returnTo"));

  if (!statementId) {
    redirectWithMessage(returnTo, "Could not delete that statement because the request was incomplete.");
  }

  const statement = db
    .prepare(
      `
        SELECT file_name AS fileName, original_file_name AS originalFileName
        FROM statements
        WHERE id = ?
      `,
    )
    .get(statementId) as { fileName: string; originalFileName: string } | undefined;

  if (!statement) {
    redirectWithMessage(returnTo, "That statement was already removed.");
  }

  db.prepare("DELETE FROM statements WHERE id = ?").run(statementId);

  try {
    await unlink(join(getUploadsDirectory(), statement.fileName));
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }
  }

  refresh();
}
