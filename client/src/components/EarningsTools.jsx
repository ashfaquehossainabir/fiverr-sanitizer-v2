import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { IconTarget, IconCalc } from "./icons.jsx";

const money = (n) => Math.round(n).toLocaleString();
const money2 = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ---------------------------- Monthly goal ---------------------------- */

export function GoalCard({ earnedThisMonth = 0 }) {
  const { user, updateGoal } = useAuth();
  const { notify } = useToast();
  const goal = user?.monthlyGoal || 0;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const stats = useMemo(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = Math.max(1, lastDay - now.getDate() + 1);
    const remaining = Math.max(0, goal - earnedThisMonth);
    return {
      pct: goal > 0 ? Math.min(100, Math.round((earnedThisMonth / goal) * 100)) : 0,
      remaining,
      daysLeft,
      perDay: remaining / daysLeft,
      month: now.toLocaleDateString(undefined, { month: "long" })
    };
  }, [goal, earnedThisMonth]);

  const startEdit = () => {
    setValue(goal ? String(goal) : "");
    setEditing(true);
  };

  const save = async (e) => {
    e.preventDefault();
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      notify("Enter a positive number.", { tone: "error" });
      return;
    }
    setSaving(true);
    try {
      await updateGoal(n);
      setEditing(false);
      notify(n > 0 ? "Monthly goal saved" : "Monthly goal cleared");
    } catch (err) {
      notify(err.response?.data?.message || "Could not save your goal.", { tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="overview-card tool-card">
      <div className="tool-card-head">
        <h3>
          <IconTarget size={16} /> {stats.month} goal
        </h3>
        {goal > 0 && !editing && (
          <button type="button" className="link-btn" onClick={startEdit}>
            Edit
          </button>
        )}
      </div>

      {editing || goal === 0 ? (
        <form className="goal-form" onSubmit={save}>
          <p className="muted">
            {goal === 0 ? "Set a monthly earnings target and track it from your completed orders." : "Update your target."}
          </p>
          <div className="goal-input-row">
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              placeholder="e.g. 2000"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-label="Monthly earnings goal"
            />
            <button type="submit" className="btn-primary btn-sm" disabled={saving || value === ""}>
              {saving ? "Saving…" : "Save goal"}
            </button>
            {goal > 0 && (
              <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(false)}>
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <>
          <div className="goal-figures">
            <strong>{money(earnedThisMonth)}</strong>
            <span>of {money(goal)}</span>
            <em>{stats.pct}%</em>
          </div>
          <div className="goal-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={stats.pct} aria-label="Progress toward monthly goal">
            <span style={{ width: `${stats.pct}%` }} />
          </div>
          <p className="muted goal-caption">
            {stats.remaining === 0
              ? "Goal reached. Everything from here is a bonus."
              : `${money(stats.remaining)} to go · about ${money(stats.perDay)} a day for the next ${stats.daysLeft} day${stats.daysLeft === 1 ? "" : "s"}.`}
          </p>
        </>
      )}
    </section>
  );
}

/* ---------------------------- Offer calculator ---------------------------- */

const FEE_KEY = "sanitizer_fee_pct";

function readFee() {
  try {
    const v = Number(localStorage.getItem(FEE_KEY));
    return Number.isFinite(v) && v > 0 && v < 100 ? v : 20;
  } catch {
    return 20;
  }
}

// Two-way: type what the buyer pays, or what you want to take home, and the other follows.
export function OfferCalculator() {
  const [fee, setFee] = useState(readFee);
  const [price, setPrice] = useState("");
  const [receive, setReceive] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(FEE_KEY, String(fee));
    } catch {
      /* not persisted */
    }
  }, [fee]);

  const factor = 1 - fee / 100;

  const onPrice = (v) => {
    setPrice(v);
    const n = Number(v);
    setReceive(v === "" || !Number.isFinite(n) ? "" : String(Math.round(n * factor * 100) / 100));
  };

  const onReceive = (v) => {
    setReceive(v);
    const n = Number(v);
    setPrice(v === "" || !Number.isFinite(n) ? "" : String(Math.round((n / factor) * 100) / 100));
  };

  const onFee = (v) => {
    const n = Math.min(60, Math.max(0, Number(v) || 0));
    setFee(n);
    const f = 1 - n / 100;
    const p = Number(price);
    if (price !== "" && Number.isFinite(p)) setReceive(String(Math.round(p * f * 100) / 100));
  };

  const priceN = Number(price) || 0;

  return (
    <section className="overview-card tool-card">
      <div className="tool-card-head">
        <h3>
          <IconCalc size={16} /> Offer calculator
        </h3>
      </div>
      <p className="muted">Quote custom offers with the marketplace fee already counted.</p>

      <div className="calc-grid">
        <label>
          <span>Buyer pays</span>
          <input type="number" min="0" step="any" inputMode="decimal" placeholder="0.00" value={price} onChange={(e) => onPrice(e.target.value)} />
        </label>
        <label>
          <span>You receive</span>
          <input type="number" min="0" step="any" inputMode="decimal" placeholder="0.00" value={receive} onChange={(e) => onReceive(e.target.value)} />
        </label>
        <label className="calc-fee">
          <span>Fee %</span>
          <input type="number" min="0" max="60" step="any" inputMode="decimal" value={fee} onChange={(e) => onFee(e.target.value)} />
        </label>
      </div>

      <p className="calc-result">
        {priceN > 0 ? (
          <>
            Fee: <strong>{money2(priceN * (fee / 100))}</strong> · Take-home: <strong>{money2(priceN * factor)}</strong>
          </>
        ) : (
          <span className="muted">Enter an amount in either box. Adjust the fee % if yours differs.</span>
        )}
      </p>
    </section>
  );
}
