import { ChessRules } from "@/base_rules";

export const VariantRules = class WormholeRules extends ChessRules {
  static get HasFlags() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  static get HOLE() {
    return "xx";
  }

  static board2fen(b) {
    if (b[0] == 'x') return 'x';
    return ChessRules.board2fen(b);
  }

  static fen2board(f) {
    if (f == 'x') return V.HOLE;
    return ChessRules.fen2board(f);
  }

  getPpath(b) {
    if (b[0] == 'x') return "Wormhole/hole";
    return b;
  }

  getSquareAfter(square, movement) {
    let shift1, shift2;
    if (Array.isArray(movement[0])) {
      // A knight
      shift1 = movement[0];
      shift2 = movement[1];
    } else {
      shift1 = movement;
      shift2 = null;
    }
    const tryMove = (init, shift) => {
      let step = [
        shift[0] / Math.abs(shift[0]) || 0,
        shift[1] / Math.abs(shift[1]) || 0,
      ];
      const nbSteps = Math.max(Math.abs(shift[0]), Math.abs(shift[1]));
      let stepsAchieved = 0;
      let sq = [init[0] + step[0], init[1] + step[1]];
      while (V.OnBoard(sq[0],sq[1])) {
        if (this.board[sq[0]][sq[1]] != V.HOLE)
          stepsAchieved++;
        if (stepsAchieved < nbSteps) {
          sq[0] += step[0];
          sq[1] += step[1];
        }
        else break;
      }
      if (stepsAchieved < nbSteps)
        // The move is impossible
        return null;
      return sq;
    };
    // First, apply shift1
    let dest = tryMove(square, shift1);
    if (dest && shift2)
      // A knight: apply second shift
      dest = tryMove(dest, shift2);
    return dest;
  }

  // NOTE (TODO?): some extra work done in some function because informations
  // on one step should ease the computation for a step in the same direction.
  static get steps() {
    return {
      r: [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
        [-2, 0],
        [2, 0],
        [0, -2],
        [0, 2]
      ],
      // Decompose knight movements into one step orthogonal + one diagonal
      n: [
        [[0, -1], [-1, -1]],
        [[0, -1], [1, -1]],
        [[-1, 0], [-1,-1]],
        [[-1, 0], [-1, 1]],
        [[0, 1], [-1, 1]],
        [[0, 1], [1, 1]],
        [[1, 0], [1, -1]],
        [[1, 0], [1, 1]]
      ],
      b: [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
        [-2, -2],
        [-2, 2],
        [2, -2],
        [2, 2]
      ],
      k: [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1]
      ]
    };
  }

  getJumpMoves([x, y], steps) {
    let moves = [];
    for (let step of steps) {
      const sq = this.getSquareAfter([x,y], step);
      if (sq &&
        (
          this.board[sq[0]][sq[1]] == V.EMPTY ||
          this.canTake([x, y], sq)
        )
      ) {
          moves.push(this.getBasicMove([x, y], sq));
      }
    }
    return moves;
  }

  // What are the pawn moves from square x,y ?
  getPotentialPawnMoves([x, y]) {
    const color = this.turn;
    let moves = [];
    const [sizeX, sizeY] = [V.size.x, V.size.y];
    const shiftX = color == "w" ? -1 : 1;
    const startRank = color == "w" ? sizeX - 2 : 1;
    const lastRank = color == "w" ? 0 : sizeX - 1;

    const sq1 = this.getSquareAfter([x,y], [shiftX,0]);
    if (sq1 && this.board[sq1[0]][y] == V.EMPTY) {
      // One square forward (cannot be a promotion)
      moves.push(this.getBasicMove([x, y], [sq1[0], y]));
      if (x == startRank) {
        // If two squares after is available, then move is possible
        const sq2 = this.getSquareAfter([x,y], [2*shiftX,0]);
        if (sq2 && this.board[sq2[0]][y] == V.EMPTY)
          // Two squares jump
          moves.push(this.getBasicMove([x, y], [sq2[0], y]));
      }
    }
    // Captures
    const finalPieces = x + shiftX == lastRank
      ? [V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN]
      : [V.PAWN];
    for (let shiftY of [-1, 1]) {
      const sq = this.getSquareAfter([x,y], [shiftX,shiftY]);
      if (
        sq &&
        this.board[sq[0]][sq[1]] != V.EMPTY &&
        this.canTake([x, y], [sq[0], sq[1]])
      ) {
        for (let piece of finalPieces) {
          moves.push(
            this.getBasicMove([x, y], [sq[0], sq[1]], {
              c: color,
              p: piece
            })
          );
        }
      }
    }

    return moves;
  }

  getPotentialRookMoves(sq) {
    return this.getJumpMoves(sq, V.steps[V.ROOK]);
  }

  getPotentialKnightMoves(sq) {
    return this.getJumpMoves(sq, V.steps[V.KNIGHT]);
  }

  getPotentialBishopMoves(sq) {
    return this.getJumpMoves(sq, V.steps[V.BISHOP]);
  }

  getPotentialQueenMoves(sq) {
    return this.getJumpMoves(
      sq,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP])
    );
  }

  getPotentialKingMoves(sq) {
    return this.getJumpMoves(sq, V.steps[V.KING]);
  }

  isAttackedByJump([x, y], colors, piece, steps) {
    for (let step of steps) {
      const sq = this.getSquareAfter([x,y], step);
      if (
        sq &&
        this.getPiece(sq[0], sq[1]) === piece &&
        colors.includes(this.getColor(sq[0], sq[1]))
      ) {
        return true;
      }
    }
    return false;
  }

  isAttackedByPawn([x, y], colors) {
    for (let c of colors) {
      const pawnShift = c == "w" ? 1 : -1;
      for (let i of [-1, 1]) {
        const sq = this.getSquareAfter([x,y], [pawnShift,i]);
        if (
          sq &&
          this.getPiece(sq[0], sq[1]) == V.PAWN &&
          this.getColor(sq[0], sq[1]) == c
        ) {
          return true;
        }
      }
    }
    return false;
  }

  isAttackedByRook(sq, colors) {
    return this.isAttackedByJump(sq, colors, V.ROOK, V.steps[V.ROOK]);
  }

  isAttackedByKnight(sq, colors) {
    // NOTE: knight attack is not symmetric in this variant:
    // steps order need to be reversed.
    return this.isAttackedByJump(
      sq,
      colors,
      V.KNIGHT,
      V.steps[V.KNIGHT].map(s => s.reverse())
    );
  }

  isAttackedByBishop(sq, colors) {
    return this.isAttackedByJump(sq, colors, V.BISHOP, V.steps[V.BISHOP]);
  }

  isAttackedByQueen(sq, colors) {
    return this.isAttackedByJump(
      sq,
      colors,
      V.QUEEN,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP])
    );
  }

  isAttackedByKing(sq, colors) {
    return this.isAttackedByJump(sq, colors, V.KING, V.steps[V.KING]);
  }

  // NOTE: altering move in getBasicMove doesn't work and wouldn't be logical.
  // This is a side-effect on board generated by the move.
  static PlayOnBoard(board, move) {
    board[move.vanish[0].x][move.vanish[0].y] = V.HOLE;
    for (let psq of move.appear) board[psq.x][psq.y] = psq.c + psq.p;
  }

  getCurrentScore() {
    if (this.atLeastOneMove())
      return "*";
    // No valid move: I lose
    return this.turn == "w" ? "0-1" : "1-0";
  }

  evalPosition() {
    let evaluation = 0;
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (![V.EMPTY,V.HOLE].includes(this.board[i][j])) {
          const sign = this.getColor(i, j) == "w" ? 1 : -1;
          evaluation += sign * V.VALUES[this.getPiece(i, j)];
        }
      }
    }
    return evaluation;
  }

  getNotation(move) {
    const piece = this.getPiece(move.start.x, move.start.y);
    // Indicate start square + dest square, because holes distort the board
    let notation =
      piece.toUpperCase() +
      V.CoordsToSquare(move.start) +
      (move.vanish.length > move.appear.length ? "x" : "") +
      V.CoordsToSquare(move.end);
    if (piece == V.PAWN && move.appear[0].p != V.PAWN)
      // Promotion
      notation += "=" + move.appear[0].p.toUpperCase();
    return notation;
  }
};
