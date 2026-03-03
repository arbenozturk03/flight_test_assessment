const ACTIVE = 'border-[#003366] bg-[#003366] text-white';
const INACTIVE =
  'border-tusas-border bg-tusas-surface text-tusas-text hover:border-tusas-blue';

interface ManeuverButtonProps {
  name: string;
  selected: boolean;
  onToggle: (name: string) => void;
}

export default function ManeuverButton({
  name,
  selected,
  onToggle,
}: ManeuverButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(name)}
      className={`min-h-[56px] w-full rounded-lg border-2 px-4 py-3 text-center text-sm font-medium transition-all ${
        selected ? ACTIVE : INACTIVE
      }`}
    >
      {name}
    </button>
  );
}
