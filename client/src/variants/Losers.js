import { ChessRules } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt } from "@/utils/alea";

export const VariantRules = class LosersRules extends ChessRules {
  static get HasFlags() {
    return false;
  }

  getPotentialPawnMoves([x, y]) {
    let moves = super.getPotentialPawnMoves([x, y]);

    // Complete with promotion(s) into king, if possible
    const color = this.turn;
    const shift = color == "w" ? -1 : 1;
    const lastRank = color == "w" ? 0 : V.size.x - 1;
    if (x + shift == lastRank) {
      // Normal move
      if (this.board[x + shift][y] == V.EMPTY)
        moves.push(
          this.getBasicMove([x, y], [x + shift, y], { c: color, p: V.KING })
        );
      // Captures
      if (
        y > 0 &&
        this.canTake([x, y], [x + shift, y - 1]) &&
        this.board[x + shift][y - 1] != V.EMPTY
      ) {
        moves.push(
          this.getBasicMove([x, y], [x + shift, y - 1], { c: color, p: V.KING })
        );
      }
      if (
        y < V.size.y - 1 &&
        this.canTake([x, y], [x + shift, y + 1]) &&
        this.board[x + shift][y + 1] != V.EMPTY
      ) {
        moves.push(
          this.getBasicMove([x, y], [x + shift, y + 1], { c: color, p: V.KING })
        );
      }
    }

    return moves;
  }

  getPotentialKingMoves(sq) {
    // No castle:
    return this.getSlideNJumpMoves(
      sq,
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
      "oneStep"
    );
  }

  // Stop at the first capture found (if any)
  atLeastOneCapture() {
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] != V.EMPTY && this.getColor(i, j) != oppCol) {
          const moves = this.getPotentialMovesFrom([i, j]);
          if (moves.length > 0) {
            for (let k = 0; k < moves.length; k++) {
              if (
                moves[k].vanish.length == 2 &&
                this.filterValid([moves[k]]).length > 0
              )
                return true;
            }
          }
        }
      }
    }
    return false;
  }

  // Trim all non-capturing moves
  static KeepCaptures(moves) {
    return moves.filter(m => {
      return m.vanish.length == 2;
    });
  }

  getPossibleMovesFrom(sq) {
    let moves = this.filterValid(this.getPotentialMovesFrom(sq));
    // This is called from interface: we need to know if a capture is possible
    if (this.atLeastOneCapture()) moves = V.KeepCaptures(moves);
    return moves;
  }

  getAllValidMoves() {
    let moves = super.getAllValidMoves();
    if (
      moves.some(m => {
        return m.vanish.length == 2;
      })
    )
      moves = V.KeepCaptures(moves);
    return moves;
  }

  underCheck() {
    return false; //No notion of check
  }

  getCheckSquares() {
    return [];
  }

  // No variables update because no royal king + no castling
  updateVariables() {}
  unupdateVariables() {}

  getCurrentScore() {
    if (this.atLeastOneMove())
      // game not over
      return "*";

    // No valid move: the side who cannot move wins
    return this.turn == "w" ? "1-0" : "0-1";
  }

  static get VALUES() {
    // Experimental...
    return {
      p: 1,
      r: 7,
      n: 3,
      b: 3,
      q: 5,
      k: 5
    };
  }

  static get SEARCH_DEPTH() {
    return 4;
  }

  evalPosition() {
    return -super.evalPosition(); //better with less material
  }

  static GenRandInitFen(randomness) {
    if (randomness == 0)
      return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w 0 -";

    let pieces = { w: new Array(8), b: new Array(8) };
    // Shuffle pieces on first and last rank
    for (let c of ["w", "b"]) {
      if (c == 'b' && randomness == 1) {
        pieces['b'] = pieces['w'];
        break;
      }

      let positions = ArrayFun.range(8);

      // Get random squares for bishops
      let randIndex = 2 * randInt(4);
      let bishop1Pos = positions[randIndex];
      // The second bishop must be on a square of different color
      let randIndex_tmp = 2 * randInt(4) + 1;
      let bishop2Pos = positions[randIndex_tmp];
      // Remove chosen squares
      positions.splice(Math.max(randIndex, randIndex_tmp), 1);
      positions.splice(Math.min(randIndex, randIndex_tmp), 1);

      // Get random squares for knights
      randIndex = randInt(6);
      let knight1Pos = positions[randIndex];
      positions.splice(randIndex, 1);
      randIndex = randInt(5);
      let knight2Pos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Get random square for queen
      randIndex = randInt(4);
      let queenPos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Random square for king (no castle)
      randIndex = randInt(3);
      let kingPos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Rooks positions are now fixed
      let rook1Pos = positions[0];
      let rook2Pos = positions[1];

      // Finally put the shuffled pieces in the board array
      pieces[c][rook1Pos] = "r";
      pieces[c][knight1Pos] = "n";
      pieces[c][bishop1Pos] = "b";
      pieces[c][queenPos] = "q";
      pieces[c][kingPos] = "k";
      pieces[c][bishop2Pos] = "b";
      pieces[c][knight2Pos] = "n";
      pieces[c][rook2Pos] = "r";
    }
    return (
      pieces["b"].join("") +
      "/pppppppp/8/8/8/8/PPPPPPPP/" +
      pieces["w"].join("").toUpperCase() +
      // En-passant allowed, but no flags
      " w 0 -"
    );
  }
};
