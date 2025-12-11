function ButtonRegister({ onValidation}) {
  const handleClick = async (e) => {
    e.preventDefault();           // ← КРИТИЧНО!
    if (onValidation) {
      await onValidation();       // ← ждём завершения
    }
  }

  return (
    <button className="buttonRegister" onClick={handleClick}>
      Registration
    </button>
  );
}

export default ButtonRegister;