// TODO: implement shared Button component
export default function Button({ children, onClick, type = 'button', disabled = false }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
