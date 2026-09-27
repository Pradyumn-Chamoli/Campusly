// The actions a participant may attempt, derived from the transition rules in
// docs/06_Phase0_Decisions.md D1/D2. The backend still enforces them.
export function availableActions(request, user) {
  if (!user) return [];
  const isBuyer = request.buyer.id === user.id;

  if (request.status === "PENDING") {
    return isBuyer
      ? [{ status: "CANCELLED", label: "Cancel request", variant: "secondary" }]
      : [
          { status: "ACCEPTED", label: "Accept", variant: "primary" },
          { status: "REJECTED", label: "Reject", variant: "secondary" },
        ];
  }

  if (request.status === "ACCEPTED") {
    return [{ status: "COMPLETED", label: "Mark completed", variant: "primary" }];
  }

  return [];
}
