export function PrintStatusBadge({
  online,
  revoked,
  inactive,
  scheduled,
}: {
  online?: boolean;
  revoked?: boolean;
  inactive?: boolean;
  scheduled?: boolean;
}) {
  if (revoked) {
    return <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-bold text-gray-600">Revogado</span>;
  }
  if (inactive) {
    return <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">Inativo</span>;
  }
  if (scheduled) {
    return <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">Fora do horário</span>;
  }
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-bold ${online ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
      {online ? "Online" : "Offline"}
    </span>
  );
}
