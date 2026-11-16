import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import { ArrowLink } from '@/components/ui/ArrowLink';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { getSettings } from '@/lib/api';
import { pad2, paragraphs } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Process & FAQ',
  description: 'How a custom tattoo comes together, from first message to finished piece, and answers to common questions.',
  alternates: { canonical: '/process' },
};

export default async function ProcessPage() {
  const s = await getSettings();
  const faqJsonLd = s.faqs.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: s.faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
      }
    : null;

  return (
    <div className="pt-28 md:pt-40">
      <header className="gutter page-grid gap-y-6 pb-16 md:pb-24">
        <SectionLabel className="col-span-12 lg:col-span-2">Process &amp; FAQ</SectionLabel>
        <h1 className="text-display-xl col-span-12 max-w-[12ch] text-bone lg:col-span-10">From an idea to the skin</h1>
      </header>

      {s.processSteps.length > 0 && (
        <section aria-labelledby="steps" className="gutter border-t border-line">
          <h2 id="steps" className="sr-only">
            The process
          </h2>
          <ol>
            {s.processSteps.map((step, i) => (
              <li key={i} className="page-grid gap-y-4 border-b border-line py-10 md:py-14">
                <p className="text-meta col-span-12 text-accent tabular-nums lg:col-span-2">{pad2(i + 1)}</p>
                <h3 className="text-display-m col-span-12 text-bone md:col-span-5 lg:col-span-4">{step.title}</h3>
                <p className="col-span-12 max-w-[54ch] text-lede text-bone-2 md:col-span-7 lg:col-span-5 lg:col-start-8">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {s.faqs.length > 0 && (
        <section aria-labelledby="faq" className="gutter page-grid gap-y-10 py-24 md:py-36">
          <div className="col-span-12 lg:col-span-4">
            <h2 id="faq" className="text-display-l text-bone lg:sticky lg:top-28">
              Questions
            </h2>
          </div>
          <div className="col-span-12 border-t border-line lg:col-span-7 lg:col-start-6">
            {s.faqs.map((f, i) => (
              <details key={i} className="group border-b border-line">
                <summary className="flex min-h-16 cursor-pointer items-center justify-between gap-6 py-5 text-left text-[1.125rem] text-bone md:text-[1.25rem]">
                  {f.question}
                  <Plus
                    size={18}
                    strokeWidth={1.5}
                    aria-hidden
                    className="shrink-0 text-bone-2 transition-transform duration-300 ease-out-soft group-open:rotate-45"
                  />
                </summary>
                <div className="max-w-[60ch] space-y-4 pb-7 text-bone-2">
                  {paragraphs(f.answer).map((p, j) => (
                    <p key={j}>{p}</p>
                  ))}
                </div>
              </details>
            ))}
            <div className="mt-12">
              <p className="text-bone-2">Something else on your mind?</p>
              <ArrowLink href="/contact" variant="text" className="mt-2">
                Ask directly
              </ArrowLink>
            </div>
          </div>
        </section>
      )}

      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }} />
      )}
    </div>
  );
}
