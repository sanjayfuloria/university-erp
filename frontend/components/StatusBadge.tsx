export default function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return (
    <span className={`status-${status} inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium`}>
      {label}
    </span>
  );
}
