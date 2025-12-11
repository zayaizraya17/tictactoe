function ButtonSignIn({ onValidation }) {
  const handleClick = async (e) => {
    e.preventDefault();
    if (onValidation) {
      await onValidation();
    }
  };

  return (
    <button className="buttonSignIn" onClick={handleClick} type="button">
      Sign in
    </button>
  );
}

export default ButtonSignIn;
