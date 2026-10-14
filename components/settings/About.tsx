export function About() {
  return (
    <section className="panel about">
      <h2>About</h2>
      <p>Salesforce Quick Navigator · Version 2.0.0</p>
      <p className="hint">
        Organize links and Orgs by project. Choose Current Org to follow the active Salesforce tab,
        or select a saved target. Open current page asks you to choose an Org before copying its
        route. Environment routes on each link can override Record IDs and paths. Use ↑ / ↓ to
        reorder and enable favorites in Preferences to show ★ on links.
      </p>
      <p className="hint">
        ⌘ Shift Y / Ctrl Shift Y opens the popup. ⌘ Enter / Ctrl Enter saves a form; Esc cancels.
        Configure opening shortcuts at chrome://extensions/shortcuts. Right-click a Salesforce page
        to prepare a link.
      </p>
      <p className="hint">
        From popup search, ↑ / ↓ navigates links and Open current page. Press ↑ immediately after
        opening the popup to focus Open current page, then Enter to choose an Org. ← / → switches
        Orgs, Enter opens, and Esc returns to the previous focus.
      </p>
      <p className="hint">
        Data stays in this browser. No Salesforce API, login automation or session sharing. Record
        availability and permissions depend on the destination Org.
      </p>
    </section>
  );
}
