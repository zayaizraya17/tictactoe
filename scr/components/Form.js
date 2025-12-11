import ButtonSignIn from "./ButtonSignIn";
import ButtonRegister from "./ButtonRegister";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  validateLoginForm,
  validateRegisterForm,
  firebaseLogin,
  firebaseRegister,
} from "../helper";

const EmailVerificationToast = ({ email, onClose }) => {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          backgroundColor: "#1a1a2e",
          color: "white",
          padding: "24px",
          borderRadius: "12px",
          maxWidth: "400px",
          width: "90%",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          border: "1px solid #16213e",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "20px" }}>
            ✅ Registration Successful!
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#aaa",
              fontSize: "28px",
              cursor: "pointer",
              padding: "0 4px",
            }}
          >
            ×
          </button>
        </div>

        <p style={{ margin: "12px 0", opacity: 0.9 }}>
          We've sent a verification link to:
        </p>
        <p
          style={{
            margin: "8px 0",
            fontWeight: "bold",
            fontSize: "16px",
            wordBreak: "break-all",
          }}
        >
          {email}
        </p>
        <p style={{ margin: "12px 0", opacity: 0.9 }}>
          Please check your inbox (and spam folder) and verify your email.
        </p>

        <div style={{ marginTop: "24px", textAlign: "center" }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: "#00d4ff",
              color: "black",
              border: "none",
              padding: "12px 24px",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Continue to Login
          </button>
        </div>
      </div>
    </div>
  );
};

function Form() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({
    nickname: "",
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoginForm, setIsLoginForm] = useState(true);
  const [showVerificationToast, setShowVerificationToast] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");

  const handleLogin = async () => {
    const validation = validateLoginForm(email, password);
    setErrors(validation.errors);

    if (validation.isValid) {
      setIsLoading(true);
      const result = await firebaseLogin(email, password);
      setIsLoading(false);

      if (result.success) {
        navigate("/game");
      } else {
        setErrors((prev) => ({ ...prev, password: result.error }));
      }
    }
  };

   const handleRegister = async () => {
    const validation = validateRegisterForm(nickname, email, password);
    setErrors(validation.errors);

    if (validation.isValid) {
      setIsLoading(true);
      const result = await firebaseRegister(nickname, email, password);
      setIsLoading(false);
      
      if (result.success) {
        setVerificationEmail(result.email);
        setShowVerificationToast(true);
      } else {
        setErrors(prev => ({ ...prev, email: result.error }));
      }
    }
  };

  const toggleForm = () => {
    setIsLoginForm(!isLoginForm);
    setErrors({ nickname: "", email: "", password: "" }); // Очищаем ошибки при переключении
  };

  const handleToastClose = () => {
    setShowVerificationToast(false);
    setIsLoginForm(true);
    setEmail("");
    setPassword("");
    setNickname("");
    setErrors({ nickname: "", email: "", password: "" });
  };

  const handleAdminLogin = () => {
    navigate("/admin");
  };

  return (
    <>
      <div className="form-container">
        <h1 className="headerForm">
          {isLoginForm ? "Enter the Game" : "Create Account"}
        </h1>
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading...</div>
          </div>
        )}
        <form className={`signInForm ${isLoginForm ? "active" : "hidden"}`}>
          <div className="input-group">
            <label htmlFor="email-login">Email</label>
            <input
              className="input"
              id="email-login"
              name="email"
              type="email"
              placeholder="your@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email ? (
              <span className="error-message">{errors.email}</span>
            ) : null}
          </div>
          <div className="input-group">
            <label htmlFor="password-login">Password</label>
            <input
              className="input"
              id="password-login"
              name="password"
              type="password"
              minLength={6}
              required
              value={password}
              maxLength={20}
              onChange={(e) => setPassword(e.target.value)}
            />
            {errors.password ? (
              <span className="error-message">{errors.password}</span>
            ) : null}
          </div>
          <div className="buttonContainer">
            <ButtonSignIn onValidation={handleLogin} disabled={isLoading} />
          </div>
          <div className="form-switch">
            <p>
              Don't have an account?{" "}
              <span className="switch-link" onClick={toggleForm}>
                Create one
              </span>
            </p>
          </div>

          <div className="admin-access">
            <div className="admin-divider">
              <span>Admin Access</span>
            </div>
            <button
              type="button"
              className="admin-link"
              onClick={handleAdminLogin}
            >
              <span className="admin-icon">⚙️</span>
              Admin Panel
            </button>
          </div>
        </form>

        <form className={`registerForm ${!isLoginForm ? "active" : "hidden"}`}>
          <div className="input-group">
            <label htmlFor="nick-register">Nickname</label>
            <input
              className="input"
              id="nick-register"
              name="nick"
              type="text"
              minLength={4}
              placeholder="4-12 characters"
              required
              value={nickname}
              maxLength={12}
              onChange={(e) => setNickname(e.target.value)}
            />
            {errors.nickname ? (
              <span className="error-message">{errors.nickname}</span>
            ) : null}
          </div>
          <div className="input-group">
            <label htmlFor="email-register">Email</label>
            <input
              className="input"
              id="email-register"
              name="email"
              type="email"
              placeholder="your@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email ? (
              <span className="error-message">{errors.email}</span>
            ) : null}
          </div>
          <div className="input-group">
            <label htmlFor="password-register">Password</label>
            <input
              className="input"
              id="password-register"
              name="password"
              type="password"
              minLength={6}
              required
              value={password}
              maxLength={20}
              onChange={(e) => setPassword(e.target.value)}
            />
            {errors.password ? (
              <span className="error-message">{errors.password}</span>
            ) : null}
          </div>
          <div className="buttonContainer">
            <ButtonRegister
              onValidation={handleRegister}
              disabled={isLoading}
            />
          </div>
        </form>
      </div>

      {showVerificationToast && (
        <EmailVerificationToast
          email={verificationEmail}
          onClose={handleToastClose}
        />
      )}
    </>
  );
}

export default Form;
