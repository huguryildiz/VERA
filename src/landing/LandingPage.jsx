import { useEffect } from "react";
import Masthead from "./components/Masthead";
import Hero from "./components/Hero";
import LiveSignal from "./components/LiveSignal";
import FiveSteps from "./components/FiveSteps";
import Lifecycle from "./components/Lifecycle";
import Capabilities from "./components/Capabilities";
import FieldNotes from "./components/FieldNotes";
import CommonQuestions from "./components/CommonQuestions";
import Footer from "./components/Footer";

export function LandingPage() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".editorial-reveal").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="landing landing-editorial">
      <div className="editorial-grid" aria-hidden="true" />

      <Masthead />
      <Hero />
      <LiveSignal />
      <FiveSteps />
      <Lifecycle />
      <Capabilities />
      <FieldNotes />
      <CommonQuestions />
      <Footer />
    </div>
  );
}
