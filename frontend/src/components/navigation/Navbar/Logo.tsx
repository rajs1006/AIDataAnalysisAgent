import Link from "next/link";

export function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-400">
        <span className="text-[#F5F5F0] text-lg font-bold">A</span>
      </div>
      <span className="text-white text-xl font-semibold">Andrual</span>
    </Link>
  );
}
