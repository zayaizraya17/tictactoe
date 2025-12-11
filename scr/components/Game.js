import { useState, useEffect } from "react";
import Board from "./Board";
import {
  calculateWinner,
  updateLeaderboard,
  saveGameToHistory,
} from "../helper";
import { auth } from "../firebase";

function Game() {
  const [history, setHistory] = useState([Array(9).fill(null)]);
  const [currentMove, setCurrentMove] = useState(0);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [nickname, setNickname] = useState("");
  const xIsNext = currentMove % 2 === 0;
  const currentSquares = history[currentMove];
  const [isLoadingNickname, setIsLoadingNickname] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        const displayName = auth.currentUser.displayName;
        if (displayName) {
          setNickname(displayName);
          setIsLoadingNickname(false);
          return;
        }
      }
      const saved = JSON.parse(localStorage.getItem("currentUser") || "{}");
      if (saved.nickname && saved.nickname !== "Guest") {
        setNickname(saved.nickname);
        setIsLoadingNickname(false);
      }
    };

    loadUser();
  }, []);

  function handlePlay(nextSquares) {
    const wasXTurn = currentMove % 2 === 0;

    const nextHistory = [...history.slice(0, currentMove + 1), nextSquares];
    setHistory(nextHistory);
    const newMove = nextHistory.length - 1;
    setCurrentMove(newMove);

    const winnerInfo = calculateWinner(nextSquares);
    const winner = winnerInfo ? winnerInfo.winner : null;
    const isDraw = !winner && !nextSquares.includes(null);

    if (winner || isDraw) {
      // игра закончена
      const uid = auth.currentUser?.uid || "anon";
      const nick = nickname || "Guest";
      saveGameToHistory(
        { uid, nickname: nick }, // игрок
        { uid: "bot", nickname: "Bot" }, // противник
        winner === "X" ? uid : winner === "O" ? "bot" : null
      );
    }

    if (winner === "X") {
      updateLeaderboard(nickname, "win");
    } else if (isDraw) {
      updateLeaderboard(nickname, "draw");
    }

    if (wasXTurn) {
      const winnerInfo = calculateWinner(nextSquares);
      const winner = winnerInfo ? winnerInfo.winner : null;

      if (!winner && nextSquares.includes(null)) {
        setIsBotThinking(true);
        setTimeout(() => {
          const availableMoves = nextSquares
            .map((square, index) => (square === null ? index : null))
            .filter((index) => index !== null);

          // 1. Проверяем — может бот сразу выиграть?
          for (let i of availableMoves) {
            const test = [...nextSquares];
            test[i] = "O";
            if (calculateWinner(test)?.winner === "O") {
              const botSquares = test;
              const botHistory = [...nextHistory, botSquares];
              setHistory(botHistory);
              setCurrentMove(botHistory.length - 1);
              setIsBotThinking(false);

              updateLeaderboard(nickname, "loss");
              if (auth.currentUser) {
                saveGameToHistory(
                  { uid: auth.currentUser.uid, nickname: nickname || "Guest" },
                  { uid: "bot", nickname: "Bot" },
                  "bot"
                );
              }
              return;
            }
          }

          // 2. Проверяем — может игрок выиграть следующим ходом? Блокируем!
          for (let i of availableMoves) {
            const test = [...nextSquares];
            test[i] = "X";
            if (calculateWinner(test)?.winner === "X") {
              const botSquares = [...nextSquares];
              botSquares[i] = "O";
              const botHistory = [...nextHistory, botSquares];
              setHistory(botHistory);
              setCurrentMove(botHistory.length - 1);
              setIsBotThinking(false);
              return;
            }
          }

          // 3. Если ничего критичного — просто случайный ход (как раньше)
          const randomIndex =
            availableMoves[Math.floor(Math.random() * availableMoves.length)];
          const botSquares = [...nextSquares];
          botSquares[randomIndex] = "O";
          const botHistory = [...nextHistory, botSquares];
          setHistory(botHistory);
          setCurrentMove(botHistory.length - 1);
          setIsBotThinking(false);

          const finalWinner = calculateWinner(botSquares);
          if (!finalWinner && !botSquares.includes(null)) {
            updateLeaderboard(nickname, "draw");
            if (auth.currentUser) {
              saveGameToHistory(
                { uid: auth.currentUser.uid, nickname: nickname || "Guest" },
                { uid: "bot", nickname: "Bot" },
                null
              );
            }
          }
        }, 400);
      }
    }
  }

  function jumpTo(nextMove) {
    setCurrentMove(nextMove);
    setIsBotThinking(false);
  }

  const moves = history.map((_, move) => {
    let description;
    if (move > 0) {
      description = "Go to move #" + move;
    } else {
      description = "Go to game start";
    }
    return (
      <li key={move}>
        <button onClick={() => jumpTo(move)}>{description}</button>
      </li>
    );
  });

  return (
    <div className="container">
      <h1>Click! Win! Reign!</h1>
      <div className="game">
        <div className="game-board">
          <Board
            xIsNext={xIsNext}
            squares={currentSquares}
            onPlay={handlePlay}
            isBotThinking={isBotThinking}
            nickname={nickname}
            isLoadingNickname={isLoadingNickname}
          />
        </div>
        <div className="game-info">
          <ol>{moves}</ol>
        </div>
      </div>
    </div>
  );
}

export default Game;
