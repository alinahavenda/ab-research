// TODO: implement — "Крок X з 4: Назва" progress bar (Version B only, H4)
export default function ProgressBar({ step, total, label }) {
  return (
    <div>
      Крок {step} з {total}: {label}
    </div>
  );
}
