import Navigation from "../components/Navigation";
import HistoryOfGame from "../components/HistoryOfGame";

function HistoryPage() {
  return (
    <>
      <Navigation />
      <div className="history-content">
        <HistoryOfGame />
      </div>
    </>
  );
}

export default HistoryPage;
