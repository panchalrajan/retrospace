import Link from "next/link";

export function RetrospaceBrand() {
  return (
    <Link className="retrospace-brand" href="/" aria-label="Retrospace home">
      <span className="retrospace-brand-mark" aria-hidden="true" />
      <span>
        retrospace<span className="retrospace-brand-period">.</span>
      </span>
    </Link>
  );
}
