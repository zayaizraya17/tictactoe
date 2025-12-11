import { db } from "./firebase";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  increment,
  serverTimestamp,
  collection,
  addDoc,
  query,
} from "firebase/firestore";
import { auth } from "./firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
} from "firebase/auth";

export function calculateWinner(squares) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return {
        winner: squares[a],
        line: lines[i],
      };
    }
  }
  return null;
}

export const updateLeaderboard = async (nickname, result) => {
  if (!nickname || nickname === "Guest" || !auth.currentUser) return;

  const userRef = doc(db, "users", auth.currentUser.uid);

  try {
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      // Пользователь есть — обновляем счётчики
      await updateDoc(userRef, {
        totalGames: increment(1),
        wins: result === "win" ? increment(1) : increment(0),
        losses: result === "loss" ? increment(1) : increment(0),
        draws: result === "draw" ? increment(1) : increment(0),
        score: increment(result === "win" ? 10 : result === "draw" ? 5 : -5),
        nickname: nickname,
        lastPlayed: serverTimestamp(),
      });
    } else {
      // Первый раз — создаём профиль
      await setDoc(userRef, {
        nickname: nickname,
        totalGames: 1,
        wins: result === "win" ? 1 : 0,
        losses: result === "loss" ? 1 : 0,
        draws: result === "draw" ? 1 : 0,
        score: result === "win" ? 3 : result === "draw" ? 1 : 0,
        createdAt: serverTimestamp(),
        lastPlayed: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("Leaderboard update error:", error);
  }
};

export const saveGameToHistory = async (player1, player2, winnerUid) => {
  try {
    await addDoc(collection(db, "gameHistory"), {
      players: [
        { uid: player1.uid, nickname: player1.nickname },
        { uid: player2.uid, nickname: player2.nickname },
      ],
      playerIds: [player1.uid, player2.uid],
      winner: winnerUid === "bot" ? "bot" : winnerUid,
      endedAt: serverTimestamp(),
      endedAtMs: Date.now(),
    });
  } catch (e) {
    console.error("Ошибка сохранения игры:", e);
  }
};

export const getFirebaseErrorMessage = (errorCode) => {
  const errorMessages = {
    "auth/invalid-email": "Invalid email address",
    "auth/user-disabled": "This account has been disabled",
    "auth/user-not-found": "No account found with this email",
    "auth/wrong-password": "Incorrect password",
    "auth/email-already-in-use": "Email already registered",
    "auth/weak-password": "Password should be at least 6 characters",
    "auth/too-many-requests": "Too many attempts, try again later",
    "auth/network-request-failed": "Network error, check your connection",
  };
  return errorMessages[errorCode] || "Authentication failed";
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateNickname = (nickname) => {
  return nickname.length >= 4 && nickname.length <= 12;
};

export const validatePassword = (password) => {
  return password.length >= 6 && password.length <= 20;
};

export const firebaseLogin = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    if (!user.emailVerified) {
      return { success: false, error: "Please verify your email first" };
    }

    const userData = {
      nickname: user.displayName || "Guest",
      email: user.email,
      isLoggedIn: true,
      registeredAt: new Date().toISOString(),
      uid: user.uid,
      emailVerified: user.emailVerified,
    };

    localStorage.setItem("currentUser", JSON.stringify(userData));

    return { success: true, user: userData };
  } catch (error) {
    const message = getFirebaseErrorMessage(error.code);
    return { success: false, error: message };
  }
};

export const firebaseRegister = async (nickname, email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    await updateProfile(user, { displayName: nickname });
    await sendEmailVerification(user);

    const userData = {
      nickname: nickname,
      email: user.email,
      isLoggedIn: true,
      registeredAt: new Date().toISOString(),
      uid: user.uid,
      emailVerified: false,
    };

    localStorage.setItem("currentUser", JSON.stringify(userData));

    return { success: true, user: userData, email: user.email };
  } catch (error) {
    const message = getFirebaseErrorMessage(error.code);
    return { success: false, error: message };
  }
};

export const validateLoginForm = (email, password) => {
  const errors = { email: "", password: "" };

  if (!validateEmail(email)) {
    errors.email = "Please enter a valid email address";
  }

  if (!validatePassword(password)) {
    errors.password =
      password.length < 6
        ? "Password must be at least 6 characters"
        : "Password must be max 20 characters";
  }

  return {
    isValid: !errors.email && !errors.password,
    errors,
  };
};

export const validateRegisterForm = (nickname, email, password) => {
  const errors = { nickname: "", email: "", password: "" };

  if (!validateNickname(nickname)) {
    errors.nickname =
      nickname.length < 4
        ? "Nickname must be at least 4 characters"
        : "Nickname must be max 12 characters";
  }

  if (!validateEmail(email)) {
    errors.email = "Please enter a valid email address";
  }

  if (!validatePassword(password)) {
    errors.password =
      password.length < 6
        ? "Password must be at least 6 characters"
        : "Password must be max 20 characters";
  }

  return {
    isValid: !errors.nickname && !errors.email && !errors.password,
    errors,
  };
};

