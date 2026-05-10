import { useState, useRef, useEffect } from "react";
import { Play } from "lucide-react";

const EMBED_BASE = "https://www.youtube-nocookie.com/embed";
const POSTER_BASE = "https://i.ytimg.com/vi";

export default function VideoFilm({
  videoId = "N1gzQUgd1qM",
  duration = "2 min",
}) {
  const [loaded, setLoaded] = useState(false);
  const [posterSrc, setPosterSrc] = useState(
    `${POSTER_BASE}/${videoId}/maxresdefault.jpg`
  );
  const iframeRef = useRef(null);
  const embedUrl = `${EMBED_BASE}/${videoId}?autoplay=1&rel=0&modestbranding=1`;

  useEffect(() => {
    if (loaded && iframeRef.current) {
      iframeRef.current.focus();
    }
  }, [loaded]);

  return (
    <section className="ed-film editorial-reveal" aria-label="Product walkthrough video">
      <div className="ed-wrap">
        <div className="ed-film-eyebrow">
          <span className="label">Product tour</span>
          <span>Two minutes inside VERA</span>
          <span className="bar" />
          <span className="meta">Watch · {duration}</span>
        </div>

        <h2 className="ed-film-h1">
          See VERA evaluate, <em>end to end</em>
        </h2>

        <p className="ed-film-lede editorial-body">
          From the juror's first PIN to the final outcome attainment report —
          every screen captured in two minutes.
        </p>

        {loaded ? (
          <div className="ed-film-frame">
            <iframe
              ref={iframeRef}
              src={embedUrl}
              title="VERA Product Launch walkthrough"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              loading="lazy"
            />
          </div>
        ) : (
          <button
            type="button"
            className="ed-film-frame ed-film-frame--poster"
            onClick={() => setLoaded(true)}
            aria-label={`Play VERA Product Launch walkthrough (${duration})`}
          >
            <img
              src={posterSrc}
              onError={() => setPosterSrc(`${POSTER_BASE}/${videoId}/hqdefault.jpg`)}
              alt=""
              loading="lazy"
              width="1280"
              height="720"
            />
            <span className="ed-film-play" aria-hidden="true">
              <Play size={36} strokeWidth={2.2} fill="currentColor" />
            </span>
            <span className="ed-film-poster-title">VERA Product Launch · Walkthrough</span>
          </button>
        )}

        <div className="ed-film-foot">
          <span>Click to load video · YouTube · captions available</span>
          <span>↓ Next chapter</span>
        </div>
      </div>
    </section>
  );
}
