import Leaderboard from "../components/Leaderboard";
import Navigation from "../components/Navigation";

function LeaderboardPage() {
  return (
    <>
      <Navigation />
      <div className="leaderboard-content">
        <Leaderboard />
      </div>
    </>
  );
}

export default LeaderboardPage;
