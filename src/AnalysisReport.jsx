export default function AnalysisReport({ report, loading, error }) {
  if (!loading && !report && !error) return null

  return (
    <div className="panel-section">
      <div className="panel-title">Movement Analysis</div>

      {loading && (
        <div className="report-loading">
          <div className="report-spinner" />
          <span className="report-loading-text">Analyzing movement data...</span>
        </div>
      )}

      {error && (
        <div className="report-error">
          <span className="label">Error</span>
          <span className="val">{error}</span>
        </div>
      )}

      {report && (
        <div className="report-content">
          <div className="report-score-row">
            <span className="label">OVERALL SCORE</span>
            <span className={`report-score ${report.overall_score >= 80 ? 'score-good' : report.overall_score >= 60 ? 'score-warn' : 'score-bad'}`}>
              {report.overall_score}<span className="score-denom"> / 100</span>
            </span>
          </div>

          {report.summary && (
            <div className="report-summary">"{report.summary}"</div>
          )}

          {report.strengths?.length > 0 && (
            <>
              <div className="report-section-label">Strengths</div>
              {report.strengths.map((s, i) => (
                <div key={i} className="report-item report-strength">
                  <span>✓</span><span>{s}</span>
                </div>
              ))}
            </>
          )}

          {report.improvements?.length > 0 && (
            <>
              <div className="report-section-label">Improvements</div>
              {report.improvements.map((imp, i) => (
                <div key={i} className="report-item report-improvement">
                  <span>→</span><span>{imp}</span>
                </div>
              ))}
            </>
          )}

          {report.priority_fix && (
            <>
              <div className="report-section-label">Priority Fix</div>
              <div className="report-item report-priority">
                <span>⚡</span><span>{report.priority_fix}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
