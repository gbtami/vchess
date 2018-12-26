// NOTE: initial setup differs from the original; see
// https://www.chessvariants.com/large.dir/freeling.html
class GrandRules extends ChessRules
{
	static getPpath(b)
	{
		return ([V.MARSHALL,V.CARDINAL].includes(b[1]) ? "Grand/" : "") + b;
	}

	static IsGoodFen(fen)
	{
		if (!ChessRules.IsGoodFen(fen))
			return false;
		const fenParsed = V.ParseFen(fen);
		// 5) Check captures
		if (!fenParsed.captured || !fenParsed.captured.match(/^[0-9]{10,10}$/))
			return false;
		return true;
	}

	static IsGoodEnpassant(enpassant)
	{
		if (enpassant != "-")
		{
			const squares = enpassant.split(",");
			if (squares.length > 2)
				return false;
			for (let sq of squares)
			{
				const ep = V.SquareToCoords(sq);
				if (isNaN(ep.x) || !V.OnBoard(ep))
					return false;
			}
		}
		return true;
	}

	static ParseFen(fen)
	{
		const fenParts = fen.split(" ");
		return Object.assign(
			ChessRules.ParseFen(fen),
			{ captured: fenParts[4] }
		);
	}

	getFen()
	{
		return super.getFen() + " " + this.getCapturedFen();
	}

	getCapturedFen()
	{
		let counts = _.map(_.range(10), 0);
		for (let i=0; i<V.PIECES.length-1; i++) //-1: no king captured
		{
			counts[i] = this.captured["w"][V.PIECES[i]];
			counts[5+i] = this.captured["b"][V.PIECES[i]];
		}
		return counts.join("");
	}

	setOtherVariables(fen)
	{
		super.setOtherVariables(fen);
		const fenParsed = V.ParseFen(fen);
		// Initialize captured pieces' counts from FEN
		this.captured =
		{
			"w":
			{
				[V.PAWN]: parseInt(fenParsed.captured[0]),
				[V.ROOK]: parseInt(fenParsed.captured[1]),
				[V.KNIGHT]: parseInt(fenParsed.captured[2]),
				[V.BISHOP]: parseInt(fenParsed.captured[3]),
				[V.QUEEN]: parseInt(fenParsed.captured[4]),
			},
			"b":
			{
				[V.PAWN]: parseInt(fenParsed.captured[5]),
				[V.ROOK]: parseInt(fenParsed.captured[6]),
				[V.KNIGHT]: parseInt(fenParsed.captured[7]),
				[V.BISHOP]: parseInt(fenParsed.captured[8]),
				[V.QUEEN]: parseInt(fenParsed.captured[9]),
			}
		};
	}

	static get size() { return {x:10,y:10}; }

	static get MARSHALL() { return 'm'; } //rook+knight
	static get CARDINAL() { return 'c'; } //bishop+knight

	static get PIECES()
	{
		return ChessRules.PIECES.concat([V.MARSHALL,V.CARDINAL]);
	}

	// There may be 2 enPassant squares (if pawn jump 3 squares)
	getEnpassantFen()
	{
		const L = this.epSquares.length;
		if (!this.epSquares[L-1])
			return "-"; //no en-passant
		let res = "";
		this.epSquares[L-1].forEach(sq => {
			res += V.CoordsToSquare(sq) + ",";
		});
		return res.slice(0,-1); //remove last comma
	}

	// En-passant after 2-sq or 3-sq jumps
	getEpSquare(moveOrSquare)
	{
		if (!moveOrSquare)
			return undefined;
		if (typeof moveOrSquare === "string")
		{
			const square = moveOrSquare;
			if (square == "-")
				return undefined;
			let res = [];
			square.split(",").forEach(sq => {
				res.push(V.SquareToCoords(sq));
			});
			return res;
		}
		// Argument is a move:
		const move = moveOrSquare;
		const [sx,sy,ex] = [move.start.x,move.start.y,move.end.x];
		if (this.getPiece(sx,sy) == V.PAWN && Math.abs(sx - ex) >= 2)
		{
			const step = (ex-sx) / Math.abs(ex-sx);
			let res = [{
				x: sx + step,
				y: sy
			}];
			if (sx + 2*step != ex) //3-squares move
			{
				res.push({
					x: sx + 2*step,
					y: sy
				});
			}
			return res;
		}
		return undefined; //default
	}

