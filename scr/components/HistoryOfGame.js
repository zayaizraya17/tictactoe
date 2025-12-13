import { useEffect, useState } from "react";
import { collection, query, where, limit, getDocs, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";

export default function HistoryOfGame() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState(null);

  useEffect(() => {
    // ждём, пока Firebase отдаст пользователя
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        loadHistory(user.uid);
      } else {
        setUid(null);
        setList([]);
        setLoading(false);
      }
    });
    return unsub; // отписка при размонтировании
  }, []);

  const loadHistory = async (userId) => {
    try {
      const q = query(
        collection(db, "gameHistory"),
        where("playerIds", "array-contains", userId),
        orderBy("endedAtMs", "desc"),
        limit(50)
      );
      
      const snap = await getDocs(q);
      const tmp = snap.docs
        .map((d) => {
          const data = d.data();
          
          // Определяем оппонента
          let opponent = "Bot";
          let opponentName = "Bot";
          let gameType = "bot";
          let playerX = null;
          let playerO = null;
          
          // Обработка старого формата данных
          if (data.players && Array.isArray(data.players)) {
            playerX = data.players[0];
            playerO = data.players[1];
            gameType = "network";
          } 
          // Обработка нового формата данных
          else if (data.playerX && data.playerO) {
            playerX = typeof data.playerX === 'object' ? data.playerX : { nickname: "Player X", uid: data.playerX };
            playerO = typeof data.playerO === 'object' ? data.playerO : { nickname: "Bot", uid: data.playerO };
            gameType = data.type || (playerO.uid === "bot" ? "bot" : "network");
          }
          
          // Определяем кто есть кто
          if (playerX && playerO) {
            const isPlayerX = playerX.uid === userId;
            const isPlayerO = playerO.uid === userId;
            
            if (isPlayerX) {
              opponent = playerO.nickname;
              opponentName = playerO.nickname;
            } else if (isPlayerO) {
              opponent = playerX.nickname;
              opponentName = playerX.nickname;
            }
            
            // Если игра с ботом и пользователь не в данных, корректируем
            if (gameType === "bot" && !isPlayerX && !isPlayerO) {
              opponent = "Bot";
              opponentName = "Bot";
            }
          }
          
          // Определяем результат
          let result = "draw";
          if (data.winner === userId) {
            result = "win";
          } else if (data.winner === "bot") {
            result = "loss";
          } else if (data.winner && data.winner !== userId) {
            result = "loss";
          }
          
          return {
            id: d.id,
            date: data.endedAt?.toDate?.() || 
                  (data.endedAtMs ? new Date(data.endedAtMs) : new Date()),
            result: result,
            opponent: opponent,
            opponentName: opponentName,
            gameType: gameType,
            playerX: playerX,
            playerO: playerO,
            winner: data.winner
          };
        })
        .sort((a, b) => b.date - a.date);
      setList(tmp);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="history-wrap">
        <h2>History of games</h2>
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <div className="loading-text">Download game history...</div>
        </div>
      </div>
    );
  }

  if (!uid) {
    return (
      <div className="history-wrap">
        <h2>History of games</h2>
        <p className="auth-message">Log in to account to see history</p>
      </div>
    );
  }

  return (
    <div className="history-wrap">
      <h2>History of games</h2>
      {list.length === 0 ? (
        <p className="empty-message">You haven't played yet</p>
      ) : (
        <table className="history-table">
          <thead>
            <tr>
              <th>Date and time</th>
              <th>Opponent</th>
              <th>Mode</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {list.map((g) => {
              // Определяем отображаемое имя оппонента
              let opponentDisplay = g.opponentName || "Unknown";
              if (g.gameType === "bot" && g.opponentName === "Bot") {
                opponentDisplay = "Bot";
              }
              
              return (
                <tr key={g.id}>
                  <td>
                    {g.date.toLocaleString("ru-RU", {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="opponent-cell">
                    {g.gameType === 'bot' ? (
                      <span className="opponent-bot">🤖 {opponentDisplay}</span>
                    ) : (
                      <span className="opponent-player">👤 {opponentDisplay}</span>
                    )}
                  </td>
                  <td>
                    <span className={`game-mode-badge ${g.gameType}`}>
                      {g.gameType === 'bot' ? '🤖 Bot' : '🌐 Network'}
                    </span>
                  </td>
                  <td className={`result ${g.result}`}>
                    {g.result === "win"
                      ? "Win"
                      : g.result === "loss"
                      ? "Loss"
                      : "Draw"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
