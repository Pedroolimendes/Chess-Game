'use strict'

// Avaliação aprendida: um único neurônio (regressão logística).
//
//   chance de vitória das brancas = sigmoid(peso1 × característica1 + peso2 × característica2 + ...)
//
// As características descrevem a posição (material, centro, desenvolvimento,
// segurança do rei, mobilidade), sempre como "brancas menos pretas". Ninguém
// escreveu quanto cada uma vale: os pesos foram aprendidos por train-ml.js a
// partir do resultado de partidas, com descida do gradiente.
const ChessML = (() => {
    const E = typeof Chess !== 'undefined' ? Chess : require('./chess-engine.js')

    const FEATURES = [
        'Peões',
        'Cavalos',
        'Bispos',
        'Torres',
        'Damas',
        'Peças menores no centro',
        'Peões centrais avançados',
        'Peças menores sem desenvolver',
        'Roque feito',
        'Peões protegendo o rei',
        'Rei exposto com a dama inimiga em jogo',
        'Mobilidade',
        'Rei ativo no final'
    ]

    let weights = null
    if (typeof ML_WEIGHTS !== 'undefined') {
        weights = ML_WEIGHTS
    } else if (typeof require !== 'undefined') {
        try { weights = require('./chess-ml-weights.js') } catch (error) { weights = null }
    }

    const centrality = index => 3.5 - Math.max(Math.abs((index >> 3) - 3.5), Math.abs((index & 7) - 3.5))

    function extractFeatures(state) {
        const { board } = state
        const f = Array(FEATURES.length).fill(0)
        const kings = {}
        const hasQueen = { true: false, false: false }
        let nonPawnMaterial = 0

        for (let i = 0; i < 64; i++) {
            const piece = board[i]
            if (!piece) continue
            const sign = piece.white ? 1 : -1
            const rank = piece.white ? 7 - (i >> 3) : i >> 3 // 0 = fileira inicial da peça

            switch (piece.type) {
                case 'P':
                    f[0] += sign
                    if ((i & 7) === 3 || (i & 7) === 4) f[6] += sign * rank / 4
                    break
                case 'N':
                case 'B':
                    f[piece.type === 'N' ? 1 : 2] += sign
                    f[5] += sign * centrality(i) / 3
                    if (rank === 0) f[7] += sign
                    nonPawnMaterial += 3
                    break
                case 'R':
                    f[3] += sign
                    nonPawnMaterial += 5
                    break
                case 'Q':
                    f[4] += sign
                    hasQueen[piece.white] = true
                    nonPawnMaterial += 9
                    break
                case 'K':
                    kings[piece.white] = i
                    break
            }

            if ('NBRQ'.includes(piece.type)) f[11] += sign * E.pseudoMoves(state, i).length / 10
        }

        // Na abertura e no meio-jogo o rei precisa de proteção; no final, não.
        const middlegame = Math.min(1, nonPawnMaterial / 50)
        for (const white of [true, false]) {
            const index = kings[white]
            if (index === undefined) continue
            const sign = white ? 1 : -1
            const rank = white ? 7 - (index >> 3) : index >> 3
            const col = index & 7
            const forward = white ? -8 : 8

            if (rank === 0) {
                if (board[index].moved && (col <= 2 || col >= 6)) f[8] += sign * middlegame
                let shield = 0
                for (let dc = -1; dc <= 1; dc++) {
                    const c = col + dc
                    if (c < 0 || c > 7) continue
                    const front = board[(index - col) + forward + c]
                    if (front && front.type === 'P' && front.white === white) shield++
                }
                f[9] += sign * shield * middlegame
            } else if (hasQueen[!white]) {
                f[10] += sign * rank
            }
            f[12] += sign * centrality(index) / 3 * (1 - middlegame)
        }
        return f
    }

    function dot(w, f) {
        let sum = 0
        for (let i = 0; i < f.length; i++) sum += w[i] * f[i]
        return sum
    }

    // Pontuação do ponto de vista das brancas, como ChessAI.evaluate. A saída do
    // neurônio (escala logit) é dividida pelo peso aprendido do peão, para que um
    // peão valha 100, a mesma escala do bot clássico e do ruído dos níveis.
    function evaluate(state) {
        if (!weights) throw new Error('Pesos do neurônio não encontrados (rode train-ml.js).')
        const pawn = weights[0] > 0 ? weights[0] : 1
        return 100 * dot(weights, extractFeatures(state)) / pawn
    }

    return {
        FEATURES,
        extractFeatures,
        evaluate,
        hasWeights: () => Boolean(weights),
        getWeights: () => weights,
        setWeights: w => { weights = w }
    }
})()

if (typeof module !== 'undefined') module.exports = ChessML
