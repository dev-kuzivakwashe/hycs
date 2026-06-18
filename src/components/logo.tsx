import logoAsset from "@/assets/hycs-logo.png.asset.json";

export function Logo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt="HYCS"
      className={className}
      width={336}
      height={336}
      draggable={false}
    />
  );
}