	getPotentialMovesFrom([x,y])
	{
		switch (this.getPiece(x,y))
		{
			case V.MARSHALL:
				return this.getPotentialMarshallMoves([x,y]);
			case V.CARDINAL:
				return this.getPotentialCardinalMoves([x,y]);
			default:
				return super.getPotentialMovesFrom([x,y])
		}
	}

	// Special pawn rules: promotions to captured friendly pieces,
	// optional on ranks 8-9 and mandatory on rank 10.
	getPotentialPawnMoves([x,y])
	{
		const color = this.turn;
		let moves = [];
		const [sizeX,sizeY] = [V.size.x,V.size.y];
		const shift = (color == "w" ? -1 : 1);
		const startRanks = (color == "w" ? [sizeX-2,sizeX-3] : [1,2]);
		const lastRanks = (color == "w" ? [0,1,2] : [sizeX-1,sizeX-2,sizeX-3]);

		if (x+shift >= 0 && x+shift < sizeX && x+shift != lastRanks[0])
		{
			// Normal moves
			if (this.board[x+shift][y] == V.EMPTY)
			{
				moves.push(this.getBasicMove([x,y], [x+shift,y]));
				if (startRanks.includes(x) && this.board[x+2*shift][y] == V.EMPTY)
				{
					// Two squares jump
					moves.push(this.getBasicMove([x,y], [x+2*shift,y]));
					if (x == startRanks[0] && this.board[x+3*shift][y] == V.EMPTY)
					{
						// 3-squares jump
						moves.push(this.getBasicMove([x,y], [x+3*shift,y]));
					}
				}
			}
			// Captures
			if (y>0 && this.canTake([x,y], [x+shift,y-1])
				&& this.board[x+shift][y-1] != V.EMPTY)
			{
				moves.push(this.getBasicMove([x,y], [x+shift,y-1]));
			}
			if (y<sizeY-1 && this.canTake([x,y], [x+shift,y+1])
				&& this.board[x+shift][y+1] != V.EMPTY)
			{
				moves.push(this.getBasicMove([x,y], [x+shift,y+1]));
			}
		}

		if (lastRanks.includes(x+shift))
		{
			// Promotion
			let promotionPieces = [V.ROOK,V.KNIGHT,V.BISHOP,V.QUEEN,V.MARSHALL,V.CARDINAL];
			promotionPieces.forEach(p => {
				if (this.captured[color][p]==0)
					return;
				// Normal move
				if (this.board[x+shift][y] == V.EMPTY)
					moves.push(this.getBasicMove([x,y], [x+shift,y], {c:color,p:p}));
				// Captures
				if (y>0 && this.canTake([x,y], [x+shift,y-1])
					&& this.board[x+shift][y-1] != V.EMPTY)
				{
					moves.push(this.getBasicMove([x,y], [x+shift,y-1], {c:color,p:p}));
				}
				if (y<sizeY-1 && this.canTake([x,y], [x+shift,y+1])
					&& this.board[x+shift][y+1] != V.EMPTY)
				{
					moves.push(this.getBasicMove([x,y], [x+shift,y+1], {c:color,p:p}));
				}
			});
		}

		// En passant
		const Lep = this.epSquares.length;
		const epSquare = Lep>0 ? this.epSquares[Lep-1] : undefined;
		if (!!epSquare)
		{
			for (let epsq of epSquare)
			{
				// TODO: some redundant checks
				if (epsq.x == x+shift && Math.abs(epsq.y - y) == 1)
				{
					var enpassantMove = this.getBasicMove([x,y], [x+shift,epsq.y]);
					enpassantMove.vanish.push({
						x: x,
						y: epsq.y,
						p: 'p',
						c: this.getColor(x,epsq.y)
					});
					moves.push(enpassantMove);
				}
			}
		}

		return moves;
	}

	// TODO: different castle?

	getPotentialMarshallMoves(sq)
	{
		return this.getSlideNJumpMoves(sq, V.steps[V.ROOK]).concat(
			this.getSlideNJumpMoves(sq, V.steps[V.KNIGHT], "oneStep"));
	}

