import { useState, useEffect } from "react";
import Board from "./Board";
import {
  calculateWinner,
  updateLeaderboard,
  saveGameToHistory,
} from "../helper";
import { auth, db } from "../firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

function Game() {
  const [gameMode, setGameMode] = useState(null); // 'bot', 'online'
  const [roomId, setRoomId] = useState("");
  const [roomInfo, setRoomInfo] = useState(null);
  const [playerRole, setPlayerRole] = useState(null); // 'X', 'O', 'spectator'
  const [opponentNickname, setOpponentNickname] = useState("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  
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

  // Слушатель изменений комнаты для сетевой игры
  useEffect(() => {
    if (gameMode === 'online' && roomId && roomInfo) {
      const roomRef = doc(db, "rooms", roomId);
      const unsubscribe = onSnapshot(roomRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setRoomInfo(data);
          
          // Если оппонент присоединился
          if (data.playerO && !opponentNickname) {
            setOpponentNickname(data.playerO.nickname);
          }
          
          // Если игра завершена (кто-то вышел)
          if (data.status === 'finished') {
            alert(`Игра завершена. Победитель: ${data.winner === 'X' ? data.playerX?.nickname : data.playerO?.nickname}`);
            leaveRoom();
          }
          
          // Обновляем историю ходов
          if (data.moves && data.moves.length > 0) {
            const newHistory = [Array(9).fill(null)];
            data.moves.forEach(move => {
              const squares = [...newHistory[newHistory.length - 1]];
              squares[move.position] = move.player;
              newHistory.push(squares);
            });
            setHistory(newHistory);
            setCurrentMove(newHistory.length - 1);
          }
        }
      });
      
      return () => unsubscribe();
    }
  }, [gameMode, roomId, roomInfo]);

  // Функция создания комнаты
  const createRoom = async () => {
    if (!nickname || nickname === "Guest") {
      alert("Пожалуйста, войдите в аккаунт для сетевой игры");
      return;
    }
    
    setIsCreatingRoom(true);
    try {
      const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const roomRef = doc(db, "rooms", newRoomId);
      
      await setDoc(roomRef, {
        playerX: {
          uid: auth.currentUser?.uid || "anon",
          nickname: nickname,
          connected: true
        },
        playerO: null,
        status: 'waiting', // waiting, playing, finished
        currentPlayer: 'X',
        moves: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      setRoomId(newRoomId);
      setRoomInfo({
        playerX: { uid: auth.currentUser?.uid, nickname },
        playerO: null,
        status: 'waiting'
      });
      setPlayerRole('X');
      setGameMode('online');
      
      alert(`Комната создана! ID: ${newRoomId}\nСообщите этот ID другому игроку.`);
    } catch (error) {
      console.error("Ошибка создания комнаты:", error);
      alert("Ошибка создания комнаты");
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // Функция присоединения к комнате
  const joinRoom = async () => {
    if (!roomId.trim()) {
      alert("Введите ID комнаты");
      return;
    }
    
    if (!nickname || nickname === "Guest") {
      alert("Пожалуйста, войдите в аккаунт для сетевой игры");
      return;
    }
    
    setIsJoiningRoom(true);
    try {
      const roomRef = doc(db, "rooms", roomId.toUpperCase());
      const roomSnap = await getDoc(roomRef);
      
      if (!roomSnap.exists()) {
        alert("Комната не найдена");
        return;
      }
      
      const data = roomSnap.data();
      
      if (data.status !== 'waiting') {
        alert("Комната уже занята или игра началась");
        return;
      }
      
      if (data.playerX.uid === auth.currentUser?.uid) {
        alert("Вы не можете присоединиться к своей же комнате");
        return;
      }
      
      await updateDoc(roomRef, {
        playerO: {
          uid: auth.currentUser?.uid || "anon",
          nickname: nickname,
          connected: true
        },
        status: 'playing',
        updatedAt: serverTimestamp()
      });
      
      setRoomInfo({
        ...data,
        playerO: { uid: auth.currentUser?.uid, nickname },
        status: 'playing'
      });
      setPlayerRole('O');
      setGameMode('online');
      setOpponentNickname(data.playerX.nickname);
      
      alert(`Вы присоединились к комнате как игрок O`);
    } catch (error) {
      console.error("Ошибка присоединения к комнате:", error);
      alert("Ошибка присоединения к комнате");
    } finally {
      setIsJoiningRoom(false);
    }
  };

  // Функция выхода из комнаты
  const leaveRoom = async () => {
    if (!roomId || gameMode !== 'online') return;
    
    try {
      const roomRef = doc(db, "rooms", roomId);
      const roomSnap = await getDoc(roomRef);
      
      if (roomSnap.exists()) {
        const data = roomSnap.data();
        
        // Определяем победителя (оставшийся игрок)
        let winner = null;
        if (playerRole === 'X' && data.playerO) {
          winner = 'O';
        } else if (playerRole === 'O' && data.playerX) {
          winner = 'X';
        }
        
        // Сохраняем историю игры
        if (data.playerX && data.playerO && data.moves.length > 0) {
          const winnerUid = winner === 'X' ? data.playerX.uid : data.playerO.uid;
          
          await saveGameToHistory(
            { uid: data.playerX.uid, nickname: data.playerX.nickname },
            { uid: data.playerO.uid, nickname: data.playerO.nickname },
            winnerUid
          );
          
          // Обновляем статистику игроков
          if (winner === 'X') {
            await updateLeaderboard(data.playerX.nickname, "win");
            await updateLeaderboard(data.playerO.nickname, "loss");
          } else if (winner === 'O') {
            await updateLeaderboard(data.playerX.nickname, "loss");
            await updateLeaderboard(data.playerO.nickname, "win");
          }
        }
        
        // Помечаем комнату как завершенную
        await updateDoc(roomRef, {
          status: 'finished',
          winner: winner,
          updatedAt: serverTimestamp()
        });
        
        // Удаляем комнату через 10 секунд
        setTimeout(async () => {
          await deleteDoc(roomRef);
        }, 10000);
      }
    } catch (error) {
      console.error("Ошибка при выходе из комнаты:", error);
    } finally {
      // Сбрасываем состояние
      setGameMode(null);
      setRoomId("");
      setRoomInfo(null);
      setPlayerRole(null);
      setOpponentNickname("");
      setHistory([Array(9).fill(null)]);
      setCurrentMove(0);
    }
  };

  // Основная функция обработки хода
  const handlePlay = async (nextSquares) => {
    if (gameMode === 'bot') {
      handleBotGame(nextSquares);
    } else if (gameMode === 'online') {
      handleOnlineGame(nextSquares);
    }
  };

  // Логика для игры с ботом (оставляем существующую)
  const handleBotGame = (nextSquares) => {
    const wasXTurn = currentMove % 2 === 0;
    const nextHistory = [...history.slice(0, currentMove + 1), nextSquares];
    setHistory(nextHistory);
    const newMove = nextHistory.length - 1;
    setCurrentMove(newMove);

    const winnerInfo = calculateWinner(nextSquares);
    const winner = winnerInfo ? winnerInfo.winner : null;
    const isDraw = !winner && !nextSquares.includes(null);

    if (winner || isDraw) {
      const uid = auth.currentUser?.uid || "anon";
      const nick = nickname || "Guest";
      saveGameToHistory(
        { uid, nickname: nick },
        { uid: "bot", nickname: "Bot" },
        winner === "X" ? uid : winner === "O" ? "bot" : null
      );
      
      if (winner === "X") {
        updateLeaderboard(nickname, "win");
      } else if (isDraw) {
        updateLeaderboard(nickname, "draw");
      }
    }

    if (wasXTurn) {
      const winnerInfo = calculateWinner(nextSquares);
      const winner = winnerInfo ? winnerInfo.winner : null;

      if (!winner && nextSquares.includes(null)) {
        setIsBotThinking(true);
        setTimeout(() => {
          // ... существующая логика бота ...
        }, 400);
      }
    }
  };

  // Логика для сетевой игры
  const handleOnlineGame = async (nextSquares) => {
    if (!roomId || !roomInfo || playerRole !== roomInfo.currentPlayer) {
      return;
    }

    try {
      const roomRef = doc(db, "rooms", roomId);
      const roomSnap = await getDoc(roomRef);
      
      if (!roomSnap.exists()) return;
      
      const data = roomSnap.data();
      const lastMoveIndex = data.moves ? data.moves.length - 1 : -1;
      const lastSquare = data.moves && data.moves[lastMoveIndex];
      
      // Определяем позицию хода
      let position = -1;
      for (let i = 0; i < 9; i++) {
        if (nextSquares[i] !== history[currentMove][i]) {
          position = i;
          break;
        }
      }
      
      if (position === -1) return;
      
      // Добавляем ход в историю
      const newMove = {
        player: playerRole,
        position: position,
        timestamp: serverTimestamp()
      };
      
      // Обновляем комнату
      await updateDoc(roomRef, {
        moves: [...(data.moves || []), newMove],
        currentPlayer: playerRole === 'X' ? 'O' : 'X',
        updatedAt: serverTimestamp()
      });
      
      // Обновляем локальное состояние
      const nextHistory = [...history.slice(0, currentMove + 1), nextSquares];
      setHistory(nextHistory);
      setCurrentMove(nextHistory.length - 1);
      
      // Проверяем победителя
      const winnerInfo = calculateWinner(nextSquares);
      if (winnerInfo) {
        const winnerUid = winnerInfo.winner === 'X' ? roomInfo.playerX.uid : roomInfo.playerO.uid;
        
        await saveGameToHistory(
          { uid: roomInfo.playerX.uid, nickname: roomInfo.playerX.nickname },
          { uid: roomInfo.playerO.uid, nickname: roomInfo.playerO.nickname },
          winnerUid
        );
        
        await updateDoc(roomRef, {
          status: 'finished',
          winner: winnerInfo.winner,
          updatedAt: serverTimestamp()
        });
        
        // Обновляем статистику
        if (winnerInfo.winner === 'X') {
          await updateLeaderboard(roomInfo.playerX.nickname, "win");
          await updateLeaderboard(roomInfo.playerO.nickname, "loss");
        } else {
          await updateLeaderboard(roomInfo.playerX.nickname, "loss");
          await updateLeaderboard(roomInfo.playerO.nickname, "win");
        }
        
        alert(`Победитель: ${winnerInfo.winner === 'X' ? roomInfo.playerX.nickname : roomInfo.playerO.nickname}`);
      } else if (!nextSquares.includes(null)) {
        // Ничья
        await saveGameToHistory(
          { uid: roomInfo.playerX.uid, nickname: roomInfo.playerX.nickname },
          { uid: roomInfo.playerO.uid, nickname: roomInfo.playerO.nickname },
          null
        );
        
        await updateDoc(roomRef, {
          status: 'finished',
          winner: null,
          updatedAt: serverTimestamp()
        });
        
        await updateLeaderboard(roomInfo.playerX.nickname, "draw");
        await updateLeaderboard(roomInfo.playerO.nickname, "draw");
        
        alert("Ничья!");
      }
      
    } catch (error) {
      console.error("Ошибка при обработке хода:", error);
    }
  };

  const jumpTo = (nextMove) => {
    setCurrentMove(nextMove);
    setIsBotThinking(false);
  };

  // Компонент выбора режима игры
  const renderModeSelection = () => (
    <div className="mode-selection">
      <h2>Выберите режим игры</h2>
      <div className="mode-buttons">
        <button 
          className="mode-btn bot-mode"
          onClick={() => setGameMode('bot')}
        >
          🤖 Игра с ботом
        </button>
        <button 
          className="mode-btn online-mode"
          onClick={() => setGameMode('online')}
        >
          🌐 Сетевая игра
        </button>
      </div>
    </div>
  );

  // Компонент для сетевой игры
  const renderOnlineGame = () => (
    <div className="online-game-container">
      <div className="room-controls">
        {!roomId ? (
          <>
            <div className="room-actions">
              <button 
                className="btn-create-room"
                onClick={createRoom}
                disabled={isCreatingRoom}
              >
                {isCreatingRoom ? "Создание..." : "Создать комнату"}
              </button>
              
              <div className="join-section">
                <input
                  type="text"
                  placeholder="Введите ID комнаты"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  className="room-input"
                />
                <button 
                  className="btn-join-room"
                  onClick={joinRoom}
                  disabled={isJoiningRoom}
                >
                  {isJoiningRoom ? "Присоединение..." : "Присоединиться"}
                </button>
              </div>
            </div>
            <button 
              className="btn-back"
              onClick={() => setGameMode(null)}
            >
              Назад к выбору режима
            </button>
          </>
        ) : (
          <div className="room-info">
            <div className="room-header">
              <h3>Комната: {roomId}</h3>
              <button 
                className="btn-leave-room"
                onClick={leaveRoom}
              >
                🚪 Выйти из игры
              </button>
            </div>
            
            <div className="players-info">
              <div className="player-card">
                <span className="player-badge x-badge">X</span>
                <span className="player-name">
                  {roomInfo?.playerX?.nickname || "Ожидание..."}
                  {playerRole === 'X' && " (Вы)"}
                </span>
                {roomInfo?.playerX?.connected && <span className="status-indicator online">●</span>}
              </div>
              
              <div className="vs">VS</div>
              
              <div className="player-card">
                <span className="player-badge o-badge">O</span>
                <span className="player-name">
                  {roomInfo?.playerO?.nickname || "Ожидание игрока..."}
                  {playerRole === 'O' && " (Вы)"}
                </span>
                {roomInfo?.playerO?.connected && <span className="status-indicator online">●</span>}
              </div>
            </div>
            
            {roomInfo?.status === 'waiting' && (
              <div className="waiting-message">
                ⏳ Ожидаем второго игрока...<br/>
                ID комнаты: <strong>{roomId}</strong>
              </div>
            )}
            
            {roomInfo?.status === 'playing' && (
              <div className="game-status">
                {roomInfo.currentPlayer === playerRole ? 
                  "Ваш ход!" : 
                  `Ходит: ${roomInfo.currentPlayer === 'X' ? roomInfo.playerX?.nickname : roomInfo.playerO?.nickname}`
                }
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const moves = history.map((_, move) => {
    let description;
    if (move > 0) {
      description = "Ход #" + move;
    } else {
      description = "Начало игры";
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
      
      {!gameMode ? (
        renderModeSelection()
      ) : gameMode === 'online' ? (
        <>
          {renderOnlineGame()}
          <div className="game">
            <div className="game-board">
              <Board
                xIsNext={gameMode === 'online' ? roomInfo?.currentPlayer === 'X' : xIsNext}
                squares={currentSquares}
                onPlay={handlePlay}
                isBotThinking={isBotThinking}
                nickname={gameMode === 'online' ? 
                  (playerRole === 'X' ? nickname : opponentNickname) : 
                  nickname}
                isLoadingNickname={isLoadingNickname}
                disabled={gameMode === 'online' && 
                  (roomInfo?.status !== 'playing' || 
                   roomInfo?.currentPlayer !== playerRole)}
              />
            </div>
            <div className="game-info">
              <ol>{moves}</ol>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="bot-game-header">
            <button 
              className="btn-back"
              onClick={() => setGameMode(null)}
            >
              ← Назад к выбору режима
            </button>
            <h3>Режим: Игра с ботом</h3>
          </div>
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
        </>
      )}
    </div>
  );
}

export default Game;
