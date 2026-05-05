export default function Footer() {
  return (
    <footer className="ed-footer">
      <div className="ed-footer-inner">
        <div className="ed-footer-left">
          <span className="ed-footer-copy">&copy; 2026</span>
          <span className="ed-footer-dot">&middot;</span>
          <span className="ed-footer-brand">VERA</span>
          <span className="ed-footer-dot">&middot;</span>
          <span>Visual Evaluation &middot; Reporting &middot; Analytics</span>
        </div>
        <span className="ed-footer-bar" />
        <div className="ed-footer-right">
          <span>Designed &amp; built by</span>
          <span className="ed-footer-dot">&middot;</span>
          <a href="https://huguryildiz.com" target="_blank" rel="noopener noreferrer">
            H&uuml;seyin U&#287;ur Y&#305;ld&#305;z
          </a>
        </div>
      </div>
    </footer>
  );
}
