import { IconStar } from "@/components/icons";
export function ReviewButton({ url, className = "btn-outline", label = "Avaliar no Google" }: { url: string; className?: string; label?: string }) {
  if (!url) return null;
  return <a href={url} target="_blank" rel="noopener" className={className}><IconStar className="h-5 w-5 fill-brand text-brand" /> {label}</a>;
}
