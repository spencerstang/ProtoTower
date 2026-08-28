"use client";

import { useState } from "react";

export function PseudonymField(
  props: Readonly<{
    initialValue: string;
    suggestions: readonly string[];
  }>,
) {
  const [value, setValue] = useState(props.initialValue);

  function suggestAnother(): void {
    const currentIndex = props.suggestions.indexOf(value);
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % props.suggestions.length;
    setValue(props.suggestions[nextIndex] ?? props.initialValue);
  }

  return (
    <>
      <label htmlFor="pseudonym">Pseudonym</label>
      <input
        id="pseudonym"
        name="pseudonym"
        type="text"
        minLength={3}
        maxLength={40}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        autoComplete="nickname"
        required
      />
      <button className="text-action" type="button" onClick={suggestAnother}>
        Suggest another
      </button>
    </>
  );
}
