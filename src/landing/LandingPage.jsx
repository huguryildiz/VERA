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
  return (
    <div className="landing landing-editorial">
      <div className="editorial-grid" aria-hidden="true" />
      <span className="ed-corner ed-corner--tl" aria-hidden="true" />
      <span className="ed-corner ed-corner--tr" aria-hidden="true" />
      <span className="ed-corner ed-corner--bl" aria-hidden="true" />
      <span className="ed-corner ed-corner--br" aria-hidden="true" />

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
