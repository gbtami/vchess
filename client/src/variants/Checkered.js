import { ChessRules } from "@/base_rules";

export const VariantRules = class CheckeredRules extends ChessRules {
  static board2fen(b) {
    const checkered_codes = {
      p: "s",
      q: "t",
      r: "u",
      b: "c",
      n: "o"
    };
    if (b[0] == "c") return checkered_codes[b[1]];
    return ChessRules.board2fen(b);
  }

  static fen2board(f) {
    // Tolerate upper-case versions of checkered pieces (why not?)
    const checkered_pieces = {
      s: "p",
      S: "p",
      t: "q",
      T: "q",
      u: "r",
      U: "r",
      c: "b",
      C: "b",
      o: "n",
      O: "n"
    };
    if (Object.keys(checkered_pieces).includes(f))
      return "c" + checkered_pieces[f];
    return ChessRules.fen2board(f);
  }

  static get PIECES() {
    return ChessRules.PIECES.concat(["s", "t", "u", "c", "o"]);
  }

  getPpath(b) {
    return (b[0] == "c" ? "Checkered/" : "") + b;
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    // Local stack of non-capturing checkered moves:
    this.cmoves = [];
    const cmove = fen.split(" ")[5];
    if (cmove == "-") this.cmoves.push(null);
    else {
      this.cmoves.push({
        start: ChessRules.SquareToCoords(cmove.substr(0, 2)),
        end: ChessRules.SquareToCoords(cmove.substr(2))
      });
    }
  }

  static IsGoodFen(fen) {
    if (!ChessRules.IsGoodFen(fen)) return false;
    const fenParts = fen.split(" ");
    if (fenParts.length != 6) return false;
    if (fenParts[5] != "-" && !fenParts[5].match(/^([a-h][1-8]){2}$/))
      return false;
    return true;
  }

  static IsGoodFlags(flags) {
    // 4 for castle + 16 for pawns
    return !!flags.match(/^[01]{20,20}$/);
  }

  setFlags(fenflags) {
    super.setFlags(fenflags); //castleFlags
    this.pawnFlags = {
      w: [...Array(8).fill(true)], //pawns can move 2 squares?
      b: [...Array(8).fill(true)]
    };
    const flags = fenflags.substr(4); //skip first 4 digits, for castle
    for (let c of ["w", "b"]) {
      for (let i = 0; i < 8; i++)
        this.pawnFlags[c][i] = flags.charAt((c == "w" ? 0 : 8) + i) == "1";
    }
  }

  aggregateFlags() {
    return [this.castleFlags, this.pawnFlags];
  }

  disaggregateFlags(flags) {
    this.castleFlags = flags[0];
    this.pawnFlags = flags[1];
  }

  getCmove(move) {
    if (move.appear[0].c == "c" && move.vanish.length == 1)
      return { start: move.start, end: move.end };
    return null;
  }

  canTake([x1, y1], [x2, y2]) {
    const color1 = this.getColor(x1, y1);
    const color2 = this.getColor(x2, y2);
    // Checkered aren't captured
    return (
      color1 != color2 &&
      color2 != "c" &&
      (color1 != "c" || color2 != this.turn)
    );
  }

  // Post-processing: apply "checkerization" of standard moves
  getPotentialMovesFrom([x, y]) {
    let standardMoves = super.getPotentialMovesFrom([x, y]);
    const lastRank = this.turn == "w" ? 0 : 7;
    // King has to be treated differently (for castles)
    if (this.getPiece(x, y) == V.KING) return standardMoves;
    let moves = [];
    standardMoves.forEach(m => {
      if (m.vanish[0].p == V.PAWN) {
        if (
          Math.abs(m.end.x - m.start.x) == 2 &&
          !this.pawnFlags[this.turn][m.start.y]
        )
          return; //skip forbidden 2-squares jumps
        if (
          this.board[m.end.x][m.end.y] == V.EMPTY &&
          m.vanish.length == 2 &&
          this.getColor(m.start.x, m.start.y) == "c"
        ) {
          return; //checkered pawns cannot take en-passant
        }
      }
      if (m.vanish.length == 1) moves.push(m);
      // No capture
      else {
        // A capture occured (m.vanish.length == 2)
        m.appear[0].c = "c";
        moves.push(m);
        if (
          m.appear[0].p != m.vanish[1].p && //avoid promotions (already treated):
          (m.vanish[0].p != V.PAWN || m.end.x != lastRank)
        ) {
          // Add transformation into captured piece
          let m2 = JSON.parse(JSON.stringify(m));
          m2.appear[0].p = m.vanish[1].p;
          moves.push(m2);
        }
      }
    });
    return moves;
  }

  canIplay(side, [x, y]) {
    return side == this.turn && [side, "c"].includes(this.getColor(x, y));
  }

  // Does m2 un-do m1 ? (to disallow undoing checkered moves)
  oppositeMoves(m1, m2) {
    return (
      m1 &&
      m2.appear[0].c == "c" &&
      m2.appear.length == 1 &&
      m2.vanish.length == 1 &&
      m1.start.x == m2.end.x &&
      m1.end.x == m2.start.x &&
      m1.start.y == m2.end.y &&
      m1.end.y == m2.start.y
    );
  }

  filterValid(moves) {
    if (moves.length == 0) return [];
    const color = this.turn;
    const L = this.cmoves.length; //at least 1: init from FEN
    return moves.filter(m => {
      if (this.oppositeMoves(this.cmoves[L - 1], m)) return false;
      this.play(m);
      const res = !this.underCheck(color);
      this.undo(m);
      return res;
    });
  }

  getAllValidMoves() {
    const oppCol = V.GetOppCol(this.turn);
    let potentialMoves = [];
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        // NOTE: just testing == color isn't enough because of checkred pieces
        if (this.board[i][j] != V.EMPTY && this.getColor(i, j) != oppCol) {
          Array.prototype.push.apply(
            potentialMoves,
            this.getPotentialMovesFrom([i, j])
          );
        }
      }
    }
    return this.filterValid(potentialMoves);
  }

  atLeastOneMove() {
    const oppCol = V.GetOppCol(this.turn);
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        // NOTE: just testing == color isn't enough because of checkred pieces
        if (this.board[i][j] != V.EMPTY && this.getColor(i, j) != oppCol) {
          const moves = this.getPotentialMovesFrom([i, j]);
          if (moves.length > 0) {
            for (let k = 0; k < moves.length; k++) {
              if (this.filterValid([moves[k]]).length > 0) return true;
            }
          }
        }
      }
    }
    return false;
  }

  isAttackedByPawn([x, y], colors) {
    for (let c of colors) {
      const color = c == "c" ? this.turn : c;
      let pawnShift = color == "w" ? 1 : -1;
      if (x + pawnShift >= 0 && x + pawnShift < 8) {
        for (let i of [-1, 1]) {
          if (
            y + i >= 0 &&
            y + i < 8 &&
            this.getPiece(x + pawnShift, y + i) == V.PAWN &&
            this.getColor(x + pawnShift, y + i) == c
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  underCheck(color) {
    return this.isAttacked(this.kingPos[color], [V.GetOppCol(color), "c"]);
  }

  getCheckSquares(color) {
    // Artifically change turn, for checkered pawns
    this.turn = V.GetOppCol(color);
    const kingAttacked = this.isAttacked(this.kingPos[color], [
      V.GetOppCol(color),
      "c"
    ]);
    let res = kingAttacked
      ? [JSON.parse(JSON.stringify(this.kingPos[color]))] //need to duplicate!
      : [];
    this.turn = color;
    return res;
  }

  updateVariables(move) {
    super.updateVariables(move);
    // Does this move turn off a 2-squares pawn flag?
    const secondRank = [1, 6];
    if (secondRank.includes(move.start.x) && move.vanish[0].p == V.PAWN)
      this.pawnFlags[move.start.x == 6 ? "w" : "b"][move.start.y] = false;
  }

  getCurrentScore() {
    if (this.atLeastOneMove())
      // game not over
      return "*";

    const color = this.turn;
    // Artifically change turn, for checkered pawns
    this.turn = V.GetOppCol(this.turn);
    const res = this.isAttacked(this.kingPos[color], [V.GetOppCol(color), "c"])
      ? color == "w"
        ? "0-1"
        : "1-0"
      : "1/2";
    this.turn = V.GetOppCol(this.turn);
    return res;
  }

  evalPosition() {
    let evaluation = 0;
    // Just count material for now, considering checkered neutral (...)
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] != V.EMPTY) {
          const sqColor = this.getColor(i, j);
          if (["w","b"].includes(sqColor)) {
            const sign = sqColor == "w" ? 1 : -1;
            evaluation += sign * V.VALUES[this.getPiece(i, j)];
          }
        }
      }
    }
    return evaluation;
  }

  static GenRandInitFen(randomness) {
    return ChessRules.GenRandInitFen(randomness)
      // Add 16 pawns flags + empty cmove:
      .replace(" w 0 1111", " w 0 11111111111111111111 -");
  }

  static ParseFen(fen) {
    return Object.assign({}, ChessRules.ParseFen(fen), {
      cmove: fen.split(" ")[5]
    });
  }

  getFen() {
    const L = this.cmoves.length;
    const cmoveFen = !this.cmoves[L - 1]
      ? "-"
      : ChessRules.CoordsToSquare(this.cmoves[L - 1].start) +
        ChessRules.CoordsToSquare(this.cmoves[L - 1].end);
    return super.getFen() + " " + cmoveFen;
  }

  getFlagsFen() {
    let fen = super.getFlagsFen();
    // Add pawns flags
    for (let c of ["w", "b"]) {
      for (let i = 0; i < 8; i++) fen += this.pawnFlags[c][i] ? "1" : "0";
    }
    return fen;
  }

  // TODO (design): this cmove update here or in (un)updateVariables ?
  play(move) {
    this.cmoves.push(this.getCmove(move));
    super.play(move);
  }

  undo(move) {
    this.cmoves.pop();
    super.undo(move);
  }

  getNotation(move) {
    if (move.appear.length == 2) {
      // Castle
      if (move.end.y < move.start.y) return "0-0-0";
      return "0-0";
    }

    // Translate final square
    const finalSquare = V.CoordsToSquare(move.end);

    const piece = this.getPiece(move.start.x, move.start.y);
    if (piece == V.PAWN) {
      // Pawn move
      let notation = "";
      if (move.vanish.length > 1) {
        // Capture
        const startColumn = V.CoordToColumn(move.start.y);
        notation =
          startColumn +
          "x" +
          finalSquare +
          "=" +
          move.appear[0].p.toUpperCase();
      } //no capture
      else {
        notation = finalSquare;
        if (move.appear.length > 0 && piece != move.appear[0].p)
          //promotion
          notation += "=" + move.appear[0].p.toUpperCase();
      }
      return notation;
    }
    // Piece movement
    return (
      piece.toUpperCase() +
      (move.vanish.length > 1 ? "x" : "") +
      finalSquare +
      (move.vanish.length > 1 ? "=" + move.appear[0].p.toUpperCase() : "")
    );
  }
};
