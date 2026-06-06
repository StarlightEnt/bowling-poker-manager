import sql from '@/lib/db';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const { searchParams } = url;
    const seasonFilter = searchParams.get('season') || 'all';
    const parts = url.pathname.split('/').filter(Boolean);
    const leagueSlug = parts[1];
    const seasonSlug = parts[2];

    const historicalSeasons = await sql`SELECT DISTINCT season_name FROM historical_results`;
    const liveSeasons = await sql`SELECT name AS season_name FROM seasons ORDER BY id ASC`;

    function seasonSortKey(name) {
      const n = name.replace(/[^a-zA-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
      const summerMatch = n.match(/Summer (\d{2})/);
      const fwMatch     = n.match(/Fall Winter (\d{2})/);
      if (summerMatch) return parseInt(summerMatch[1]) * 10 + 5;
      if (fwMatch)     return parseInt(fwMatch[1])     * 10 + 9;
      return 0;
    }

    const allNamesSet = new Set([
      ...historicalSeasons.map(r => r.season_name),
      ...liveSeasons.map(r => r.season_name),
    ]);
    const allSeasonNames = [...allNamesSet].sort((a, b) => seasonSortKey(b) - seasonSortKey(a));

    const historicalRows = seasonFilter === 'all'
      ? await sql`
          SELECT season_name, bowl_date, game_number, winner_name, hand_type,
                 hand_detail, pot_amount, is_progressive_win, progressive_payout, total_payout
          FROM historical_results
          ORDER BY bowl_date DESC, game_number ASC
        `
      : await sql`
          SELECT season_name, bowl_date, game_number, winner_name, hand_type,
                 hand_detail, pot_amount, is_progressive_win, progressive_payout, total_payout
          FROM historical_results
          WHERE season_name = ${seasonFilter}
          ORDER BY bowl_date DESC, game_number ASC
        `;

    const [activeSeason] = await sql`
      SELECT s.id, s.name, s.is_active FROM seasons s
      JOIN leagues l ON l.id = s.league_id
      WHERE l.slug = ${leagueSlug} AND s.slug = ${seasonSlug}
      LIMIT 1
    `;

    let liveRows = [];
    if (activeSeason && (seasonFilter === 'all' || seasonFilter === activeSeason.name)) {
      liveRows = await sql`
        SELECT
          ${activeSeason.name}     AS season_name,
          s.bowl_date,
          gr.game_number,
          b.normalized_name        AS winner_name,
          gr.hand_type,
          gr.hand_detail,
          gr.pot_amount,
          gr.is_progressive_win,
          gr.progressive_payout,
          gr.total_payout
        FROM game_results gr
        JOIN bowlers b  ON b.id = gr.bowler_id
        JOIN schedule s ON s.season_id = gr.season_id
                       AND s.week_number = gr.week_number
        WHERE gr.season_id = ${activeSeason.id}
        ORDER BY s.bowl_date DESC, gr.game_number ASC
      `;
    }

    const gameLog = [...liveRows, ...historicalRows].sort((a, b) => {
      const dateDiff = new Date(b.bowl_date) - new Date(a.bowl_date);
      if (dateDiff !== 0) return dateDiff;
      return a.game_number - b.game_number;
    });

    const leaderMap = {};
    for (const row of gameLog) {
      const name = row.winner_name;
      if (!leaderMap[name]) leaderMap[name] = { name, wins: 0, earnings: 0, progressive_wins: 0 };
      leaderMap[name].wins += 1;
      leaderMap[name].earnings += parseFloat(row.total_payout) || 0;
      if (row.is_progressive_win) leaderMap[name].progressive_wins += 1;
    }
    const leaderboard   = Object.values(leaderMap).sort((a, b) => b.wins - a.wins);
    const topByWins     = [...leaderboard].sort((a, b) => b.wins - a.wins);
    const topByEarnings = [...leaderboard].sort((a, b) => b.earnings - a.earnings);

    const handMap = {};
    for (const row of gameLog) {
      const ht = row.hand_type || 'Unknown';
      handMap[ht] = (handMap[ht] || 0) + 1;
    }
    const totalGames = gameLog.length;
    const handStats = Object.entries(handMap)
      .map(([hand_type, count]) => ({
        hand_type, count,
        pct: totalGames > 0 ? Math.round((count / totalGames) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const distinctDates  = new Set(gameLog.map(r => r.bowl_date?.toString().slice(0, 10)));
    const weeksPlayed    = distinctDates.size;
    const totalEarnings  = gameLog.reduce((s, r) => s + (parseFloat(r.total_payout) || 0), 0);
    const progressiveWins = gameLog.filter(r => r.is_progressive_win).length;

    const allSeasons = await sql`
      SELECT id, name, is_active, charity_seed
      FROM seasons
      ORDER BY id ASC
    `;

    const histCheckins = await sql`
      SELECT season_name, bowl_date, week_number, player_count, pool_amount, charity_amount
      FROM historical_checkins
      ORDER BY bowl_date ASC
    `;

    const charityEntries = await sql`
      SELECT cf.season_id, cf.week_number, cf.transaction_type,
             cf.amount, cf.balance_after, cf.notes,
             s.bowl_date
      FROM charity_fund cf
      JOIN schedule s ON s.season_id = cf.season_id
                     AND s.week_number = cf.week_number
      WHERE cf.transaction_type = 'lock'
      ORDER BY s.bowl_date ASC
    `;

    const donations = await sql`
      SELECT cd.season_id, cd.week_number, cd.amount, cd.notes,
             s.bowl_date
      FROM charitable_donations cd
      JOIN schedule s ON s.season_id = cd.season_id
                     AND s.week_number = cd.week_number
      ORDER BY s.bowl_date ASC
    `;

    const ledgerRows = [];
    let runningBalance = 0;

    const openingSeed = parseFloat(allSeasons.find(s => s.is_active)?.charity_seed || 0);
    if (openingSeed > 0) {
      runningBalance += openingSeed;
      ledgerRows.push({
        type: 'opening',
        season_name: 'Prior seasons',
        week_number: null,
        bowl_date: null,
        description: "Rollover from Fall/Winter '24-'25, Summer '25, Fall/Winter '25-'26",
        amount: openingSeed,
        balance: runningBalance,
        donation: null,
      });
    }

    for (const season of allSeasons) {
      if (season.is_active) {
        const histWeeks = histCheckins.filter(h => h.season_name === season.name);
        for (const wk of histWeeks) {
          const charity = parseFloat(wk.charity_amount || 0);
          const don = donations.find(d => d.season_id === season.id && d.week_number === wk.week_number);
          const weekTotal = charity + (don ? parseFloat(don.amount) : 0);
          runningBalance += weekTotal;
          ledgerRows.push({
            type: 'credit',
            season_name: season.name,
            week_number: wk.week_number,
            bowl_date: wk.bowl_date,
            description: `${wk.player_count} players`,
            amount: weekTotal,
            balance: runningBalance,
            donation: don ? { amount: parseFloat(don.amount), notes: don.notes } : null,
          });
        }

        const liveWeeks = charityEntries.filter(e => e.season_id === season.id);
        for (const entry of liveWeeks) {
          const don = donations.find(d => d.season_id === season.id && d.week_number === entry.week_number);
          const weekTotal = parseFloat(entry.amount);
          runningBalance += weekTotal;

          const [countRow] = await sql`
            SELECT COUNT(*) AS cnt
            FROM checkins c
            JOIN bowlers b ON b.id = c.bowler_id
            WHERE c.season_id = ${season.id}
              AND c.week_number = ${entry.week_number}
              AND b.normalized_name != 'VACANT'
          `;
          const playerCount = parseInt(countRow?.cnt || 0);

          ledgerRows.push({
            type: 'credit',
            season_name: season.name,
            week_number: entry.week_number,
            bowl_date: entry.bowl_date,
            description: `${playerCount} players`,
            amount: weekTotal,
            balance: runningBalance,
            donation: don ? { amount: parseFloat(don.amount), notes: don.notes } : null,
          });
        }
      } else {
        const histWeeks = histCheckins.filter(h => h.season_name === season.name);
        let seasonTotal = 0;
        for (const wk of histWeeks) seasonTotal += parseFloat(wk.charity_amount || 0);
        const liveEntries = charityEntries.filter(e => e.season_id === season.id);
        for (const e of liveEntries) seasonTotal += parseFloat(e.amount);
        const seasonDonations = donations.filter(d => d.season_id === season.id);
        for (const d of seasonDonations) seasonTotal += parseFloat(d.amount);

        if (seasonTotal > 0) {
          runningBalance += seasonTotal;
          ledgerRows.push({
            type: 'season_total',
            season_name: season.name,
            week_number: null,
            bowl_date: null,
            description: 'Season total',
            amount: seasonTotal,
            balance: runningBalance,
            donation: null,
          });
        }
      }
    }

    const charityTotalRaised = runningBalance;
    const charityTotalPaid   = 0;
    const charityBalance     = charityTotalRaised - charityTotalPaid;

    return Response.json({
      seasons: allSeasonNames,
      activeSeason: activeSeason?.name || null,
      summary: { weeksPlayed, totalGames, totalEarnings, progressiveWins },
      topByWins:     topByWins.slice(0, 5),
      topByEarnings: topByEarnings.slice(0, 5),
      leaderboard,
      handStats,
      gameLog,
      charity: {
        totalRaised: charityTotalRaised,
        totalPaid:   charityTotalPaid,
        balance:     charityBalance,
        ledger:      ledgerRows,
      },
    });
  } catch (err) {
    console.error('History GET error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
