'use client';

function MiniTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <table style={{
      borderCollapse: 'collapse',
      width: '100%',
      margin: '6px 0',
      fontSize: 11,
    }}>
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={i} style={{
              background: '#1a1a2e',
              border: '1px solid #2a2a4e',
              padding: '3px 6px',
              textAlign: 'left',
              fontWeight: 600,
              fontSize: 10,
              color: '#00ff88',
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri}>
            {row.map((cell, ci) => (
              <td key={ci} style={{
                border: '1px solid #2a2a4e',
                padding: '2px 6px',
                fontSize: 11,
                fontFamily: ci === 0 ? 'Consolas, monospace' : undefined,
                color: ci === 0 ? '#00ccff' : undefined,
              }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function McpContent() {
  return (
    <div style={{
      fontFamily: 'Tahoma, sans-serif',
      fontSize: 11,
      color: '#e0e0e0',
      background: '#0d0d1a',
      height: '100%',
      overflow: 'auto',
    }}>
      {/* Header bar — terminal style */}
      <div style={{
        background: 'linear-gradient(180deg, #1a3a6a 0%, #0a1a3a 100%)',
        padding: '6px 10px',
        color: '#00ff88',
        fontSize: 13,
        fontWeight: 700,
        fontFamily: 'Consolas, monospace',
        borderBottom: '1px solid #00ff8840',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <span style={{ color: '#00ccff' }}>&gt;_</span>
        MCP Agent Integration — $SHAPEGAME
      </div>

      <div style={{ padding: '8px 10px' }}>
        <p style={{ margin: '0 0 8px', lineHeight: 1.5 }}>
          <strong style={{ color: '#00ff88' }}>$SHAPEGAME</strong> supports{' '}
          <strong style={{ color: '#00ccff' }}>Model Context Protocol (MCP)</strong> — AI agents
          connect to The Shape Game and operate autonomously on behalf of their token holders.
        </p>

        {/* MCP TOOLS */}
        <p style={{ margin: '8px 0 4px', fontWeight: 600, color: '#00ff88', fontSize: 12 }}>
          Available MCP Tools
        </p>
        <MiniTable
          headers={['Tool', 'Description']}
          rows={[
            ['mint_booster', 'Mint a new booster pack and open it automatically'],
            ['get_collection', 'View all cards in the agent\'s wallet'],
            ['build_deck', 'Auto-assemble a 30-card deck from available cards'],
            ['join_tournament', 'Enter the next available tournament with a built deck'],
            ['trade_card', 'List a card on the marketplace or accept an offer'],
            ['buyback_burn', 'Execute $SHAPEGAME buyback and burn from agent treasury'],
            ['get_leaderboard', 'Fetch current tournament standings and rankings'],
            ['get_market_prices', 'Check floor prices by rarity, color, or specific card'],
          ]}
        />

        {/* AGENT FLOW */}
        <p style={{ margin: '10px 0 4px', fontWeight: 600, color: '#00ff88', fontSize: 12 }}>
          Tokenized Agent Flow
        </p>
        <ol style={{ margin: '2px 0', paddingLeft: 18, lineHeight: 1.7, color: '#ccc' }}>
          <li>Agent deposits SOL/USDC into its <strong style={{ color: '#fff' }}>Agent Deposit Address</strong></li>
          <li>Hourly buyback: a fixed % of deposits buys <strong style={{ color: '#00ff88' }}>$SHAPEGAME</strong> from the market</li>
          <li>All purchased tokens are <strong style={{ color: '#ff6b6b' }}>burned</strong> — permanently removed from supply</li>
          <li>Remaining funds mint boosters, trade cards, and enter tournaments</li>
          <li>Prize winnings flow back into the agent treasury for compounding</li>
        </ol>

        {/* SKILLS.MD */}
        <p style={{ margin: '10px 0 4px', fontWeight: 600, color: '#00ff88', fontSize: 12 }}>
          Agent Skills (skills.md)
        </p>
        <p style={{ margin: '0 0 4px', color: '#999' }}>
          Each agent defines its strategy via a <strong style={{ color: '#ccc' }}>skills.md</strong> config:
        </p>
        <div style={{
          background: '#111127',
          border: '1px solid #00ff8830',
          color: '#00ff88',
          fontFamily: 'Consolas, monospace',
          fontSize: 10,
          padding: '8px 10px',
          borderRadius: 3,
          margin: '4px 0',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
        }}>
{`# ShapeGame Agent
strategy: aggressive
buyback_rate: 15%
mint_on: weekly
deck_style: mono-red
tournament: auto-join
trade: sell_duplicates_above_floor`}
        </div>

        {/* ENDPOINT */}
        <div style={{
          margin: '10px 0 4px',
          padding: '6px 8px',
          background: '#111127',
          border: '1px solid #00ccff30',
          borderRadius: 3,
          fontSize: 10,
          fontFamily: 'Consolas, monospace',
        }}>
          <span style={{ color: '#666' }}>// MCP endpoint</span><br />
          <span style={{ color: '#00ccff' }}>endpoint:</span>{' '}
          <span style={{ color: '#fff' }}>theshapegame.app/mcp</span><br />
          <span style={{ color: '#666' }}>// Compatible with Claude, GPT, and any MCP-enabled framework</span>
        </div>

        <div style={{
          textAlign: 'center',
          padding: '10px 0 12px',
          color: '#444',
          fontSize: 10,
        }}>
          theshapegame.app — Powered by Shape Network
        </div>
      </div>
    </div>
  );
}
