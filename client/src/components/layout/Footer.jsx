function Footer() {
  return (
    <footer className="fixed bottom-0 left-64 right-0 h-10 bg-surface-container border-t border-outline-variant z-30 px-gutter-lg flex items-center justify-between text-on-surface-variant">
      <div className="font-data-mono-md text-body-sm text-on-surface-variant">
        DHRUV | National Centre for Polar and Ocean Research
        (Ministry of Earth Sciences, Govt of India)
      </div>

      <div className="flex items-center gap-gutter-md font-body-sm text-body-sm">
        <a
          className="text-on-surface-variant hover:text-on-surface"
          href="#"
        >
          Terms of Use
        </a>

        <span>|</span>

        <a
          className="text-on-surface-variant hover:text-on-surface"
          href="#"
        >
          Data Handling and Privacy
        </a>
      </div>
    </footer>
  );
}

export default Footer;