/** Coffee-cup mark used as the app logo (sidebar, login and setup screens). */
export default function CoffeeIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M4 9h12v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9Z" />
      <path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M7.6 2.6c-.7 1-.3 1.7 0 2.3M11.2 2.6c-.7 1-.3 1.7 0 2.3" />
      <path d="M3 21h14" />
    </svg>
  );
}
