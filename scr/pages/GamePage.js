import Game from "../components/Game";
import Navigation from "../components/Navigation";

function GamePage() {
  return (
    <>
      <Navigation />
      <div className="main-content">
        <Game />
      </div>
    </>
  );
}

export default GamePage;
