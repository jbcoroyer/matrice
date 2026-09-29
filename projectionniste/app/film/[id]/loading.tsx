export default function Loading() {
  return (
    <div className="film-grid" aria-busy="true">
      <div className="poster-wrap">
        <div className="poster sk" />
      </div>
      <div>
        <div className="sk" style={{ height: 34, margin: "0 0 12px", maxWidth: 420 }} />
        <div className="sk sk-line w40" />
        <div className="sk" style={{ height: 60, margin: "20px 0" }} />
        <div className="sk sk-line w80" />
        <div className="sk sk-line w80" />
        <div className="sk sk-line w60" />
      </div>
    </div>
  );
}
