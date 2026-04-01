import { useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

import overviewImg from "@/assets/admin-showcase/admin-overview.png";
import scoresImg from "@/assets/admin-showcase/admin-scores-rankings.png";
import jurorsImg from "@/assets/admin-showcase/admin-jurors.png";
import projectsImg from "@/assets/admin-showcase/admin-projects.png";

const SLIDES = [
  {
    title: "Overview",
    description:
      "Jüri ilerlemesi, grup dağılımı ve ortalama skor tek panelde birleşerek karar hızını premium seviyede artırır.",
    image: overviewImg,
    alt: "VERA admin overview ekranı",
  },
  {
    title: "Scores & Rankings",
    description:
      "Canlı sıralama ve kriter kırılımlarıyla değerlendirme kalitesi şeffaflaşır, final kararları güvenle alınır.",
    image: scoresImg,
    alt: "VERA admin scores ve rankings ekranı",
  },
  {
    title: "Juror Operations",
    description:
      "Jüri atama, durum takibi ve erişim yönetimi tek akışta yönetilerek operasyonel yük minimuma iner.",
    image: jurorsImg,
    alt: "VERA admin jurors ekranı",
  },
  {
    title: "Project Management",
    description:
      "Projeler, gruplar ve eşleştirmeler net bir kontrol yüzeyinde toplanır; süreç baştan sona izlenebilir kalır.",
    image: projectsImg,
    alt: "VERA admin projects ekranı",
  },
];

export default function AdminShowcaseCarousel() {
  const [api, setApi] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!api) return;

    const onSelect = () => setActiveIndex(api.selectedScrollSnap());
    onSelect();

    api.on("select", onSelect);
    api.on("reInit", onSelect);

    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  useEffect(() => {
    if (!api) return;
    const timer = setInterval(() => api.scrollNext(), 5500);
    return () => clearInterval(timer);
  }, [api]);

  return (
    <section className="w-full rounded-3xl border border-white/15 bg-white/5 p-4 shadow-2xl backdrop-blur-sm sm:p-5">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-blue-200/90 uppercase">
            Admin Panel Showcase
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-white sm:text-xl">
            Premium Control Surface
          </h2>
        </div>
        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-blue-100">
          {activeIndex + 1} / {SLIDES.length}
        </span>
      </div>

      <Carousel
        setApi={setApi}
        opts={{ loop: true, align: "start" }}
        className="w-full"
      >
        <CarouselContent className="ml-0">
          {SLIDES.map((slide) => (
            <CarouselItem key={slide.title} className="pl-0">
              <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                <img
                  src={slide.image}
                  alt={slide.alt}
                  className="aspect-[16/9] w-full object-cover object-top"
                  loading="lazy"
                />
                <div className="border-t border-slate-200 px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-900">{slide.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{slide.description}</p>
                </div>
              </article>
            </CarouselItem>
          ))}
        </CarouselContent>

        <CarouselPrevious
          className="top-[42%] left-3 h-9 w-9 border-white/40 bg-white/90 text-slate-800 hover:bg-white"
          size="icon"
        />
        <CarouselNext
          className="top-[42%] right-3 h-9 w-9 border-white/40 bg-white/90 text-slate-800 hover:bg-white"
          size="icon"
        />
      </Carousel>

      <div className="mt-4 flex items-center justify-center gap-2">
        {SLIDES.map((slide, index) => (
          <button
            key={slide.title}
            type="button"
            aria-label={`${slide.title} slaytina git`}
            onClick={() => api?.scrollTo(index)}
            className={`h-2.5 rounded-full transition-all ${
              activeIndex === index ? "w-6 bg-blue-300" : "w-2.5 bg-white/35 hover:bg-white/55"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
