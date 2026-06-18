import { useEffect, useState } from "react";

const TITLES = [
  "What do you want to build?",
  "Would you like a landing page?",
  "How should I design your website?",
];

export function AnimatedTitle() {
  const [idx, setIdx] = useState(0);
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setFlipping(true);
      setTimeout(() => {
        setIdx((i) => (i + 1) % TITLES.length);
        setFlipping(false);
      }, 280);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2 min-h-[2.75rem] sm:min-h-[3rem] [perspective:800px]">
      <span
        key={idx}
        className={`inline-block brand-text transition-transform duration-300 ease-out ${
          flipping ? "[transform:rotateX(90deg)] opacity-0" : "animate-flip-in"
        }`}
      >
        {TITLES[idx]}
      </span>
    </h1>
  );
}
