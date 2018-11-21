class MagneticRules extends ChessRules
{
	getEpSquare(move)
	{
		return undefined; //no en-passant
	}

	getPotentialMovesFrom([x,y])
	{
		let standardMoves = super.getPotentialMovesFrom([x,y]);
		let moves = [];
		standardMoves.forEach(m => {
			let newMove_s = this.applyMagneticLaws(m);
			if (newMove_s.length == 1)
				moves.push(newMove_s[0]);
			else //promotion
				moves = moves.concat(moves, newMove_s);
		});
		return moves;
	}

	// Complete a move with magnetic actions
	applyMagneticLaws(move)
	{
		const V = VariantRules;
		if (move.appear[0].p == V.KING && move.appear.length==1)
			return [move]; //kings are not charged
		const aIdx = (move.appear[0].p != V.KING ? 0 : 1); //if castling, rook is charged
		const [x,y] = [move.appear[aIdx].x, move.appear[aIdx].y];
		const color = this.turn;
		const lastRank = (color=="w" ? 0 : 7);
		const standardMove = JSON.parse(JSON.stringify(move));
		this.play(standardMove);
		const [sizeX,sizeY] = V.size;
		for (let step of [[-1,0],[1,0],[0,-1],[0,1]])
		{
			let [i,j] = [x+step[0],y+step[1]];
			while (i>=0 && i<sizeX && j>=0 && j<sizeY)
			{
				if (this.board[i][j] != V.EMPTY)
				{
					// Found something. Same color or not?
					if (this.getColor(i,j) != color)
					{
						// Attraction
						if ((Math.abs(i-x)>=2 || Math.abs(j-y)>=2)
							&& this.getPiece(i,j) != V.KING)
						{
							move.vanish.push(
								new PiPo({
									p:this.getPiece(i,j),
									c:this.getColor(i,j),
									x:i,
									y:j
								})
							);
							move.appear.push(
								new PiPo({
									p:this.getPiece(i,j),
									c:this.getColor(i,j),
									x:x+step[0],
									y:y+step[1]
								})
							);
						}
					}
					else
					{
						// Repulsion
						if (this.getPiece(i,j) != V.KING)
						{
							// Push it until we meet an obstacle or edge of the board
							let [ii,jj] = [i+step[0],j+step[1]];
							while (ii>=0 && ii<sizeX && jj>=0 && jj<sizeY)
							{
								if (this.board[ii][jj] != V.EMPTY)
									break;
								ii += step[0];
								jj += step[1];
							}
							ii -= step[0];
							jj -= step[1];
							if (Math.abs(ii-i)>=1 || Math.abs(jj-j)>=1)
							{
								move.vanish.push(
									new PiPo({
										p:this.getPiece(i,j),
										c:this.getColor(i,j),
										x:i,
										y:j
									})
								);
								move.appear.push(
									new PiPo({
										p:this.getPiece(i,j),
										c:this.getColor(i,j),
										x:ii,
										y:jj
									})
								);
							}
						}
					}
					break;
				}
				i += step[0];
				j += step[1];
			}
		}
		this.undo(standardMove);
		let moves = [];
		// Scan move for pawn (max 1) on 8th rank
		for (let i=1; i<move.appear.length; i++)
		{
			if (move.appear[i].p==V.PAWN && move.appear[i].x==lastRank)
			{
				move.appear[i].p = V.ROOK;
				moves.push(move);
				for (let piece of [V.KNIGHT, V.BISHOP, V.QUEEN])
				{
					let cmove = JSON.parse(JSON.stringify(move));
					cmove.appear[i].p = piece;
					moves.push(cmove);
				}
				// Swap appear[i] and appear[0] for moves presentation (TODO: this is awkward)
				moves.forEach(m => {
					let tmp = m.appear[0];
					m.appear[0] = m.appear[i];
					m.appear[i] = tmp;
				});
				break;
			}
		}
		if (moves.length == 0) //no pawn on 8th rank
			moves.push(move);
		return moves;
	}

	// TODO: verify this assertion
	atLeastOneMove()
	{
		return true; //always at least one possible move
	}

	underCheck(move)
	{
		return false; //there is no check
	}

	getCheckSquares(move)
	{
		const c = this.getOppCol(this.turn); //opponent
		const saveKingPos = this.kingPos[c]; //king might be taken
		this.play(move);
		// The only way to be "under check" is to have lost the king (thus game over)
		let res = this.kingPos[c][0] < 0
			? [ JSON.parse(JSON.stringify(saveKingPos)) ]
			: [ ];
		this.undo(move);
		return res;
	}

	updateVariables(move)
	{
		super.updateVariables(move);
		const c = this.getColor(move.start.x,move.start.y);
		if (c != this.getColor(move.end.x,move.end.y)
			&& this.board[move.end.x][move.end.y] != VariantRules.EMPTY
			&& this.getPiece(move.end.x,move.end.y) == VariantRules.KING)
		{
			// We took opponent king !
			const oppCol = this.getOppCol(c);
			this.kingPos[oppCol] = [-1,-1];
			this.castleFlags[oppCol] = [false,false];
		}
	}

	unupdateVariables(move)
	{
		super.unupdateVariables(move);
		const c = this.getColor(move.start.x,move.start.y);
		const oppCol = this.getOppCol(c);
		if (this.kingPos[oppCol][0] < 0)
		{
			// Last move took opponent's king
			for (let psq of move.vanish)
			{
				if (psq.p == 'k')
				{
					this.kingPos[oppCol] = [psq.x, psq.y];
					break;
				}
			}
		}
	}

	checkGameOver()
	{
		if (this.checkRepetition())
			return "1/2";

		const color = this.turn;
		// TODO: do we need "atLeastOneMove()"?
		if (this.atLeastOneMove() && this.kingPos[color][0] >= 0)
			return "*";

		return this.checkGameEnd();
	}

	checkGameEnd()
	{
		// No valid move: our king disappeared
		return this.turn == "w" ? "0-1" : "1-0";
	}
}