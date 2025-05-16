// App.tsx for a klondike solitaire game

import React, { useState, useEffect, useRef } from "react";
import { DndProvider, useDrag, useDrop, useDragLayer } from "react-dnd";
import { HTML5Backend, getEmptyImage } from "react-dnd-html5-backend";
import {
  BsSuitHeartFill,
  BsSuitDiamondFill,
  BsSuitClubFill,
  BsSuitSpadeFill,
} from "react-icons/bs";

type Suit = "HEARTS" | "DIAMONDS" | "CLUBS" | "SPADES";
type Rank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

interface CardType {
  suit: Suit;
  rank: Rank;
  isFaceUp: boolean;
}

interface FoundationPile {
  cards: CardType[];
}
interface TableauPile {
  cards: CardType[];
}

interface GameState {
  stock: CardType[];
  waste: CardType[];
  foundation: FoundationPile[];
  tableau: TableauPile[];
}

const SUITS: Suit[] = ["HEARTS", "DIAMONDS", "CLUBS", "SPADES"];
const RANKS: Rank[] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

const CARD_WIDTH = 100;
const CARD_HEIGHT = CARD_WIDTH * 1.4;
const CARD_OFFSET = 25;
const ROW_HEIGHT = CARD_HEIGHT + CARD_OFFSET * 8;
const GAP = 10;
const BOARD_WIDTH = CARD_WIDTH * 7 + GAP * 6;
const BOARD_HEIGHT = CARD_HEIGHT + ROW_HEIGHT + GAP;

const createDeck = (): CardType[] => {
  const deck: CardType[] = [];
  SUITS.forEach((s) =>
    RANKS.forEach((r) => deck.push({ suit: s, rank: r, isFaceUp: false }))
  );
  return deck;
};
const shuffleDeck = (deck: CardType[]): CardType[] => {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};
const initializeGame = (): GameState => {
  const deck = shuffleDeck(createDeck());
  const tableau: TableauPile[] = Array.from({ length: 7 }, () => ({
    cards: [],
  }));
  for (let i = 0; i < 7; i++) {
    for (let j = i; j < 7; j++) {
      const c = deck.pop()!;
      tableau[j].cards.push({ ...c, isFaceUp: j === i });
    }
  }
  return {
    stock: deck,
    waste: [],
    foundation: Array.from({ length: 4 }, () => ({ cards: [] })),
    tableau,
  };
};

const canMoveToFoundation = (card: CardType, pile: CardType[]) => {
  if (pile.length === 0) return card.rank === "A";
  const top = pile[pile.length - 1];
  return (
    card.suit === top.suit &&
    RANKS.indexOf(card.rank) === RANKS.indexOf(top.rank) + 1
  );
};
const canMoveToTableau = (card: CardType, pile: CardType[]) => {
  if (pile.length === 0) return card.rank === "K";
  const top = pile[pile.length - 1];
  const red = card.suit === "HEARTS" || card.suit === "DIAMONDS";
  const topRed = top.suit === "HEARTS" || top.suit === "DIAMONDS";
  return (
    red !== topRed && RANKS.indexOf(card.rank) === RANKS.indexOf(top.rank) - 1
  );
};

interface CardProps {
  card: CardType;
  index: number;
  spacing?: number;
  isDraggable: boolean;
  source: string;
  cards: CardType[];
  onClick: (c: CardType, s: string, i: number) => void;
  isPreview?: boolean;
}

const Card: React.FC<CardProps> = ({
  card,
  index,
  spacing = CARD_OFFSET,
  isDraggable,
  source,
  cards,
  onClick,
  isPreview = false,
}) => {
  const [, drag, preview] = useDrag(
    () => ({
      type: "CARD",
      item: { source, startIndex: index, cards: cards.slice(index) },
      canDrag: isDraggable,
    }),
    [source, index, cards, isDraggable]
  );
  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  const { isDragging, item } = useDragLayer((m) => ({
    isDragging: m.isDragging(),
    item: m.getItem() as any,
  }));
  const hidden =
    !isPreview &&
    isDragging &&
    item.source === source &&
    index >= item.startIndex;

  const SuitIcon = (() => {
    switch (card.suit) {
      case "HEARTS":
        return BsSuitHeartFill;
      case "DIAMONDS":
        return BsSuitDiamondFill;
      case "CLUBS":
        return BsSuitClubFill;
      case "SPADES":
        return BsSuitSpadeFill;
    }
  })()!;

  const color = card.isFaceUp
    ? card.suit === "HEARTS" || card.suit === "DIAMONDS"
      ? "red"
      : "black"
    : "white";

  const yOffset = source.startsWith("tableau") ? index * spacing : 0;

  return (
    <div
      ref={drag}
      onClick={() => card.isFaceUp && onClick(card, source, index)}
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        position: "absolute",
        top: yOffset,
        backgroundColor: card.isFaceUp ? "white" : "navy",
        border: "1px solid black",
        borderRadius: 8,
        cursor: isDraggable ? "move" : "default",
        opacity: hidden ? 0 : 1,
        color,
      }}
    >
      {card.isFaceUp ? (
        <>
          <div
            style={{
              position: "absolute",
              top: 4,
              left: 4,
              display: "flex",
              alignItems: "center",
              fontSize: 16,
            }}
          >
            <span>{card.rank}</span>
            <SuitIcon size={12} style={{ marginLeft: 2 }} />
          </div>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
            }}
          >
            <SuitIcon size={48} />
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 4,
              right: 4,
              display: "flex",
              alignItems: "center",
              fontSize: 16,
              transform: "rotate(180deg)",
            }}
          >
            <span>{card.rank}</span>
            <SuitIcon size={12} style={{ marginLeft: 2 }} />
          </div>
        </>
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: 24,
          }}
        >
          ?
        </div>
      )}
    </div>
  );
};

