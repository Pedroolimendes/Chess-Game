'use strict'

// Motor de regras do xadrez (sem DOM). Casas indexadas de 0 a 63:
// 0 = a8 (canto superior esquerdo), 63 = h1 (canto inferior direito).
const Chess = (() => {
    const FILES = 'abcdefgh'
    const BACK_RANK = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
    const KNIGHT_STEPS = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]
    const KING_STEPS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
    const ROOK_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]]
    const BISHOP_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    const PROMOTIONS = ['Q', 'R', 'B', 'N']

    const square = (row, col) => row * 8 + col
    const onBoard = (row, col) => row >= 0 && row < 8 && col >= 0 && col < 8
    const makePiece = (type, white, moved = false) => ({ type, white, moved })
    const squareName = index => FILES[index & 7] + (8 - (index >> 3))

    function initialBoard() {
        const board = Array(64).fill(null)
        for (let col = 0; col < 8; col++) {
            board[square(0, col)] = makePiece(BACK_RANK[col], false)
            board[square(1, col)] = makePiece('P', false)
            board[square(6, col)] = makePiece('P', true)
            board[square(7, col)] = makePiece(BACK_RANK[col], true)
        }
        return board
    }

    function newGame() {
        return { board: initialBoard(), whiteTurn: true, enPassant: null }
    }

    function loadFEN(fen) {
        const [placement, turn, rights, ep] = fen.split(' ')
        const board = Array(64).fill(null)
        placement.split('/').forEach((rank, row) => {
            let col = 0
            for (const char of rank) {
                if (/\d/.test(char)) {
                    col += Number(char)
                } else {
                    const white = char === char.toUpperCase()
                    board[square(row, col)] = makePiece(char.toUpperCase(), white, false)
                    col++
                }
            }
        })
        const homes = { K: [60, 'K', 'Q'], k: [4, 'k', 'q'] }
        const hasRight = char => rights && rights.includes(char)
        for (const [index, piece] of board.entries()) {
            if (!piece) continue
            if (piece.type === 'K') {
                const [home, kingside, queenside] = piece.white ? homes.K : homes.k
                piece.moved = !(index === home && (hasRight(kingside) || hasRight(queenside)))
            } else if (piece.type === 'R') {
                const rightChar = { 63: 'K', 56: 'Q', 7: 'k', 0: 'q' }[index]
                piece.moved = !(rightChar && hasRight(rightChar))
            }
        }
        let enPassant = null
        if (ep && ep !== '-') enPassant = square(8 - Number(ep[1]), FILES.indexOf(ep[0]))
        return { board, whiteTurn: turn !== 'b', enPassant }
    }

    function isAttacked(board, target, byWhite) {
        const row = target >> 3
        const col = target & 7

        const pawnRow = byWhite ? row + 1 : row - 1
        for (const dc of [-1, 1]) {
            if (!onBoard(pawnRow, col + dc)) continue
            const p = board[square(pawnRow, col + dc)]
            if (p && p.white === byWhite && p.type === 'P') return true
        }

        for (const [dr, dc] of KNIGHT_STEPS) {
            if (!onBoard(row + dr, col + dc)) continue
            const p = board[square(row + dr, col + dc)]
            if (p && p.white === byWhite && p.type === 'N') return true
        }

        for (const [dr, dc] of KING_STEPS) {
            if (!onBoard(row + dr, col + dc)) continue
            const p = board[square(row + dr, col + dc)]
            if (p && p.white === byWhite && p.type === 'K') return true
        }

        const slide = (dirs, types) => {
            for (const [dr, dc] of dirs) {
                let r = row + dr
                let c = col + dc
                while (onBoard(r, c)) {
                    const p = board[square(r, c)]
                    if (p) {
                        if (p.white === byWhite && types.includes(p.type)) return true
                        break
                    }
                    r += dr
                    c += dc
                }
            }
            return false
        }
        return slide(ROOK_DIRS, 'RQ') || slide(BISHOP_DIRS, 'BQ')
    }

    function pseudoMoves(state, from) {
        const { board, enPassant } = state
        const piece = board[from]
        if (!piece) return []

        const moves = []
        const row = from >> 3
        const col = from & 7
        const add = (to, extra = {}) => moves.push({ from, to, ...extra })

        const slide = dirs => {
            for (const [dr, dc] of dirs) {
                let r = row + dr
                let c = col + dc
                while (onBoard(r, c)) {
                    const target = board[square(r, c)]
                    if (!target) {
                        add(square(r, c))
                    } else {
                        if (target.white !== piece.white) add(square(r, c), { capture: true })
                        break
                    }
                    r += dr
                    c += dc
                }
            }
        }

        const step = steps => {
            for (const [dr, dc] of steps) {
                if (!onBoard(row + dr, col + dc)) continue
                const to = square(row + dr, col + dc)
                const target = board[to]
                if (!target) add(to)
                else if (target.white !== piece.white) add(to, { capture: true })
            }
        }

        switch (piece.type) {
            case 'P': {
                const dir = piece.white ? -1 : 1
                const startRow = piece.white ? 6 : 1
                const lastRow = piece.white ? 0 : 7
                const addPawn = (to, extra) => {
                    if ((to >> 3) === lastRow) {
                        PROMOTIONS.forEach(promotion => add(to, { ...extra, promotion }))
                    } else {
                        add(to, extra)
                    }
                }
                const ahead = square(row + dir, col)
                if (!board[ahead]) {
                    addPawn(ahead)
                    const twoAhead = square(row + 2 * dir, col)
                    if (row === startRow && !board[twoAhead]) add(twoAhead, { double: true })
                }
                for (const dc of [-1, 1]) {
                    if (!onBoard(row + dir, col + dc)) continue
                    const to = square(row + dir, col + dc)
                    const target = board[to]
                    if (target && target.white !== piece.white) addPawn(to, { capture: true })
                    else if (!target && to === enPassant) add(to, { capture: true, enPassant: true })
                }
                break
            }
            case 'N':
                step(KNIGHT_STEPS)
                break
            case 'B':
                slide(BISHOP_DIRS)
                break
            case 'R':
                slide(ROOK_DIRS)
                break
            case 'Q':
                slide(ROOK_DIRS)
                slide(BISHOP_DIRS)
                break
            case 'K': {
                step(KING_STEPS)
                const home = piece.white ? 60 : 4
                const enemy = !piece.white
                if (!piece.moved && from === home && !isAttacked(board, from, enemy)) {
                    const kingRook = board[from + 3]
                    if (kingRook && kingRook.type === 'R' && kingRook.white === piece.white && !kingRook.moved &&
                        !board[from + 1] && !board[from + 2] &&
                        !isAttacked(board, from + 1, enemy) && !isAttacked(board, from + 2, enemy)) {
                        add(from + 2, { castle: 'K' })
                    }
                    const queenRook = board[from - 4]
                    if (queenRook && queenRook.type === 'R' && queenRook.white === piece.white && !queenRook.moved &&
                        !board[from - 1] && !board[from - 2] && !board[from - 3] &&
                        !isAttacked(board, from - 1, enemy) && !isAttacked(board, from - 2, enemy)) {
                        add(from - 2, { castle: 'Q' })
                    }
                }
                break
            }
        }
        return moves
    }

    function applyMove(state, move) {
        const board = state.board.slice()
        const piece = board[move.from]
        board[move.from] = null
        if (move.enPassant) board[move.to + (piece.white ? 8 : -8)] = null
        board[move.to] = makePiece(move.promotion || piece.type, piece.white, true)
        if (move.castle) {
            const rookFrom = move.castle === 'K' ? move.from + 3 : move.from - 4
            const rookTo = move.castle === 'K' ? move.from + 1 : move.from - 1
            board[rookTo] = makePiece('R', piece.white, true)
            board[rookFrom] = null
        }
        return {
            board,
            whiteTurn: !state.whiteTurn,
            enPassant: move.double ? (move.from + move.to) / 2 : null
        }
    }

    function findKing(board, white) {
        return board.findIndex(p => p && p.type === 'K' && p.white === white)
    }

    function isInCheck(state, white = state.whiteTurn) {
        const king = findKing(state.board, white)
        return king !== -1 && isAttacked(state.board, king, !white)
    }

    function legalMoves(state, from) {
        const piece = state.board[from]
        if (!piece || piece.white !== state.whiteTurn) return []
        return pseudoMoves(state, from).filter(move => !isInCheck(applyMove(state, move), piece.white))
    }

    function allLegalMoves(state) {
        const moves = []
        for (let i = 0; i < 64; i++) {
            const piece = state.board[i]
            if (piece && piece.white === state.whiteTurn) moves.push(...legalMoves(state, i))
        }
        return moves
    }

    function hasInsufficientMaterial(board) {
        const others = board.filter(p => p && p.type !== 'K')
        if (others.length === 0) return true
        return others.length === 1 && (others[0].type === 'B' || others[0].type === 'N')
    }

    // 'playing' | 'check' | 'checkmate' | 'stalemate' | 'insufficient'
    function getStatus(state) {
        const check = isInCheck(state)
        if (allLegalMoves(state).length === 0) return check ? 'checkmate' : 'stalemate'
        if (hasInsufficientMaterial(state.board)) return 'insufficient'
        return check ? 'check' : 'playing'
    }

    function notation(state, move, nextStatus) {
        const piece = state.board[move.from]
        let text
        if (move.castle) {
            text = move.castle === 'K' ? 'O-O' : 'O-O-O'
        } else {
            text = (piece.type === 'P' ? '' : piece.type) +
                squareName(move.from) + (move.capture ? 'x' : '-') + squareName(move.to) +
                (move.promotion ? '=' + move.promotion : '')
        }
        if (nextStatus === 'checkmate') text += '#'
        else if (nextStatus === 'check') text += '+'
        return text
    }

    function perft(state, depth) {
        const moves = allLegalMoves(state)
        if (depth === 1) return moves.length
        return moves.reduce((total, move) => total + perft(applyMove(state, move), depth - 1), 0)
    }

    return {
        newGame, loadFEN, legalMoves, allLegalMoves, pseudoMoves, applyMove, isInCheck, findKing,
        getStatus, notation, squareName, perft
    }
})()

if (typeof module !== 'undefined') module.exports = Chess
