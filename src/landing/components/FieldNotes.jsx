import { useEffect, useRef, useState } from "react";
import { getDemoClient } from "@/shared/lib/supabaseClient";

const FALLBACK_QUOTES = [
  {
    comment:
      "We evaluated 41 capstone projects with 19 jurors in under two hours. Scores were live, rankings were instant, and the attainment report was on the dean's desk before we left the building.",
    juror_name: "Prof. Dr. Ahmet Yılmaz",
    affiliation: "EE Department · Capstone Coordinator · TED University",
  },
  {
    comment:
      "Yüzlerce takımı hızlıca değerlendirdik. Sistem çok stabil — jüri günü tek bir crash yaşamadık.",
    juror_name: "Prof. Kemal Özdemir",
    affiliation: "İTÜ · Havacılık ve Uzay",
  },
  {
    comment:
      "Araştırma projeleri için çok uygun bir değerlendirme aracı. Rubric band'ler özellikle çok işe yaradı.",
    juror_name: "Prof. Hasan Yüksel",
    affiliation: "Boğaziçi Üniversitesi · Fizik",
  },
];

const demoClient = getDemoClient();

function useFeedback() {
  const [quotes, setQuotes] = useState(FALLBACK_QUOTES);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    demoClient
      .rpc("rpc_get_public_feedback")
      .then(({ data }) => {
        const live = data?.testimonials;
        if (Array.isArray(live) && live.length > 0) {
          setQuotes(live.slice(0, 3));
        }
      })
      .catch(() => {});
  }, []);

  return quotes;
}

export default function FieldNotes() {
  const quotes = useFeedback();
  const [hero, ...secondary] = quotes;

  return (
    <section className="ed-fieldnotes" id="field-notes">
      <div className="ed-wrap">
        <header className="ed-fn-head">
          <span className="num">05</span>
          <h2>
            The verdict is in. <em>Unanimous.</em>
          </h2>
          <p className="sub">
            Production at universities, competitions, and accreditation review boards. The pattern
            is consistent: scoring takes minutes, reports take seconds, the binder takes care of itself.
          </p>
          <span className="meta">{quotes.length} · ENTRIES</span>
        </header>

        {hero && (
          <div className="ed-fn-hero">
            <p className="ed-fn-hero-quote">{hero.comment}</p>
            <div className="ed-fn-hero-author">
              <span className="ed-fn-name">{hero.juror_name}</span>
              <span className="ed-fn-affil">{hero.affiliation}</span>
            </div>
          </div>
        )}

        {secondary.length > 0 && (
          <div className="ed-fn-secondary">
            {secondary.map((q, i) => (
              <div key={`${q.juror_name}-${i}`} className="ed-fn-small">
                <p className="ed-fn-small-quote">{q.comment}</p>
                <div className="ed-fn-small-author">
                  <span className="ed-fn-name">{q.juror_name}</span>
                  <span className="ed-fn-affil">{q.affiliation}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
