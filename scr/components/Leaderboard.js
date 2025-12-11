import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

function Leaderboard() {
  const [topPlayers, setTopPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        console.log("🔄 Leaderboard: Loading data...");

        const q = query(
          collection(db, "users"),
          orderBy("score", "desc"),
          limit(10)
        );

        const snapshot = await getDocs(q);
        console.log("📊 Leaderboard: Data received", snapshot.docs.length);

        if (snapshot.empty) {
          console.log("📭 Leaderboard: No data available");
          setTopPlayers([]);
        } else {
          const players = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.nickname || "Anonymous",
              score: data.score || 0,
              totalGames: data.totalGames || 0,
              wins: data.wins || 0,
              losses: data.losses || 0,
              draws: data.draws || 0,
            };
          });
          console.log("✅ Leaderboard: Setting players", players.length);
          setTopPlayers(players);
        }
      } catch (error) {
        console.error("❌ Leaderboard: Error", error);
        setTopPlayers([]);
      } finally {
        setLoading(false); // Теперь loading=false только после всего
      }
    };

    loadLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="leaderboard">
        <h2>🏆 Leaderboard</h2>
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading leaderboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard">
      <h2>🏆 Leaderboard</h2>
      {topPlayers.length === 0 ? (
        <p>No games played yet! Be the first!</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Score</th>
              <th>Games</th>
              <th>Wins</th>
              <th>Losses</th>
              <th>Draws</th>
            </tr>
          </thead>
          <tbody>
            {topPlayers.map((player, index) => (
              <tr
                key={player.id}
                className={index < 3 ? `top-${index + 1}` : ""}
              >
                <td>#{index + 1}</td>
                <td className="player-name">{player.name}</td>
                <td className="score">{player.score}</td>
                <td>{player.totalGames}</td>
                <td className="wins">{player.wins}</td>
                <td className="losses">{player.losses}</td>
                <td className="draws">{player.draws}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Leaderboard;
