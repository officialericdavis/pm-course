import { MobileNav } from "./mobile-nav";

export function MobileStudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <main>{children}</main>
      <MobileNav />
    </div>
  );
}