const CustomDragLayer: React.FC = () => {
  const { isDragging, item, currentOffset } = useDragLayer((m) => ({
    isDragging: m.isDragging(),
    item: m.getItem() as any,
    currentOffset: m.getSourceClientOffset(),
  }));
  if (!isDragging || !currentOffset) return null;
  const { x, y } = currentOffset;
  return (
    <div
      style={{
        position: "fixed",
        pointerEvents: "none",
        top: 0,
        left: 0,
        zIndex: 100,
      }}
    >
      <div style={{ transform: `translate(${x}px,${y}px)` }}>
        {item.cards.map((c: CardType, i: number) => (
          <Card
            key={`${c.suit}-${c.rank}-${i}-preview`}
            card={c}
            index={i}
            spacing={CARD_OFFSET}
            isDraggable={false}
            source={item.source}
            cards={item.cards}
            onClick={() => {}}
            isPreview
          />
        ))}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [game, setGame] = useState<GameState>(() => initializeGame());
  const boardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const update = () => {
      if (!boardRef.current) return;

      const parent = boardRef.current.parentElement!;
      const availableWidth = parent.clientWidth - 40;
      const topOffset = boardRef.current.getBoundingClientRect().top;
      const availableHeight = window.innerHeight - topOffset - 20;

      const scaleX = availableWidth / BOARD_WIDTH;
      const scaleY = availableHeight / BOARD_HEIGHT;
      setScale(Math.min(1, scaleX, scaleY));
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const handleStock = () => {
    const ng = { ...game };
    if (ng.stock.length === 0) {
      ng.stock = ng.waste.reverse().map((c) => ({ ...c, isFaceUp: false }));
      ng.waste = [];
    } else {
      const c = ng.stock.pop()!;
      ng.waste.push({ ...c, isFaceUp: true });
    }
    setGame(ng);
  };

  const moveCards = (
    card: CardType,
    source: string,
    idx: number,
    target: string
  ) => {
    const [srcType, srcIdxS] = source.split("-"),
      srcIdx = +srcIdxS;
    const [tgtType, tgtIdxS] = target.split("-"),
      tgtIdx = +tgtIdxS;

    let srcPile: CardType[];
    if (srcType === "waste") srcPile = game.waste;
    else if (srcType === "tableau") srcPile = game.tableau[srcIdx].cards;
    else if (srcType === "foundation") srcPile = game.foundation[srcIdx].cards;
    else return;

    const moving =
      srcType === "waste" || srcType === "foundation"
        ? [srcPile[srcPile.length - 1]]
        : srcPile.slice(idx);
    const first = moving[0];

    const tgtPile =
      tgtType === "foundation"
        ? game.foundation[tgtIdx].cards
        : game.tableau[tgtIdx].cards;

    const valid =
      tgtType === "foundation"
        ? canMoveToFoundation(first, tgtPile)
        : canMoveToTableau(first, tgtPile);
    if (!valid) return;

    const ng: GameState = {
      ...game,
      waste: [...game.waste],
      foundation: game.foundation.map((f) => ({ cards: [...f.cards] })),
      tableau: game.tableau.map((t) => ({ cards: [...t.cards] })),
    };

    if (srcType === "waste") ng.waste.pop();
    else if (srcType === "tableau") {
      ng.tableau[srcIdx].cards.splice(idx);
      const col = ng.tableau[srcIdx].cards;
      if (col.length) col[col.length - 1].isFaceUp = true;
    } else ng.foundation[srcIdx].cards.pop();

    if (tgtType === "foundation") ng.foundation[tgtIdx].cards.push(first);
    else ng.tableau[tgtIdx].cards.push(...moving);

    setGame(ng);
  };

  const handleCardClick = (card: CardType, source: string, index: number) => {
    const [srcType, srcIdxS] = source.split("-");
    const srcIdx = +srcIdxS;

    if (srcType !== "foundation") {
      for (let i = 0; i < game.foundation.length; i++) {
        if (canMoveToFoundation(card, game.foundation[i].cards)) {
          const ng: GameState = {
            ...game,
            waste: [...game.waste],
            foundation: game.foundation.map((f) => ({ cards: [...f.cards] })),
            tableau: game.tableau.map((t) => ({ cards: [...t.cards] })),
          };
          if (srcType === "waste") ng.waste.pop();
          else {
            ng.tableau[srcIdx].cards.splice(index, 1);
            const col = ng.tableau[srcIdx].cards;
            if (col.length) col[col.length - 1].isFaceUp = true;
          }
          ng.foundation[i].cards.push({ ...card });
          setGame(ng);
          return;
        }
      }
    }

    for (let i = 0; i < game.tableau.length; i++) {
      if (canMoveToTableau(card, game.tableau[i].cards)) {
        const ng: GameState = {
          ...game,
          waste: [...game.waste],
          foundation: game.foundation.map((f) => ({ cards: [...f.cards] })),
          tableau: game.tableau.map((t) => ({ cards: [...t.cards] })),
        };
        if (srcType === "waste") ng.waste.pop();
        else if (srcType === "tableau") {
          ng.tableau[srcIdx].cards.splice(index);
          const col = ng.tableau[srcIdx].cards;
          if (col.length) col[col.length - 1].isFaceUp = true;
        } else {
          ng.foundation[srcIdx].cards.pop();
        }
        ng.tableau[i].cards.push(
          ...(srcType === "waste"
            ? [card]
            : srcType === "foundation"
            ? [card]
            : game.tableau[srcIdx].cards
                .slice(index)
                .map((c) => ({ ...c, isFaceUp: true })))
        );
        setGame(ng);
        return;
      }
    }
  };

  const Pile: React.FC<{ index: number; type: "foundation" | "tableau" }> = ({
    index,
    type,
  }) => {
    const [{ isOver }, drop] = useDrop(
      () => ({
        accept: "CARD",
        drop: (item: any) =>
          moveCards(
            item.cards[0],
            item.source,
            item.startIndex,
            `${type}-${index}`
          ),
        collect: (m) => ({ isOver: m.isOver() }),
      }),
      [game]
    );

    const cards =
      type === "foundation"
        ? game.foundation[index].cards.slice(-1)
        : game.tableau[index].cards;

    const spacing =
      type === "tableau" && cards.length > 1
        ? Math.min(CARD_OFFSET, (ROW_HEIGHT - CARD_HEIGHT) / (cards.length - 1))
        : 0;

    return (
      <div
        ref={drop}
        style={{
          width: CARD_WIDTH,
          height: type === "foundation" ? CARD_HEIGHT : ROW_HEIGHT,
          border: "1px dashed gray",
          backgroundColor: isOver ? "lightgreen" : "white",
          position: "relative",
          overflow: "visible",
        }}
      >
        {cards.map((c, i) => (
          <Card
            key={`${c.suit}-${c.rank}-${i}-${type}`}
            card={c}
            index={i}
            spacing={spacing}
            isDraggable={c.isFaceUp}
            source={`${type}-${index}`}
            cards={cards}
            onClick={handleCardClick}
          />
        ))}
      </div>
    );
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <CustomDragLayer />
      <div style={{ padding: "0 20px 20px", overflowX: "hidden" }}>
        <h1>Klondike Solitaire</h1>
        <div
          ref={boardRef}
          style={{
            width: BOARD_WIDTH,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(7, ${CARD_WIDTH}px)`,
              gridTemplateRows: `auto ${ROW_HEIGHT}px`,
              gap: GAP,
            }}
          >
            <div
              onClick={handleStock}
              style={{
                gridColumn: 1,
                gridRow: 1,
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                position: "relative",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {game.stock.length > 0 ? (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    backgroundColor: "navy",
                    border: "1px solid black",
                    borderRadius: 5,
                  }}
                />
              ) : (
                <span>Reset</span>
              )}
            </div>

            <div
              style={{
                gridColumn: 2,
                gridRow: 1,
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                position: "relative",
              }}
            >
              {game.waste.length > 0 && (
                <Card
                  card={game.waste[game.waste.length - 1]}
                  index={game.waste.length - 1}
                  spacing={0}
                  isDraggable
                  source="waste"
                  cards={game.waste}
                  onClick={handleCardClick}
                />
              )}
            </div>

            <div style={{ gridColumn: 3, gridRow: 1 }} />

            {game.foundation.map((_, i) => (
              <div key={i} style={{ gridColumn: 4 + i, gridRow: 1 }}>
                <Pile index={i} type="foundation" />
              </div>
            ))}

            {game.tableau.map((_, i) => (
              <div key={i} style={{ gridColumn: 1 + i, gridRow: 2 }}>
                <Pile index={i} type="tableau" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </DndProvider>
  );
};

export default App;
