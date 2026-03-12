import logoSymbol from "@/assets/logo-symbol.png";

interface ComingSoonBadgeProps {
  label?: string;
  className?: string;
}

const ComingSoonBadge = ({ label = "Coming Soon", className = "" }: ComingSoonBadgeProps) => {
  return (
    <div className={`inline-flex items-center gap-2 bg-primary/10 border border-primary/30 text-primary rounded-full px-4 py-1.5 ${className}`}>
      <img src={logoSymbol} alt="" className="w-4 h-4" />
      <span className="text-xs font-bold">{label}</span>
    </div>
  );
};

export default ComingSoonBadge;
