import { deleteStatementAction } from "@/app/statement-actions";
import { Button } from "@/components/ui/button";

type DeleteStatementFormProps = {
  returnTo: "/statements" | "/upload";
  statementId: string;
};

export function DeleteStatementForm({ returnTo, statementId }: DeleteStatementFormProps) {
  return (
    <form action={deleteStatementAction}>
      <input type="hidden" name="statementId" value={statementId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <Button type="submit" variant="destructive" size="sm">
        Delete statement
      </Button>
    </form>
  );
}
