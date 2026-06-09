import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Clock, Lightbulb } from "lucide-react";
import { getTravelGuide, TRAVEL_GUIDES } from "@/lib/travel-guides";
import { buildArticleJsonLd } from "@/lib/travel-structured-data";
import { travelHref } from "@/lib/travel-paths";
import { getServerTravelBasePath } from "@/lib/travel-paths-server";
import { JsonLd } from "../../components/json-ld";

export async function generateStaticParams() {
  return TRAVEL_GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const guide = getTravelGuide(slug);
  if (!guide) return { title: "Guide | Aagam Holidays" };

  return {
    title: `${guide.title} | Aagam Holidays`,
    description: guide.excerpt,
    openGraph: {
      title: guide.title,
      description: guide.excerpt,
      type: "article",
    },
  };
}

export default async function TravelGuideDetailPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const guide = getTravelGuide(slug);
  if (!guide) notFound();

  const basePath = await getServerTravelBasePath();
  const guidesPath = travelHref("/guides", basePath);
  const packagesPath = travelHref("/packages", basePath);

  return (
    <article className="min-h-screen pt-20 bg-white">
      <JsonLd data={buildArticleJsonLd(guide)} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <Link
          href={guidesPath}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-orange-600 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          All travel guides
        </Link>

        <header className="mb-10">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wide text-orange-600">
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              {guide.category}
            </span>
            <span className="inline-flex items-center gap-1.5 text-gray-400 font-normal normal-case">
              <Clock className="w-3.5 h-3.5" />
              {guide.readMinutes} min read
            </span>
          </div>
          <h1 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
            {guide.title}
          </h1>
          <p className="mt-4 text-gray-600 leading-relaxed">{guide.excerpt}</p>
        </header>

        <div className="prose prose-gray max-w-none space-y-8">
          {guide.sections.map((section, idx) => (
            <section key={idx}>
              {section.heading && (
                <h2 className="text-xl font-bold text-gray-900 mb-3">
                  {section.heading}
                </h2>
              )}
              {section.paragraphs.map((para, pIdx) => (
                <p
                  key={pIdx}
                  className="text-gray-600 leading-relaxed mb-4 last:mb-0"
                >
                  {para}
                </p>
              ))}
            </section>
          ))}
        </div>

        {guide.tips && guide.tips.length > 0 && (
          <div className="mt-10 rounded-2xl border border-amber-100 bg-amber-50/80 p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold text-amber-900 mb-4">
              <Lightbulb className="w-5 h-5" />
              Quick tips
            </h2>
            <ul className="space-y-2">
              {guide.tips.map((tip) => (
                <li
                  key={tip}
                  className="text-sm text-amber-950 leading-relaxed flex gap-2"
                >
                  <span className="text-amber-500 mt-1">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {guide.relatedLinks && guide.relatedLinks.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-3">
            {guide.relatedLinks.map((link) => (
              <Link
                key={link.path}
                href={travelHref(link.path, basePath)}
                className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-12 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 p-6 sm:p-8 text-center text-white">
          <h2 className="text-xl font-bold">Ready to plan your trip?</h2>
          <p className="mt-2 text-white/85 text-sm">
            Browse curated packages or request a free callback from our team.
          </p>
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={packagesPath}
              className="inline-flex rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-orange-600 hover:bg-orange-50 transition-colors"
            >
              View packages
            </Link>
            <Link
              href={travelHref("/", basePath)}
              className="inline-flex rounded-xl border border-white/40 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Request callback on homepage
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
