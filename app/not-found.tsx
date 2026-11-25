import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="bg-brand flex size-14 items-center justify-center rounded-full text-white"><SearchX /></div>
      <h2 className="text-lg font-semibold">Page not found</h2>
      <Button asChild variant="outline"><Link href="/">Go home</Link></Button>
    </div>
  );
}
