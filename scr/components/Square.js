function Square({ value, onSquareClick, disabled, isWinning }) {
const square = `square ${value ? value.toLowerCase() : ''} ${isWinning ? 'winning' : ''}`;

  return (
    <button className={square} onClick={onSquareClick} disabled={disabled}>
      {value}
    </button>
  );
}

export default Square;
