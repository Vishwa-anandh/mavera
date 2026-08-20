import { partners } from '@/lib/content';

export default function TrustedBy() {
  return (
    <section className="border-y border-navy-100 bg-navy-50/50 py-10">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <p className="text-center text-xs font-semibold tracking-[0.2em] text-navy-400">
          Trusted by Fortune 500 enterprises worldwide
        </p>
        <div className="mt-7 overflow-hidden mask-fade-x">
          <div className="flex w-max animate-marquee items-center gap-10">
            {[...partners, ...partners, ...partners].map((p, i) => (
              <div
                key={i}
                className="flex items-center gap-2 whitespace-nowrap text-lg font-bold font-display tracking-tight text-navy-300 transition-colors hover:text-navy-600"
              >
                <span className="h-2 w-2 rounded-full bg-brand-400" />
                {p}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
