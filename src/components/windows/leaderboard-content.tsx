'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { XpGroupBox } from '@/components/xp';
import type { LeaderboardEntry } from '@/types/cards';

interface LeaderboardData {
  leaders: LeaderboardEntry[];
  user_rank: { rank: number; total_cards: number; unique_cards: number; score: number } | null;
  total_players: number;
}

function getRankIcon(rank: number) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

export function LeaderboardContent() {
  const { publicKey } = useWallet();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const walletAddr = useMemo(() => publicKey?.toBase58() ?? null, [publicKey]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const url = walletAddr
        ? `/api/leaderboard?wallet=${walletAddr}`
        : '/api/leaderboard';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load');
      const json: LeaderboardData = await res.json();
      setData(json);
      setError(null);
    } catch {
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [walletAddr]);

  // Initial fetch + auto-refresh every 60s
  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 60_000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  const leaders = data?.leaders ?? [];
  const top3 = leaders.slice(0, 3);

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-[40px] bg-[#e0e0e0] rounded-sm" />
        <div className="flex items-end justify-center gap-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="border border-[#ccc] bg-[#f0f0f0] p-3 w-28 h-24 rounded-sm" />
          ))}
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-[28px] bg-[#e8e8e8] rounded-sm" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-[12px] text-[#cc0000] mb-2">{error}</p>
        <button onClick={fetchLeaderboard} className="xp-button px-4 py-1 text-[11px]">
          Retry
        </button>
      </div>
    );
  }

  // ── Empty state ──
  if (leaders.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-3xl mb-2">🏆</div>
        <p className="text-[12px] text-[#666]">No mints yet. Be the first!</p>
      </div>
    );
  }

  return (
    <div>
      {/* Scoring info */}
      <XpGroupBox label="Scoring">
        <div className="flex items-center gap-3 flex-wrap text-[11px]">
          <span><span className="font-bold text-[#808080]">Common</span> = 10</span>
          <span><span className="font-bold text-[#22c55e]">Uncommon</span> = 25</span>
          <span><span className="font-bold text-[#3b82f6]">Rare</span> = 50</span>
          <span><span className="font-bold text-[#8b5cf6]">Epic</span> = 200</span>
          <span><span className="font-bold text-[#eab308]">Legendary</span> = 1000</span>
        </div>
      </XpGroupBox>

      {/* Your rank */}
      {walletAddr && (
        <div className="xp-infobar mt-3">
          <span className="text-lg">👤</span>
          <div>
            <span className="font-bold">Your Rank:</span>{' '}
            <span className="font-mono text-[10px]">{shortAddr(walletAddr)}</span>{' '}
            {data?.user_rank ? (
              <span className="text-[#003399] font-bold">
                — #{data.user_rank.rank} · {data.user_rank.score.toLocaleString()} pts · {data.user_rank.total_cards} cards
              </span>
            ) : (
              <span className="text-[#888]">— Not ranked yet. Mint packs to start!</span>
            )}
          </div>
        </div>
      )}

      {/* Top 3 podium */}
      {top3.length >= 3 && (
        <div className="mt-3 flex items-end justify-center gap-3">
          {/* 2nd place */}
          <div className="border border-[#919b9c] bg-[#f5f3ee] p-3 text-center w-28">
            <div className="text-2xl mb-1">🥈</div>
            <div className="font-mono text-[10px] text-[#666]">{shortAddr(top3[1].wallet_address)}</div>
            {top3[1].twitter_handle && (
              <div className="text-[10px] text-[#0066cc]">@{top3[1].twitter_handle}</div>
            )}
            <div className="text-[13px] font-bold text-[#003399] mt-1">{top3[1].score.toLocaleString()}</div>
            <div className="text-[10px] text-[#888]">{top3[1].total_cards} cards</div>
          </div>
          {/* 1st place */}
          <div className="border-2 border-[#eab308] bg-[#fffbe6] p-3 text-center w-32 -mb-1">
            <div className="text-3xl mb-1">🥇</div>
            <div className="font-mono text-[10px] text-[#666]">{shortAddr(top3[0].wallet_address)}</div>
            {top3[0].twitter_handle && (
              <div className="text-[10px] text-[#0066cc]">@{top3[0].twitter_handle}</div>
            )}
            <div className="text-[14px] font-bold text-[#b8860b] mt-1">{top3[0].score.toLocaleString()}</div>
            <div className="text-[10px] text-[#888]">{top3[0].total_cards} cards</div>
          </div>
          {/* 3rd place */}
          <div className="border border-[#919b9c] bg-[#f5f3ee] p-3 text-center w-28">
            <div className="text-2xl mb-1">🥉</div>
            <div className="font-mono text-[10px] text-[#666]">{shortAddr(top3[2].wallet_address)}</div>
            {top3[2].twitter_handle && (
              <div className="text-[10px] text-[#0066cc]">@{top3[2].twitter_handle}</div>
            )}
            <div className="text-[13px] font-bold text-[#003399] mt-1">{top3[2].score.toLocaleString()}</div>
            <div className="text-[10px] text-[#888]">{top3[2].total_cards} cards</div>
          </div>
        </div>
      )}

      {/* Full table */}
      <div className="xp-listview mt-4">
        <div className="xp-listview-header grid grid-cols-12 gap-1">
          <span className="col-span-1">Rank</span>
          <span className="col-span-4">Collector</span>
          <span className="col-span-2 text-center">Cards</span>
          <span className="col-span-2 text-center">Rare+</span>
          <span className="col-span-3 text-right">Score</span>
        </div>
        {leaders.map((leader) => (
          <div
            key={leader.wallet_address}
            className={`xp-listview-row grid grid-cols-12 gap-1 items-center ${
              leader.rank <= 3 ? 'font-bold' : ''
            } ${walletAddr === leader.wallet_address ? 'bg-[#e8f0fe]' : ''}`}
          >
            <span className="col-span-1">{getRankIcon(leader.rank)}</span>
            <div className="col-span-4 truncate">
              <span className="font-mono text-[10px]">{shortAddr(leader.wallet_address)}</span>
              {leader.twitter_handle && (
                <span className="text-[10px] text-[#0066cc] ml-1">@{leader.twitter_handle}</span>
              )}
            </div>
            <span className="col-span-2 text-center">{leader.total_cards}</span>
            <span className="col-span-2 text-center">
              {leader.legendaries > 0 && (
                <span style={{ color: '#eab308' }}>{leader.legendaries}L </span>
              )}
              {leader.epics > 0 && (
                <span style={{ color: '#8b5cf6' }}>{leader.epics}E </span>
              )}
              {leader.rares > 0 && (
                <span style={{ color: '#3b82f6' }}>{leader.rares}R</span>
              )}
              {leader.legendaries === 0 && leader.epics === 0 && leader.rares === 0 && (
                <span className="text-[#ccc]">—</span>
              )}
            </span>
            <span className="col-span-3 text-right font-bold text-[#003399]">
              {leader.score.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-3 text-center text-[10px] text-[#999]">
        {data?.total_players ?? 0} collectors · Updates every 30s
      </div>
    </div>
  );
}
