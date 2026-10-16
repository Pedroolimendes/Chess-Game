'use strict'

// Computador adversário: minimax (negamax) com poda alfa-beta.
// A avaliação soma material, controle do centro, desenvolvimento/abertura das
// peças e segurança do rei. Depende de chess-engine.js (global `Chess`).
const ChessAI = (() => {
    const E = typeof Chess !== 'undefined' ? Chess : require('./chess-engine.js')

    const VALUES = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 }
    const MATE = 100000
    const QUIESCENCE_DEPTH = 4

    const LEVELS = {
        facil: { depth: 1, noise: 60 },
        medio: { depth: 2, noise: 12 },
        dificil: { depth: 3, noise: 4 }
    }

    // 0 (borda) a 3 (quatro casas centrais)
    const centrality = index => 3.5 - Math.max(Math.abs((index >> 3) - 3.5), Math.abs((index & 7) - 3.5))

    // Pontuação do ponto de vista das brancas (positivo = vantagem das brancas).
    function evaluate(state) {
        const { board } = state
        let score = 0
        let totalNonPawn = 0
        const undeveloped = { true: 0, false: 0 }
        const queenHome = { true: true, false: true }
        const kings = {}

        for (let i = 0; i < 64; i++) {
            const piece = board[i]
            if (!piece) continue
            const sign = piece.white ? 1 : -1
            const rank = piece.white ? 7 - (i >> 3) : i >> 3 // 0 = fileira inicial da peça
            const center = centrality(i)
            let value = VALUES[piece.type]

            switch (piece.type) {
                case 'P': {
                    const centralFile = (i & 7) === 3 || (i & 7) === 4
                    value += center * 5 + rank * (centralFile ? 8 : 3)
                    break
                }
                case 'N':
                    value += center * 14
                    if (rank === 0) { value -= 14; undeveloped[piece.white]++ }
                    break
                case 'B':
                    value += center * 8
                    if (rank === 0) { value -= 14; undeveloped[piece.white]++ }
                    break
                case 'R':
                    if (rank === 6) value += 12
                    break
                case 'Q':
                    value += center * 3
                    queenHome[piece.white] = rank === 0
                    break
                case 'K':
                    kings[piece.white] = i
                    break
            }

            if (piece.type !== 'P' && piece.type !== 'K') totalNonPawn += VALUES[piece.type]

            // Mobilidade: peças "abertas" têm mais casas para ir.
            if (piece.type === 'N' || piece.type === 'B' || piece.type === 'R' || piece.type === 'Q') {
                const moves = E.pseudoMoves(state, i).length
                value += moves * (piece.type === 'Q' ? 1 : piece.type === 'R' ? 2 : 3)
            }

            score += sign * value
        }

        // Não tirar a dama cedo enquanto há peças menores paradas.
        for (const white of [true, false]) {
            if (!queenHome[white] && undeveloped[white] >= 2) score += (white ? -1 : 1) * 15
        }

        // Rei: segurança na abertura/meio-jogo, atividade no final.
        const middlegame = Math.min(1, totalNonPawn / 5000)
        for (const white of [true, false]) {
            const index = kings[white]
            if (index === undefined) continue
            const sign = white ? 1 : -1
            const rank = white ? 7 - (index >> 3) : index >> 3
            const col = index & 7
            const king = board[index]
            const forward = white ? -1 : 1

            let safety = 0
            if (rank === 0) {
                if (king.moved && (col <= 2 || col >= 6)) safety += 40 // rocou
                else if (king.moved) safety -= 30 // perdeu o roque sem rocar
                for (let dc = -1; dc <= 1; dc++) {
                    const c = col + dc
                    if (c < 0 || c > 7) continue
                    const one = board[(index >> 3) * 8 + forward * 8 + c]
                    const two = board[(index >> 3) * 8 + forward * 16 + c]
                    if (one && one.type === 'P' && one.white === white) safety += 12
                    else if (two && two.type === 'P' && two.white === white) safety += 6
                }
            } else {
                safety -= 25 + rank * 10 // rei exposto fora da fileira inicial
            }

            const endgameActivity = centrality(index) * 15
            score += sign * (middlegame * safety + (1 - middlegame) * endgameActivity)
        }

        return score
    }

    // Função de avaliação usada pela busca atual: a escrita à mão (padrão)
    // ou a aprendida pelo neurônio de chess-ml.js.
    let activeEvaluate = evaluate
    const evaluateForSide = state => (state.whiteTurn ? 1 : -1) * activeEvaluate(state)

    function orderMoves(state, moves) {
        const scored = moves.map(move => {
            let score = 0
            if (move.capture) {
                const victim = state.board[move.to] || { type: 'P' }
                score += 10 * VALUES[victim.type] - VALUES[state.board[move.from].type]
            }
            if (move.promotion) score += VALUES[move.promotion]
            return { move, score }
        })
        scored.sort((a, b) => b.score - a.score)
        return scored.map(item => item.move)
    }

    // Só avalia posições "calmas": continua a busca enquanto houver capturas.
    function quiesce(state, alpha, beta, depth) {
        const standPat = evaluateForSide(state)
        if (depth === 0 || standPat >= beta) return standPat
        alpha = Math.max(alpha, standPat)
        const moves = E.allLegalMoves(state).filter(move => move.capture || move.promotion)
        for (const move of orderMoves(state, moves)) {
            const score = -quiesce(E.applyMove(state, move), -beta, -alpha, depth - 1)
            if (score >= beta) return score
            if (score > alpha) alpha = score
        }
        return alpha
    }

    function search(state, depth, alpha, beta, ply) {
        const moves = E.allLegalMoves(state)
        if (moves.length === 0) return E.isInCheck(state) ? -(MATE - ply) : 0
        if (depth === 0) return quiesce(state, alpha, beta, QUIESCENCE_DEPTH)

        let best = -Infinity
        for (const move of orderMoves(state, moves)) {
            const score = -search(E.applyMove(state, move), depth - 1, -beta, -alpha, ply + 1)
            if (score > best) best = score
            if (score > alpha) alpha = score
            if (alpha >= beta) break
        }
        return best
    }

    // `level` é o nome de um nível ou um objeto { depth, noise }.
    function chooseMove(state, level = 'medio', evaluateFn = evaluate) {
        const { depth, noise } = typeof level === 'object' ? level : (LEVELS[level] || LEVELS.medio)
        activeEvaluate = evaluateFn
        const moves = orderMoves(state, E.allLegalMoves(state))
        let bestMove = null
        let bestScore = -Infinity
        let alpha = -Infinity
        for (const move of moves) {
            const score = -search(E.applyMove(state, move), depth - 1, -Infinity, -alpha, 1)
            // O ruído evita jogadas idênticas a cada partida e dá o nível fácil.
            const noisy = score + Math.random() * noise
            if (noisy > bestScore) {
                bestScore = noisy
                bestMove = move
            }
            if (score > alpha && noise === 0) alpha = score
        }
        return bestMove
    }

    return { evaluate, chooseMove, LEVELS }
})()

if (typeof module !== 'undefined') module.exports = ChessAI