export const checkIfUserIsAdmin = async (userUid, userEmail) => {
  try {
    console.log("Checking admin status for:", userEmail, userUid);

    // Способ 1: Проверка по email (самый надежный для начала)
    const adminEmails = [
      "admin@mytictactoe.com",
      "test@admin.com",
      "admin@example.com",
    ];

    if (adminEmails.includes(userEmail)) {
      console.log("User is admin by email");
      return true;
    }

    // Способ 2: Проверка через коллекцию uids
    try {
      const adminListRef = collection(db, "admins", "adminList", "uids");
      const adminSnapshot = await getDocs(adminListRef);

      let isAdmin = false;
      adminSnapshot.forEach((doc) => {
        if (doc.id === userUid) {
          isAdmin = true;
        }
      });

      if (isAdmin) {
        console.log("User is admin by UID in collection");
        return true;
      }
    } catch (collectionError) {
      console.log("Collection check failed:", collectionError.message);
    }

    // Способ 3: Проверка через документ с массивом UID
    try {
      const adminListDoc = await getDoc(doc(db, "admins", "adminList"));
      if (adminListDoc.exists()) {
        const data = adminListDoc.data();
        if (data.uids && data.uids.includes(userUid)) {
          console.log("User is admin by UID in array");
          return true;
        }
        if (data.admins && data.admins.includes(userUid)) {
          console.log("User is admin by admins array");
          return true;
        }
      }
    } catch (docError) {
      console.log("Document check failed:", docError.message);
    }

    console.log("User is NOT admin");
    return false;
  } catch (error) {
    console.error("Error in admin check:", error);
    return false;
  }
};

export const loadGameHistory = async () => {
  try {
    console.log("🔄 Loading game history...");

    const gameHistoryRef = collection(db, "gameHistory");
    const q = query(gameHistoryRef);
    const querySnapshot = await getDocs(q);

    console.log("📊 Found documents:", querySnapshot.size);

    const history = [];
    querySnapshot.forEach((doc) => {
      const gameData = doc.data();
      console.log("🎮 Game data:", doc.id, gameData);

      history.push({
        id: doc.id,
        ...gameData,
      });
    });

    history.sort((a, b) => {
      const timeA = a.endedAtMs?.toDate?.() || a.endedAtMs || 0;
      const timeB = b.endedAtMs?.toDate?.() || b.endedAtMs || 0;
      return new Date(timeB) - new Date(timeA);
    });

    console.log(`✅ Loaded ${history.length} games`);
    return history;
  } catch (error) {
    console.error("❌ Error loading game history:", error);
    throw new Error(`Failed to load game history: ${error.message}`);
  }
};

export const getPlayerInfo = (game) => {
  // players - массив объектов с nickname и uid
  if (game.players && Array.isArray(game.players) && game.players.length >= 2) {
    const p1 = game.players[0];
    const p2 = game.players[1];
    const winnerUid = game.winner;

    return {
      playerX: p1?.nickname || "Player X",
      playerO: p2?.nickname || (p2?.uid === "bot" ? "Bot" : "Player O"),
      winner:
        winnerUid === "bot"
          ? "Bot"
          : winnerUid === p1?.uid
          ? p1.nickname
          : winnerUid === p2?.uid
          ? p2.nickname
          : winnerUid || "Draw",
    };
  }

  const playerXUid = game.playerX || game.playerIds?.[0];
  const playerOUid = game.playerO || game.playerIds?.[1] || "bot";

  let playerXName = "Unknown";
  let playerOName = playerOUid === "bot" ? "Bot" : "Unknown";

  // Попробуем найти ники в users (если есть ссылки)
  if (game.playerX && typeof game.playerX === "string") {
    playerXName = game.playerX === "bot" ? "Bot" : "Player";
  }
  if (game.playerO && typeof game.playerO === "string") {
    playerOName = game.playerO === "bot" ? "Bot" : "Player";
  }

  // Если есть поле nickname где-то рядом
  if (game.playerXNickname) playerXName = game.playerXNickname;
  if (game.playerONickname) playerOName = game.playerONickname;

  const winner =
    game.winner === "bot"
      ? "Bot"
      : game.winner === playerXUid
      ? playerXName
      : game.winner === playerOUid
      ? playerOName
      : game.winner || "Draw";

  return {
    playerX: playerXName,
    playerO: playerOName,
    winner,
  };
};

// Функция для форматирования данных
export const formatTimestamp = (timestamp) => {
  if (!timestamp) return "N/A";

  try {
    // Если это Firestore timestamp
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleString();
    }

    // Если это число (timestamp в ms)
    if (typeof timestamp === "number") {
      return new Date(timestamp).toLocaleString();
    }

    // Если это строка
    if (typeof timestamp === "string") {
      const parsedTimestamp = parseInt(timestamp);
      if (!isNaN(parsedTimestamp)) {
        return new Date(parsedTimestamp).toLocaleString();
      }
    }

    return "N/A";
  } catch (error) {
    console.error("Error formatting date:", error, timestamp);
    return "N/A";
  }
};
