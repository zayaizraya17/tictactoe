import { useState, useEffect } from "react";
import { auth } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

function AccountInfa() {
  const [currentUser, setCurrentUser] = useState({ nickname: "Guest" });
  const [stats, setStats] = useState({
    totalGames: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    score: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubDoc = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed:", user?.uid);

      if (!user) {
        setCurrentUser({ nickname: "Guest" });
        setStats({ totalGames: 0, wins: 0, losses: 0, draws: 0, score: 0 });
        setLoading(false);

        // Отписываемся от предыдущего документа
        if (unsubDoc) {
          unsubDoc();
          unsubDoc = null;
        }
        return;
      }

      const nickname = user.displayName || "Guest";
      setCurrentUser({ nickname, uid: user.uid });

      const userDocRef = doc(db, "users", user.uid);
      console.log("Subscribing to user document:", user.uid);

      // Отписываемся от предыдущего документа перед подпиской на новый
      if (unsubDoc) {
        unsubDoc();
      }

      // Подписываемся на документ пользователя
      unsubDoc = onSnapshot(
        userDocRef,
        (snap) => {
          console.log("User document snapshot:", snap.exists());
          if (snap.exists()) {
            const data = snap.data();
            console.log("User data:", data);
            setStats({
              totalGames: data.totalGames || 0,
              wins: data.wins || 0,
              losses: data.losses || 0,
              draws: data.draws || 0,
              score: data.score || 0,
            });

            let registeredAt = null;

            if (data.createdAt) {
              // Если createdAt - это Firestore Timestamp
              if (typeof data.createdAt.toDate === "function") {
                registeredAt = data.createdAt.toDate();
              }
              // Если createdAt - это строка
              else if (typeof data.createdAt === "string") {
                registeredAt = new Date(data.createdAt);
              }
              // Если createdAt - это число (timestamp)
              else if (typeof data.createdAt === "number") {
                registeredAt = new Date(data.createdAt);
              }
            }

            setCurrentUser((prev) => ({
              ...prev,
              registeredAt: registeredAt,
            }));
          } else {
            console.log("User document does not exist");
            setStats({ totalGames: 0, wins: 0, losses: 0, draws: 0, score: 0 });
          }
          setLoading(false);
        },
        (error) => {
          console.error("Error listening to user document:", error);
          setLoading(false);
        }
      );
    });

    // Cleanup функция
    return () => {
      console.log("Cleaning up subscriptions");
      unsubscribeAuth();
      if (unsubDoc) {
        unsubDoc();
      }
    };
  }, []);

  const formatRegistrationDate = (date) => {
    if (!date) return "recently";

    try {
      return new Date(date).toLocaleDateString("ru-RU", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "recently";
    }
  };

  return (
    <div className="container">
      <div className="account-header">
        <h1>My Account</h1>
        <p>Statistics and achievements</p>
      </div>
      {loading ? (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading account information...</div>
        </div>
      ) : (
        <>
          <div className="profile-section">
            <div className="profile-details">
              <h2>{currentUser.nickname || "Guest"}</h2>
              <p>
                In the system:{" "}
                {formatRegistrationDate(currentUser.registeredAt)}
              </p>
            </div>
          </div>

          <div className="stats">
            <div className="stat-card">
              <div className="stat-number">{stats.totalGames || 0}</div>
              <div className="stat-label">Games</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.wins || 0}</div>
              <div className="stat-label">Wins</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.losses || 0}</div>
              <div className="stat-label">Losses</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.draws || 0}</div>
              <div className="stat-label">Draws</div>
            </div>
          </div>

          <div className="achievements">
            <div className="achievements-list">
              {stats.wins >= 1 ? (
                <div className="achievement">🥇 First win</div>
              ) : null}
              {stats.wins >= 5 ? (
                <div className="achievement">⭐ 5 wins</div>
              ) : null}
              {stats.wins >= 10 ? (
                <div className="achievement">⭐ 🏆 10 wins</div>
              ) : null}
              {stats.totalGames >= 20 ? (
                <div className="achievement">🎮 20 games</div>
              ) : null}
            </div>
          </div>

          <div className="history">
            <a href="/history">History of games</a>
          </div>
        </>
      )}
    </div>
  );
}

export default AccountInfa;
