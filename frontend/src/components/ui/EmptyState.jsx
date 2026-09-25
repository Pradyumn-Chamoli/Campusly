export default function EmptyState({ icon = "📭", title, description, action, className = "" }) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-6 py-12 rounded-2xl border border-dashed border-border bg-surface ${className}`}
    >
      <div className="text-4xl mb-3" aria-hidden="true">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-text">{title}</h3>
      {description && (
        <p className="text-sm text-text-secondary mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
