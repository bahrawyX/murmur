/** all site copy in reading order for screen readers — the canvas is aria-hidden */
export function SrArticle() {
  return (
    <article className="sr-only">
      <h1>Murmur — a digital studio</h1>
      <p>A thousand small decisions, moving as one.</p>
      <h2>The studio</h2>
      <p>We start every project closed — all questions, no answers.</p>
      <p>Research is pressure. Somewhere in the middle, it gives.</p>
      <p>
        What ships is the open thing: obvious in hindsight, impossible to fold
        back.
      </p>
      <h2>Selected work</h2>
      <ul>
        <li>Night garden — an ambient companion app grown around sleep.</li>
        <li>Chorus — crowd-composed concert visuals, rendered live.</li>
        <li>Field notes — a mapping tool for wildlife researchers.</li>
      </ul>
      <h2>Craft</h2>
      <p>Everything above this line is two thousand pieces agreeing.</p>
      <h2>Begin</h2>
      <p>
        Shall we move together? <a href="mailto:hello@murmur.studio">Begin a project</a>.
      </p>
      <p>Murmur studio, Cairo.</p>
    </article>
  )
}
