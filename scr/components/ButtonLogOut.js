function ButtonLogOut() {
  const handleLogOut = () => {
    localStorage.removeItem("authToken");
    window.location.href = "/";
  };

  return (
    <button className="btn-logOut" onClick={handleLogOut}>
      Log Out
    </button>
  );
}

export default ButtonLogOut;
