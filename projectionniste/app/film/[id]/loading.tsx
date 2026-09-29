export default function Loading() {
  return (
    <div className="film-inner nobg" aria-busy="true">
      <div className="ov-grid">
        <div className="poster-wrap">
          <div className="poster sk" />
        </div>
        <div>
          <div className="sk sk-line w40" />
          <div className="sk" style={{ height: 64, margin: "14px 0", maxWidth: 560 }} />
          <div className="sk sk-line w60" />
          <div className="sk" style={{ height: 70, margin: "24px 0" }} />
          <div className="sk sk-line w80" />
          <div className="sk sk-line w80" />
          <div className="sk sk-line w60" />
        </div>
      </div>
    </div>
  );
}
