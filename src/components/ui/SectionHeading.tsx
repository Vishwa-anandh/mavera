import { useReveal } from '@/lib/hooks';

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  const { ref, shown } = useReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`mx-auto max-w-2xl text-center transition-all duration-700 ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
    >
      <span className="inline-block rounded-full bg-brand-50 px-3.5 py-1 text-xs font-semibold tracking-wider text-brand-700">
        {eyebrow}
      </span>
      <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl lg:text-[40px] lg:leading-[1.1]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-base leading-relaxed text-navy-500 sm:text-lg">{subtitle}</p>
      )}
    </div>
  );
}
