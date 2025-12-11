import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  getFirebaseErrorMessage,
  checkIfUserIsAdmin,
  loadGameHistory,
  getPlayerInfo,
  formatTimestamp,
} from "../helper";

function AdminPanel() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [gameHistory, setGameHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true); //состояние для отслеживания первоначальной загрузки

  // Проверяем, авторизован ли пользователь как админ
  useEffect(() => {
    const checkAdminAuth = () => {
      const currentUser = JSON.parse(
        localStorage.getItem("currentUser") || "{}"
      );
      const isAdmin = currentUser.isAdmin === true;
      setIsAuthenticated(isAdmin);

      if (isAdmin) {
        handleLoadGameHistory();
      } else {
        setInitialLoad(false); // Если не админ, сбрасываем флаг загрузки
      }
    };

    checkAdminAuth();
  }, []);

  const handleLoadGameHistory = async () => {
    try {
      setLoadingHistory(true);
      setError("");
      const history = await loadGameHistory(); // ← импортированная функция
      setGameHistory(history);
    } catch (error) {
      console.error("❌ Error loading game history:", error);
      setError(`Failed to load game history: ${error.message}`);
    } finally {
      setLoadingHistory(false);
      setInitialLoad(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Пытаемся войти через Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      const isAdmin = await checkIfUserIsAdmin(user.uid, user.email);

      if (!isAdmin) {
        await signOut(auth);
        setError("Access denied. Admin privileges required.");
        return;
      }

      // Сохраняем информацию об админе
      localStorage.setItem(
        "currentUser",
        JSON.stringify({
          nickname: user.displayName || "Admin",
          email: user.email,
          isLoggedIn: true,
          isAdmin: true,
          uid: user.uid,
          emailVerified: user.emailVerified,
        })
      );

      setIsAuthenticated(true);
      setInitialLoad(true); // Устанавливаем флаг загрузки при входе
      await handleLoadGameHistory();
    } catch (error) {
      console.error("Admin login error:", error);
      setError(getFirebaseErrorMessage(error.code));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("currentUser");
      setIsAuthenticated(false);
      setGameHistory([]);
      setInitialLoad(true); // Сбрасываем при выходе
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-login-container">
        <div className="admin-login-form">
          <h2>Admin Login</h2>
          <form onSubmit={handleAdminLogin}>
            <div className="input-group">
              <label htmlFor="admin-email">Admin Email</label>
              <input
                className="input"
                id="admin-email"
                type="email"
                placeholder="admin@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label htmlFor="admin-password">Password</label>
              <input
                className="input"
                id="admin-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <div className="error-message">{error}</div>}
            <button
              type="submit"
              className="admin-login-btn"
              disabled={isLoading}
            >
              {isLoading ? "Signing In..." : "Sign In as Admin"}
            </button>
          </form>
          <div className="admin-back-link">
            <button onClick={() => navigate("/")} className="back-to-game-btn">
              Back to Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2>Admin Panel - Game History</h2>
        <div className="admin-header-info">
          <span className="games-count">
            Loaded: {gameHistory.length} games
          </span>
          <button onClick={handleLogout} className="admin-logout-btn">
            Log Out
          </button>
        </div>
      </div>

      <div className="admin-stats">
        <div className="stat-card">
          <h3>Total Matches</h3>
          {initialLoad || loadingHistory ? (
            <div className="stats-loading">
              <div className="loading-spinner small"></div>
              <span>Loading...</span>
            </div>
          ) : (
            <p>{gameHistory.length}</p>
          )}
        </div>
      </div>

      <div className="game-history-section">
        <div className="section-header">
          <h3>All Matches</h3>
          <div className="section-actions">
            {error && <span className="error-text">{error}</span>}
            <button
              onClick={handleLoadGameHistory}
              className="refresh-btn"
              disabled={loadingHistory}
            >
              {loadingHistory ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div
          className="game-history-content"
          style={{ position: "relative", minHeight: "400px" }}
        >
          {initialLoad || loadingHistory ? (
            <div className="loading-overlay">
              <div className="loading-spinner"></div>
              <div className="loading-text">
                {initialLoad
                  ? "Loading game history..."
                  : "Refreshing game history..."}
              </div>
            </div>
          ) : gameHistory.length === 0 ? (
            <div className="no-data-message">No game history found</div>
          ) : (
            <div className="game-history-table-container">
              <table className="game-history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Player 1</th>
                    <th>Player 2</th>
                    <th>Winner</th>
                  </tr>
                </thead>
                <tbody>
                  {gameHistory.map((game) => {
                    const playerInfo = getPlayerInfo(game);

                    return (
                      <tr key={game.id}>
                        <td>{formatTimestamp(game.endedAtMs)}</td>
                        <td>{playerInfo.playerX}</td>
                        <td>{playerInfo.playerO}</td>
                        <td>
                          <span
                            className={`winner-badge ${
                              playerInfo.winner === "Bot"
                                ? "winner-bot"
                                : playerInfo.winner === playerInfo.playerX
                                ? "winner-x"
                                : "winner-draw"
                            }`}
                          >
                            {playerInfo.winner}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
