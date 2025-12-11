import ButtonLogOut from "./ButtonLogOut";

function Navigation() {
  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-left">
            <p className="navbar-brand">Tic-Tac-Toe</p>
          </div>
          <div className="navbar-right">
            <ul className="menu">
              <li>
                <a href="/game">Game</a>
              </li>
              <li>
                <a href="/leaderboard">Leaderboard</a>
              </li>
              <a href="/account" className="account">
                Account
              </a>
              <li>
                <ButtonLogOut />
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
}

export default Navigation;
