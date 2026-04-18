"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import {
  assignTransactionCategory,
  createCategory,
  deleteCategory,
  loadDemoWorkspace,
  updateCategory,
  updateRuleCategory,
} from "@/lib/expenses";

function sanitizeReturnTo(value: string | undefined, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

function redirectWithMessage(returnTo: string, message: string, extra?: Record<string, string | undefined>): never {
  const [pathname, queryString] = sanitizeReturnTo(returnTo).split("?");
  const params = new URLSearchParams(queryString ?? "");

  params.set("message", message);

  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value) {
      params.set(key, value);
    }
  }

  const target = params.toString() ? `${pathname}?${params.toString()}` : pathname;
  redirect(target);
}

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function assignCategoryAction(formData: FormData) {
  const transactionId = getStringValue(formData, "transactionId");
  const categoryId = getStringValue(formData, "categoryId");
  const scopeValue = getStringValue(formData, "scope");
  const returnTo = sanitizeReturnTo(getStringValue(formData, "returnTo"), "/review");

  if (!transactionId || !categoryId || !["once", "future"].includes(scopeValue)) {
    redirectWithMessage(returnTo, "Choose a category and whether it applies once or as a reusable rule.");
  }

  try {
    assignTransactionCategory({
      categoryId,
      scope: scopeValue as "once" | "future",
      transactionId,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update the transaction.";
    redirectWithMessage(returnTo, message);
  }

  refresh();
}

export async function updateRuleAction(formData: FormData) {
  const ruleId = getStringValue(formData, "ruleId");
  const categoryId = getStringValue(formData, "categoryId");
  const returnTo = sanitizeReturnTo(getStringValue(formData, "returnTo"), "/review");

  if (!ruleId || !categoryId) {
    redirectWithMessage(returnTo, "Choose a category for the merchant memory rule.");
  }

  try {
    updateRuleCategory(ruleId, categoryId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update the rule.";
    redirectWithMessage(returnTo, message);
  }

  refresh();
}

export async function createCategoryAction(formData: FormData) {
  try {
    createCategory({
      color: getStringValue(formData, "color"),
      name: getStringValue(formData, "name"),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create the category.";
    redirectWithMessage("/categories", message);
  }

  refresh();
}

export async function updateCategoryAction(formData: FormData) {
  try {
    updateCategory({
      color: getStringValue(formData, "color"),
      id: getStringValue(formData, "categoryId"),
      name: getStringValue(formData, "name"),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update the category.";
    redirectWithMessage("/categories", message);
  }

  refresh();
}

export async function deleteCategoryAction(formData: FormData) {
  try {
    deleteCategory(getStringValue(formData, "categoryId"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete the category.";
    redirectWithMessage("/categories", message);
  }

  refresh();
}

export async function loadDemoDataAction() {
  const loaded = loadDemoWorkspace();

  if (!loaded) {
    redirectWithMessage("/", "Demo data is only available when the workspace is empty.");
  }

  refresh();
}
