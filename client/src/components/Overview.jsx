import { useEffect, useState } from "react";
import api from "../api/axios.js";
import Loader from "./Loader.jsx";
import { GoalCard, OfferCalculator } from "./EarningsTools.jsx";
import { daysUntil, formatDay } from "../lib/dates.js";
import { formatCompact } from "../lib/formatNumber.js";

function Stat({ label, value, hint }) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}

const fmtDate = (d) => formatDay(d);

export default function Overview({ refreshKey, onOpenClients, onError }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Send our UTC offset so the server buckets days and the month in our timezone.
        const res = await api.get("/insights", { params: { tzOffset: new Date().getTimezoneOffset() } });
        if (!cancelled) setData(res.data);
      } catch (err) {
        onError?.(err.response?.data?.message || "Could not load your overview.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, onError]);

  const exportData = async () => {
    try {
      const res = await api.get("/export", { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sanitizer-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      onError?.(err.response?.data?.message || "Export failed.");
    }
  };

  if (!data) return <Loader label="Loading your overview" />;

  // Same rule as the sidebar badge and Today strip: due today or earlier.
  const dueFollowUps = data.dueFollowUps.filter((c) => daysUntil(c.followUpAt) <= 0);
  const max = Math.max(1, ...data.perDay.map((d) => d.count));
  const delta = data.week.thisWeek - data.week.lastWeek;

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>Overview</h2>
          <p className="panel-sub">Your week at a glance.</p>
        </div>
        <button type="button" className="btn-ghost" onClick={exportData}>⬇ Export backup</button>
      </div>

      <div className="stat-grid">
        <Stat label="Messages saved" value={formatCompact(data.totals.messages)} hint={`${formatCompact(data.totals.pinned)} pinned`} />
        <Stat
          label="This week"
          value={formatCompact(data.week.thisWeek)}
          hint={delta === 0 ? "same as last week" : `${delta > 0 ? "+" : ""}${formatCompact(delta)} vs last week`}
        />
        <Stat label="Open orders" value={formatCompact(data.pipeline.openCount)} hint={`${formatCompact(data.pipeline.pipelineValue)} in pipeline`} />
        <Stat label="Completed value" value={formatCompact(data.pipeline.earned)} hint="from completed orders" />
      </div>

      <div className="overview-cols overview-tools">
        <GoalCard earnedThisMonth={data.pipeline.earnedThisMonth || 0} />
        <OfferCalculator />
      </div>

      <div className="overview-cols">
        <section className="overview-card">
          <h3>Messages · last 14 days</h3>
          <div className="spark" role="img" aria-label="Messages saved per day">
            {data.perDay.map((d) => (
              <div className="spark-col" key={d.date} title={`${fmtDate(d.date)}: ${d.count}`}>
                <div className="spark-bar" style={{ height: `${Math.max(6, (d.count / max) * 100)}%`, opacity: d.count ? 1 : 0.25 }} />
              </div>
            ))}
          </div>
          <div className="spark-labels">
            <span>{fmtDate(data.perDay[0].date)}</span>
            <span>Today</span>
          </div>
        </section>

        <section className="overview-card">
          <h3>Follow-ups due</h3>
          {dueFollowUps.length === 0 ? (
            <p className="muted">You are all caught up. 🎉</p>
          ) : (
            <ul className="mini-list">
              {dueFollowUps.map((c) => (
                <li key={c._id}>
                  <button type="button" onClick={onOpenClients}>
                    <strong>{c.name}</strong>
                    <span>{c.project || "No project"} · {fmtDate(c.followUpAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="overview-card">
          <h3>Upcoming deadlines</h3>
          {data.upcomingDeadlines.length === 0 ? (
            <p className="muted">No deadlines set.</p>
          ) : (
            <ul className="mini-list">
              {data.upcomingDeadlines.map((c) => (
                <li key={c._id}>
                  <button type="button" onClick={onOpenClients}>
                    <strong>{c.name}</strong>
                    <span>{c.project || "No project"} · {fmtDate(c.deadline)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="overview-card">
          <h3>Most used templates</h3>
          {data.topTemplates.length === 0 || data.topTemplates[0].usageCount === 0 ? (
            <p className="muted">Use a template and it will show up here.</p>
          ) : (
            <ul className="mini-list">
              {data.topTemplates.filter((t) => t.usageCount > 0).map((t) => (
                <li key={t._id}><div><strong>{t.title}</strong><span>{formatCompact(t.usageCount)} uses</span></div></li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
