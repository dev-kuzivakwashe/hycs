import logoAsset from "@/assets/likeable-logo.png.asset.json";

export function Logo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt="Likeable"
      className={className}
      width={192}
      height={192}
      draggable={false}
    />
  );
}
