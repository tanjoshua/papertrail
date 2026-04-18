import { deleteStatementAction } from "@/app/statement-actions";

type DeleteStatementFormProps = {
  returnTo: "/statements" | "/upload";
  statementId: string;
};

export function DeleteStatementForm({ returnTo, statementId }: DeleteStatementFormProps) {
  return (
    <form action={deleteStatementAction}>
      <input type="hidden" name="statementId" value={statementId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button type="submit" className="danger-button compact-button">
        Delete statement
      </button>
    </form>
  );
}
