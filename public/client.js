document.addEventListener("DOMContentLoaded", async () => {
  let gameEnded = false;
  const completedGrids = new Set();

  const params = new URLSearchParams(globalThis.location.search);
  const query = params.get("q") ?? 1;

  const gameContainer = document.getElementById("game-container");
  const keyboard = document.getElementById("keyboard-buttons");

  const MAX_COLS = 5;
  const MAX_ROWS = query == 1 ? 6 : query == 2 ? 8 : 10;
  const keys = "QWERTYUIOPASDFGHJKLZXCVBNM";

  let currentRow = 0;
  let currentCol = 0;

  const classes = {
    base: [
      "text-[var(--color-termo-text)]",
      "font-[Mitr]",
      "cursor-pointer",
      "font-semibold",
      "rounded-md",
      "opacity-100",
    ],
    button: [
      "p-0",
      "w-6",
      "rounded",
      "bg-[var(--color-termo-key)]",
      "font-[Mitr]",
      "font-semibold",
      "last:w-fit",
      "last:px-2",
      "sm:p-1",
      "sm:w-10",
      "sm:h-10",
      "sm:text-lg",
      "transition",
      "duration-150",
      "ease-in-out",
    ],
    correct: [
      "bg-[var(--color-termo-correct)]",
      "border-[var(--color-termo-correct)]",
      "text-[var(--color-termo-absent)]",
    ],
    present: [
      "bg-[var(--color-termo-present)]",
      "border-[var(--color-termo-present)]",
      "text-[var(--color-termo-absent)]",
    ],
    incorrect: [
      "bg-[var(--color-termo-absent)]",
      "border-[var(--color-termo-absent)]",
      "text-[var(--color-termo-text)]",
    ],
    used: [
      "bg-[var(--color-termo-absent)]",
      "border-[var(--color-termo-absent)]",
      "bg-opacity-30",
    ],
    active: [
      "bg-[var(--color-termo-active)]",
      "border-[var(--color-termo-active)]",
      "text-[var(--color-termo-text)]",
    ],
    focus: [
      "bg-transparent",
      "border-[var(--color-termo-active)]",
      "text-[var(--color-termo-active)]",
    ],
  };

  let wordSet = new Set();
  async function fetchWord() {
    const res = await fetch("/word");
    const word = await res.text();
    return word;
  }

  const chosen = [];

  function createGameGrid(gridIndex) {
    const gridWrapper = document.createElement("div");
    gridWrapper.classList.add("mb-8");

    const grid = document.createElement("div");
    grid.classList.add("grid", "grid-rows-6", "gap-2", "mb-4");
    grid.dataset.gridIndex = gridIndex;

    for (let row = 0; row < MAX_ROWS; row++) {
      const rowDiv = document.createElement("div");
      rowDiv.classList.add("grid", "grid-cols-5", "gap-2");
      rowDiv.dataset.row = row;

      for (let col = 0; col < MAX_COLS; col++) {
        const cell = document.createElement("div");
        cell.classList.add(
          "size-12",
          "border-4",
          "text-3xl",
          "text-center",
          "flex",
          "items-center",
          "justify-center",
          "uppercase",
          "rounded-md",
        );
        if (row > 0) {
          cell.classList.add(...classes.active, "opacity-50");
        }

        cell.dataset.row = row;
        cell.dataset.col = col;
        cell.dataset.gridIndex = gridIndex;

        rowDiv.appendChild(cell);
      }
      grid.appendChild(rowDiv);
    }
    gridWrapper.appendChild(grid);
    return gridWrapper;
  }

  fetch("./wordlist").then((res) => res.text())
    .then((data) => {
      wordSet = new Set(
        data.split("\n").map((word) => word.trim().toUpperCase()),
      );
    });

  const isValidWord = (word) => wordSet.has(word.toUpperCase());

  function applyClass(element, type) {
    element.classList.remove(...Object.values(classes).flat());
    element.classList.add(...classes.base, ...classes[type]);
  }

  function createKeyboardButton(text, key) {
    const button = document.createElement("button");
    button.textContent = text;
    button.dataset.key = key;
    button.classList.add(...classes.button);
    keyboard.appendChild(button);
  }

  const updatedKeys = [...keys].slice(0, 19)
    .concat(["BACKSPACE"])
    .concat([...keys].slice(19))
    .concat(["ENTER"]);

  updatedKeys.forEach((key) => {
    createKeyboardButton(key === "BACKSPACE" ? "←" : key, key);
  });

  function updateFocus() {
    document.querySelectorAll("[data-grid-index]").forEach((grid) => {
      const rows = grid.querySelectorAll(".grid > .grid-cols-5");
      if (rows[currentRow]) {
        Array.from(rows[currentRow].children).forEach((cell, index) => {
          cell.classList.remove("opacity-50");
          applyClass(
            cell,
            index === currentCol ? "focus" : "active",
          );
        });
      }
    });
  }

  function handleBackspace(grids) {
    let cellCleared = false;

    grids.forEach((grid) => {
      const cell = grid.querySelector(
        `[data-row='${currentRow}'][data-col='${currentCol}']`,
      );
      if (cell && cell.textContent !== "") {
        cell.textContent = "";
        cellCleared = true;
      }
    });
    if (!cellCleared && currentCol > 0) currentCol--;
    updateFocus();
  }

  async function handleEnter(grids) {
    let allCorrect = true;
    let word;

    grids.forEach((grid, index) => {
      if (completedGrids.has(index)) return;

      word = Array.from(
        grid.querySelectorAll(`[data-row="${currentRow}"][data-col]`),
      )
        .map((cell) => cell.textContent.trim())
        .join("");

      if (word !== chosen[index]) allCorrect = false;
      else completedGrids.add(index);
    });

    if (!isValidWord(word)) {
      shakeRow(currentRow);
      return;
    }

    await Promise.all(
      chosen.map((chosenWord) => flipCells(currentRow, chosenWord)),
    );

    if (allCorrect || currentRow + 1 === MAX_ROWS) {
      gameEnded = true;
      await fetchModal();
    } else {
      currentRow++;
      currentCol = 0;
      updateFocus();
    }
  }

  async function startGame() {
    gameContainer.innerHTML = "";
    chosen.length = 0;
    currentRow = 0;
    currentCol = 0;
    gameEnded = false;
    lockedRows.clear();
    completedGrids.clear();

    document.querySelectorAll("#keyboard-buttons button").forEach((button) => {
      button.classList.remove(...Object.values(classes).flat());
      button.classList.add(...classes.button);
    });

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < query; i++) {
      chosen.push(await fetchWord());
      fragment.appendChild(createGameGrid(i));
    }
    gameContainer.appendChild(fragment);
    updateFocus();

    document.querySelectorAll(
      "[data-grid-index]:not([data-row]):not([data-col])",
    ).forEach((grid) => {
      const cells = grid.querySelectorAll("[data-row][data-col]");
      cells.forEach((cell) => {
        cell.addEventListener("click", () => {
          const rowIndex = parseInt(cell.dataset.row);
          const colIndex = parseInt(cell.dataset.col);
          selectCell(rowIndex, colIndex);
        });
      });
    });
  }

  function shakeRow(rowIndex) {
    document.querySelectorAll("[data-grid-index]").forEach((grid) => {
      const rows = grid.querySelectorAll(".grid > .grid-cols-5");
      if (rowIndex >= rows.length) return;

      const row = rows[rowIndex].children;
      Array.from(row).forEach((cell) => {
        cell.classList.add("animate-bounce");
        setTimeout(() => {
          cell.classList.remove("animate-bounce");
        }, 500);
      });
    });
  }

  function flipCells(rowIndex, chosenWord) {
    return Promise.all(
      Array.from(document.querySelectorAll("[data-grid-index]"), (grid) => {
        const rows = grid.querySelectorAll(".grid > .grid-cols-5");
        if (rowIndex >= rows.length) return Promise.resolve();

        const row = rows[rowIndex].children;

        return Promise.all(
          Array.from(row, (cell, index) => {
            const letter = cell.textContent.trim();
            const keyboardKey = keyboard.querySelector(
              `[data-key="${letter}"]`,
            );
            return new Promise((resolve) => {
              setTimeout(() => {
                if (chosenWord[index] === letter) {
                  applyClass(cell, "correct");
                  applyClass(keyboardKey, "correct");
                } else if (chosenWord.includes(letter)) {
                  applyClass(cell, "present");
                  if (!keyboardKey.classList.contains("bg-lime-500")) {
                    applyClass(keyboardKey, "present");
                  }
                } else {
                  applyClass(cell, "incorrect");
                  applyClass(keyboardKey, "used");
                }
                resolve();
              }, index * 450);
            });
          }),
        );
      }),
    );
  }

  function selectCell(rowIndex, colIndex) {
    if (rowIndex !== currentRow) return;

    currentRow = rowIndex;
    currentCol = colIndex;
    updateFocus();
  }

  function getCurrentWord() {
    const word = [];
    const grids = document.querySelectorAll(
      "[data-grid-index]:not([data-row]):not([data-col])",
    );
    grids.forEach((grid) => {
      grid
        .querySelectorAll(`[data-row='${currentRow}'][data-col]`)
        .forEach((cell) => {
          word.push(cell.textContent.trim());
        });
    });
    return word.join("");
  }

  function write(value) {
    if (gameEnded) return;
    const grids = document.querySelectorAll(
      "[data-grid-index]:not([data-row]):not([data-col])",
    );

    if (value === "BACKSPACE") return handleBackspace(grids);
    if (value === "ENTER") {
      const word = getCurrentWord();
      if (isValidWord(word)) {
        lockedRows.add(currentRow);
        return handleEnter(grids);
      } else {
        shakeRow(currentRow);
        return;
      }
    }

    if (keys.includes(value) && currentCol < MAX_COLS) {
      grids.forEach((grid) => {
        const cell = grid.querySelector(
          `[data-grid-index] [data-row='${currentRow}'][data-col='${currentCol}']`,
        );
        if (cell) {
          cell.textContent = value;
        }
      });
      if (currentCol + 1 < MAX_COLS) currentCol++;
    }

    updateFocus();
  }

  const lockedRows = new Set();

  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey) {
      if (
        keys.includes(event.key.toUpperCase()) ||
        ["BACKSPACE", "ENTER"].includes(
          event.key.toUpperCase(),
        )
      ) {
        return;
      }
    }

    if (event.key === "ArrowUp" && currentRow > 0) {
      return;
    } else if (event.key === "ArrowDown" && currentRow < MAX_ROWS - 1) {
      return;
    } else if (event.key === "ArrowLeft" && currentCol > 0) {
      currentCol--;
      updateFocus();
    } else if (event.key === "ArrowRight" && currentCol < MAX_COLS - 1) {
      currentCol++;
      updateFocus();
    }

    const key = event.key.toUpperCase();
    if (
      keys.includes(key) ||
      ["BACKSPACE", "ENTER"].includes(key)
    ) {
      if (lockedRows.has(currentRow) && key !== "ENTER") return;
      write(key);
      if (key === "ENTER") {
        const word = getCurrentWord();
        if (isValidWord(word)) {
          lockedRows.add(currentRow);
        } else {
          shakeRow(currentRow);
          return;
        }
      }
    }
  });

  keyboard.addEventListener("click", (event) => {
    const key = event.target.dataset.key;
    if (key) {
      if (lockedRows.has(currentRow) && key !== "ENTER") return;
      write(key);

      if (key === "ENTER") {
        const word = getCurrentWord();
        if (isValidWord(word)) {
          lockedRows.add(currentRow);
        } else {
          shakeRow(currentRow);
          return;
        }
      }
    }
  });

  updateFocus();
  await startGame();

  document.querySelectorAll(
    "[data-grid-index]:not([data-row]):not([data-col])",
  ).forEach((grid) => {
    const cells = grid.querySelectorAll("[data-row][data-col]");
    cells.forEach((cell) => {
      cell.addEventListener("click", () => {
        const rowIndex = parseInt(cell.dataset.row);
        const colIndex = parseInt(cell.dataset.col);
        selectCell(rowIndex, colIndex);
      });
    });
  });

  async function fetchModal() {
    const res = await fetch("./modal.html");
    const modal = await res.text();

    const modalElement = document.getElementById("modal");
    modalElement.innerHTML = modal;

    const staticModal = document.getElementById("static-modal");
    const closeButton = staticModal.querySelector("[data-modal-hide]");
    const playAgainButton = staticModal.querySelectorAll(
      "#play-again",
    );

    function closeModal() {
      staticModal.classList.add("hidden");
    }

    closeButton.addEventListener("click", closeModal);
    playAgainButton.forEach((btn) => {
      btn.addEventListener("click", async () => {
        closeModal();
        await startGame();
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeModal();
      }
    });

    let allCorrect = true;
    const wordsAttempted = [];

    document.querySelectorAll(
      "[data-grid-index]:not([data-row]):not([data-col])",
    ).forEach((grid, index) => {
      let word = "";
      grid.querySelectorAll(`[data-row='${currentRow}'] [data-col]`).forEach(
        (cell) => {
          word += cell.textContent.trim();
        },
      );

      wordsAttempted.push(word);
      if (word !== chosen[index]) allCorrect = false;
    });

    const resultMessage = document.getElementById("game-result-message");
    const attemptsText = document.getElementById("attempts-text");
    const revealedWord = document.getElementById("revealed-word");

    if (allCorrect) {
      resultMessage.textContent = "Great job! You guessed all words.";
      attemptsText.textContent = `You solved it in ${
        currentRow + 1
      } attempts. Well done!`;
      revealedWord.innerHTML = "";
    } else {
      resultMessage.textContent = "Game Over! Better luck next time!";
      attemptsText.textContent =
        `You reached the max attempts (${MAX_ROWS}). Keep practicing!`;
      revealedWord.innerHTML =
        `<span class="text-gray-500 font-semibold">The words were: </span><span id="actual-word" class="font-semibold">${
          chosen.join(", ")
        }</span>`;
      revealedWord.classList.add("text-6xl", "font-extrabold", "text-red-500");
    }
  }
});
