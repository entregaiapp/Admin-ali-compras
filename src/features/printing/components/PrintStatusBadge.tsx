export function PrintStatusBadge({ online, revoked }: { online?: boolean; revoked?: boolean }) {
  if (revoked) {
    return <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-bold text-gray-600">Revogado</span>;
  }
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-bold ${online ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
      {online ? "Online" : "Offline"}
    </span>
  );
}
