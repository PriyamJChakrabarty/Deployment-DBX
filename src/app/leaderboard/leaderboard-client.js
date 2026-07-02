"use client";

import { useState } from "react";

const C = {
  bg:     "#0d1a1f",
  card:   "#0e191f",
  border: "rgba(201,214,218,0.07)",
  green:  "#3ddc84",
  cyan:   "#22d3ee",
  amber:  "#f5b942",
  gold:   "#f5c518",
  silver: "#adb5bd",
  bronze: "#cd7f32",
  text:   "#e8f0f3",
  sub:    "#8ba0a6",
  muted:  "#4a6570",
};

const RANK_COLORS = [C.gold, C.silver, C.bronze];
const RANK_LABELS = ["1ST", "2ND", "3RD"];

function dname(row) {
  const full = [row.firstName, row.lastName].filter(Boolean).join(" ").trim();
  return row.username || full || "Anonymous";
}

function PlayerRow({ row, valueKey, valueLabel, valueColor }) {
  const { rank, isMe } = row;
  const top3 = rank <= 3 && !isMe;
  const rc   = isMe ? C.green : top3 ? RANK_COLORS[rank - 1] : C.muted;
  const name = dname(row);
  const value = row[valueKey] ?? 0;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "14px",
      background: isMe
        ? "rgba(61,220,132,0.08)"
        : top3 ? `${rc}09` : C.card,
      border: `1px solid ${isMe
        ? "rgba(61,220,132,0.35)"
        : top3 ? rc + "28" : C.border}`,
      borderRadius: "10px", padding: "12px 18px",
      boxShadow: rank === 1 && !isMe ? `0 0 28px ${rc}14` : isMe ? "0 0 20px rgba(61,220,132,0.12)" : "none",
    }}>
      <div style={{
        width: "32px", flexShrink: 0, textAlign: "center",
        fontSize: top3 ? "10px" : "12px", fontWeight: 800,
        color: rc, letterSpacing: "0.04em",
      }}>
        {top3 ? RANK_LABELS[rank - 1] : `#${rank}`}
      </div>
      <div style={{
        width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0,
        background: isMe
          ? "rgba(61,220,132,0.2)"
          : `linear-gradient(135deg, ${rc}40, ${rc}14)`,
        border: `1.5px solid ${isMe ? "rgba(61,220,132,0.5)" : rc + "38"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "13px", fontWeight: 700, color: isMe ? C.green : rc,
      }}>
        {name.charAt(0).toUpperCase()}
      </div>
      <div style={{
        flex: 1, fontSize: "13px", fontWeight: isMe ? 700 : 600,
        color: isMe ? C.green : C.text,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {name}{isMe && <span style={{ fontSize: "10px", color: "rgba(61,220,132,0.7)", marginLeft: "8px", fontWeight: 600 }}>You</span>}
      </div>
      <div style={{ flexShrink: 0, textAlign: "right" }}>
        <div style={{ fontSize: "17px", fontWeight: 800, color: isMe ? C.green : top3 ? rc : (valueColor || C.green), lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: "10px", color: C.muted, marginTop: "2px" }}>{valueLabel}</div>
      </div>
    </div>
  );
}

function MyRankDivider({ rank }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "12px 0 8px" }}>
      <div style={{ flex: 1, height: "1px", background: "rgba(61,220,132,0.15)" }} />
      <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(61,220,132,0.5)", letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
        Your rank · #{rank}
      </span>
      <div style={{ flex: 1, height: "1px", background: "rgba(61,220,132,0.15)" }} />
    </div>
  );
}

function Section({ icon, title, subtitle, data, valueKey, valueLabel, valueColor }) {
  const { rows, myEntry } = data;

  return (
    <div style={{ marginBottom: "52px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
        <span style={{ fontSize: "22px" }}>{icon}</span>
        <div>
          <div style={{ fontSize: "11px", fontWeight: 800, color: C.sub, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {title}
          </div>
          <div style={{ fontSize: "12px", color: C.muted, marginTop: "2px" }}>{subtitle}</div>
        </div>
      </div>

      {rows.length === 0 && !myEntry ? (
        <div style={{
          padding: "28px", textAlign: "center", color: C.muted, fontSize: "13px",
          background: "rgba(14,25,31,0.6)", borderRadius: "10px", border: `1px solid ${C.border}`,
        }}>
          No data yet — be the first on this board.
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {rows.map((row) => (
              <PlayerRow key={row.id} row={row} valueKey={valueKey} valueLabel={valueLabel} valueColor={valueColor} />
            ))}
          </div>
          {myEntry && (
            <>
              <MyRankDivider rank={myEntry.rank} />
              <PlayerRow row={myEntry} valueKey={valueKey} valueLabel={valueLabel} valueColor={valueColor} />
            </>
          )}
        </>
      )}
    </div>
  );
}

function TeamRow({ team, valueColor }) {
  const { rank, isMyTeam } = team;
  const top3 = rank <= 3 && !isMyTeam;
  const rc   = isMyTeam ? C.green : top3 ? RANK_COLORS[rank - 1] : C.muted;
  const total = (team.wins || 0) + (team.losses || 0);
  const wr  = total > 0 ? Math.round((team.wins / total) * 100) : 0;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "14px",
      background: isMyTeam
        ? "rgba(61,220,132,0.08)"
        : top3 ? `${rc}09` : C.card,
      border: `1px solid ${isMyTeam
        ? "rgba(61,220,132,0.35)"
        : top3 ? rc + "28" : C.border}`,
      borderRadius: "10px", padding: "14px 18px",
      boxShadow: rank === 1 && !isMyTeam ? `0 0 28px ${rc}14` : isMyTeam ? "0 0 20px rgba(61,220,132,0.12)" : "none",
    }}>
      <div style={{
        width: "32px", flexShrink: 0, textAlign: "center",
        fontSize: top3 ? "10px" : "12px", fontWeight: 800,
        color: rc, letterSpacing: "0.04em",
      }}>
        {top3 ? RANK_LABELS[rank - 1] : `#${rank}`}
      </div>
      <div style={{ fontSize: "22px", flexShrink: 0 }}>{team.emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: "13px", fontWeight: isMyTeam ? 700 : 600,
          color: isMyTeam ? C.green : C.text,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          {team.name}
          {isMyTeam && <span style={{ fontSize: "10px", color: "rgba(61,220,132,0.7)", fontWeight: 600 }}>You</span>}
        </div>
        <div style={{ fontSize: "11px", color: C.muted, marginTop: "2px" }}>
          {team.wins}W – {team.losses}L · {wr}% win rate
        </div>
      </div>
      <div style={{ flexShrink: 0, textAlign: "right" }}>
        <div style={{ fontSize: "17px", fontWeight: 800, color: isMyTeam ? C.green : top3 ? rc : (valueColor || C.amber), lineHeight: 1 }}>
          {team.wins}
        </div>
        <div style={{ fontSize: "10px", color: C.muted, marginTop: "2px" }}>wins</div>
      </div>
    </div>
  );
}

export default function LeaderboardClient({ trophies, duelWins, groupWins, teamRankings }) {
  const [tab, setTab] = useState("individual");
  const { rows: teamRows, myEntry: myTeamEntry } = teamRankings;

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginBottom: "52px" }}>
        {[
          { id: "individual", label: "Individual", icon: "👤" },
          { id: "teams",      label: "Teams",      icon: "🛡️" },
        ].map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              background: tab === id ? "rgba(61,220,132,0.1)" : "transparent",
              border: `1px solid ${tab === id ? "rgba(61,220,132,0.35)" : C.border}`,
              color: tab === id ? C.green : C.sub,
              padding: "9px 28px", borderRadius: "9px",
              fontSize: "13px", fontWeight: tab === id ? 700 : 400,
              cursor: "pointer",
              display: "flex", alignItems: "center", gap: "7px",
              transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: "15px" }}>{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {tab === "individual" ? (
        <div>
          <Section
            icon="🏆" title="Trophies" subtitle="Best score achieved in a single match"
            data={trophies} valueKey="bestScore" valueLabel="pts"
          />
          <Section
            icon="⚔️" title="Wins" subtitle="1v1 duel victories"
            data={duelWins} valueKey="count" valueLabel="wins" valueColor={C.cyan}
          />
          <Section
            icon="🛡️" title="Group Wins" subtitle="Group raid victories"
            data={groupWins} valueKey="count" valueLabel="wins" valueColor={C.amber}
          />
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
            <span style={{ fontSize: "22px" }}>🏅</span>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 800, color: C.sub, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Team Rankings
              </div>
              <div style={{ fontSize: "12px", color: C.muted, marginTop: "2px" }}>
                Pre-formed teams ranked by raid victories
              </div>
            </div>
          </div>

          {teamRows.length === 0 && !myTeamEntry ? (
            <div style={{
              padding: "48px 24px", textAlign: "center", color: C.muted, fontSize: "13px",
              background: "rgba(14,25,31,0.6)", borderRadius: "10px", border: `1px solid ${C.border}`,
            }}>
              No teams have competed yet.
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {teamRows.map((team) => <TeamRow key={team.id} team={team} />)}
              </div>
              {myTeamEntry && (
                <>
                  <MyRankDivider rank={myTeamEntry.rank} />
                  <TeamRow team={myTeamEntry} />
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