	getPotentialCardinalMoves(sq)
	{
		return this.getSlideNJumpMoves(sq, V.steps[V.BISHOP]).concat(
			this.getSlideNJumpMoves(sq, V.steps[V.KNIGHT], "oneStep"));
	}

	isAttacked(sq, colors)
	{
		return super.isAttacked(sq, colors)
			|| this.isAttackedByMarshall(sq, colors)
			|| this.isAttackedByCardinal(sq, colors);
	}

	isAttackedByMarshall(sq, colors)
	{
		return this.isAttackedBySlideNJump(sq, colors, V.MARSHALL, V.steps[V.ROOK])
			|| this.isAttackedBySlideNJump(
				sq, colors, V.MARSHALL, V.steps[V.KNIGHT], "oneStep");
	}

	isAttackedByCardinal(sq, colors)
	{
		return this.isAttackedBySlideNJump(sq, colors, V.CARDINAL, V.steps[V.BISHOP])
			|| this.isAttackedBySlideNJump(
				sq, colors, V.CARDINAL, V.steps[V.KNIGHT], "oneStep");
	}

	updateVariables(move)
	{
		super.updateVariables(move);
		if (move.vanish.length==2 && move.appear.length==1 && move.vanish[1].p != V.PAWN)
		{
			// Capture: update this.captured
			this.captured[move.vanish[1].c][move.vanish[1].p]++;
		}
	}

	unupdateVariables(move)
	{
		super.unupdateVariables(move);
		if (move.vanish.length==2 && move.appear.length==1 && move.vanish[1].p != V.PAWN)
			this.captured[move.vanish[1].c][move.vanish[1].p]--;
	}

	static get VALUES()
	{
		return Object.assign(
			ChessRules.VALUES,
			{'c': 5, 'm': 7} //experimental
		);
	}

	static get SEARCH_DEPTH() { return 2; }

	// TODO: this function could be generalized and shared better (how ?!...)
	static GenRandInitFen()
	{
		let pieces = { "w": new Array(10), "b": new Array(10) };
		// Shuffle pieces on first and last rank
		for (let c of ["w","b"])
		{
			let positions = _.range(10);

			// Get random squares for bishops
			let randIndex = 2 * _.random(4);
			let bishop1Pos = positions[randIndex];
			// The second bishop must be on a square of different color
			let randIndex_tmp = 2 * _.random(4) + 1;
			let bishop2Pos = positions[randIndex_tmp];
			// Remove chosen squares
			positions.splice(Math.max(randIndex,randIndex_tmp), 1);
			positions.splice(Math.min(randIndex,randIndex_tmp), 1);

			// Get random squares for knights
			randIndex = _.random(7);
			let knight1Pos = positions[randIndex];
			positions.splice(randIndex, 1);
			randIndex = _.random(6);
			let knight2Pos = positions[randIndex];
			positions.splice(randIndex, 1);

			// Get random square for queen
			randIndex = _.random(5);
			let queenPos = positions[randIndex];
			positions.splice(randIndex, 1);

			// ...random square for marshall
			randIndex = _.random(4);
			let marshallPos = positions[randIndex];
			positions.splice(randIndex, 1);

			// ...random square for cardinal
			randIndex = _.random(3);
			let cardinalPos = positions[randIndex];
			positions.splice(randIndex, 1);

			// Rooks and king positions are now fixed, because of the ordering rook-king-rook
			let rook1Pos = positions[0];
			let kingPos = positions[1];
			let rook2Pos = positions[2];

			// Finally put the shuffled pieces in the board array
			pieces[c][rook1Pos] = 'r';
			pieces[c][knight1Pos] = 'n';
			pieces[c][bishop1Pos] = 'b';
			pieces[c][queenPos] = 'q';
			pieces[c][marshallPos] = 'm';
			pieces[c][cardinalPos] = 'c';
			pieces[c][kingPos] = 'k';
			pieces[c][bishop2Pos] = 'b';
			pieces[c][knight2Pos] = 'n';
			pieces[c][rook2Pos] = 'r';
		}
		return pieces["b"].join("") +
			"/pppppppppp/10/10/10/10/10/10/PPPPPPPPPP/" +
			pieces["w"].join("").toUpperCase() +
			" w 1111 - 0000000000";
	}
}

const VariantRules = GrandRules;
