'use strict'

// Interface do jogo. As regras vivem em chess-engine.js.
const boardElement = document.querySelector('#chess-board')
const statusElement = document.querySelector('#status')
const movesElement = document.querySelector('#moves')
const promotionElement = document.querySelector('#promotion')
const promotionChoices = document.querySelector('#promotion-choices')
const gameOverElement = document.querySelector('#game-over')
const gameOverTitle = document.querySelector('#game-over-title')
const gameOverText = document.querySelector('#game-over-text')
const capturedByWhite = document.querySelector('#captured-by-white')
const capturedByBlack = document.querySelector('#captured-by-black')

// ︎ força o glifo de texto (sem emoji) e o estilo vem do CSS.
const GLYPHS = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' }
const GLYPH_SUFFIX = '︎'
const PIECE_NAMES = { K: 'rei', Q: 'dama', R: 'torre', B: 'bispo', N: 'cavalo', P: 'peão' }
const STARTING_COUNTS = { P: 8, N: 2, B: 2, R: 2, Q: 1 }
const CAPTURE_ORDER = ['Q', 'R', 'B', 'N', 'P']

let state
let history // pilha de { before, move, note } para desfazer
let selected
let legalForSelected
let pendingPromotion // lances de promoção aguardando a escolha da peça
let status

const squareElements = []
for (let i = 0; i < 64; i++) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'square ' + (((i >> 3) + (i & 7)) % 2 === 0 ? 'light' : 'dark')
    button.dataset.index = i
    if ((i & 7) === 0) button.dataset.rank = 8 - (i >> 3)
    if ((i >> 3) === 7) button.dataset.file = 'abcdefgh'[i & 7]
    button.addEventListener('click', () => onSquareClick(i))
    boardElement.append(button)
    squareElements.push(button)
}

function glyphElement(type, white) {
    const span = document.createElement('span')
    span.className = 'piece ' + (white ? 'white' : 'black')
    span.textContent = GLYPHS[type] + GLYPH_SUFFIX
    return span
}

function newGame() {
    state = Chess.newGame()
    history = []
    selected = null
    legalForSelected = []
    pendingPromotion = null
    status = 'playing'
    render()
}

function clearSelection() {
    selected = null
    legalForSelected = []
}

function onSquareClick(index) {
    if (pendingPromotion || status === 'checkmate' || status === 'stalemate' || status === 'insufficient') return

    if (selected !== null) {
        const moves = legalForSelected.filter(move => move.to === index)
        if (moves.length > 0) {
            if (moves[0].promotion) askPromotion(moves)
            else play(moves[0])
            return
        }
    }

    const piece = state.board[index]
    if (piece && piece.white === state.whiteTurn && index !== selected) {
        selected = index
        legalForSelected = Chess.legalMoves(state, index)
    } else {
        clearSelection()
    }
    render()
}

function askPromotion(moves) {
    pendingPromotion = moves
    promotionChoices.replaceChildren()
    const white = state.board[moves[0].from].white
    for (const move of moves) {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'choice'
        button.title = PIECE_NAMES[move.promotion]
        button.setAttribute('aria-label', PIECE_NAMES[move.promotion])
        button.append(glyphElement(move.promotion, white))
        button.addEventListener('click', () => {
            pendingPromotion = null
            play(move)
        })
        promotionChoices.append(button)
    }
    render()
}

function play(move) {
    const before = state
    const next = Chess.applyMove(state, move)
    const nextStatus = Chess.getStatus(next)
    history.push({ before, move, note: Chess.notation(before, move, nextStatus) })
    state = next
    status = nextStatus
    clearSelection()
    render()
}

function undo() {
    if (history.length === 0) return
    state = history.pop().before
    status = Chess.getStatus(state)
    pendingPromotion = null
    clearSelection()
    render()
}

function statusMessage() {
    const side = state.whiteTurn ? 'brancas' : 'pretas'
    switch (status) {
        case 'check': return { text: `Xeque! Vez das ${side}`, tone: 'alert' }
        case 'checkmate': return { text: `Xeque-mate! As ${state.whiteTurn ? 'pretas' : 'brancas'} vencem`, tone: 'end' }
        case 'stalemate': return { text: 'Empate por afogamento', tone: 'end' }
        case 'insufficient': return { text: 'Empate por material insuficiente', tone: 'end' }
        default: return { text: `Vez das ${side}`, tone: 'turn' }
    }
}

function capturedPieces() {
    const counts = { true: {}, false: {} }
    for (const piece of state.board) {
        if (piece && piece.type !== 'K') counts[piece.white][piece.type] = (counts[piece.white][piece.type] || 0) + 1
    }
    const missing = white => CAPTURE_ORDER.flatMap(type => {
        const lost = Math.max(0, STARTING_COUNTS[type] - (counts[white][type] || 0))
        return Array(lost).fill(type)
    })
    return { lostByWhite: missing(true), lostByBlack: missing(false) }
}

function renderCaptured() {
    const { lostByWhite, lostByBlack } = capturedPieces()
    capturedByBlack.replaceChildren(...lostByWhite.map(type => glyphElement(type, true)))
    capturedByWhite.replaceChildren(...lostByBlack.map(type => glyphElement(type, false)))
}

function renderMoves() {
    movesElement.replaceChildren()
    for (let i = 0; i < history.length; i += 2) {
        const row = document.createElement('li')
        const white = document.createElement('span')
        white.textContent = history[i].note
        row.append(white)
        if (history[i + 1]) {
            const black = document.createElement('span')
            black.textContent = history[i + 1].note
            row.append(black)
        }
        movesElement.append(row)
    }
    movesElement.scrollTop = movesElement.scrollHeight
}

function renderGameOver() {
    const over = status === 'checkmate' || status === 'stalemate' || status === 'insufficient'
    gameOverElement.hidden = !over
    if (!over) return
    if (status === 'checkmate') {
        gameOverTitle.textContent = 'Xeque-mate!'
        gameOverText.textContent = `As ${state.whiteTurn ? 'pretas' : 'brancas'} venceram a partida.`
    } else {
        gameOverTitle.textContent = 'Empate'
        gameOverText.textContent = status === 'stalemate'
            ? 'Afogamento: não há lances legais, mas o rei não está em xeque.'
            : 'Material insuficiente para dar xeque-mate.'
    }
}

function render() {
    const last = history.length > 0 ? history[history.length - 1].move : null
    const checkedKing = (status === 'check' || status === 'checkmate') ? Chess.findKing(state.board, state.whiteTurn) : -1
    const targets = new Map(legalForSelected.map(move => [move.to, move]))

    squareElements.forEach((element, index) => {
        const piece = state.board[index]
        const target = targets.get(index)
        element.classList.toggle('selected', index === selected)
        element.classList.toggle('last-move', last !== null && (index === last.from || index === last.to))
        element.classList.toggle('in-check', index === checkedKing)
        element.classList.toggle('target', Boolean(target) && !piece && !target.capture)
        element.classList.toggle('target-capture', Boolean(target) && (Boolean(piece) || Boolean(target.capture)))

        element.replaceChildren()
        if (piece) element.append(glyphElement(piece.type, piece.white))

        const name = Chess.squareName(index)
        element.setAttribute('aria-label', piece
            ? `${name}, ${PIECE_NAMES[piece.type]} ${piece.white ? 'branco' : 'preto'}`
            : name)
    })

    const { text, tone } = statusMessage()
    statusElement.textContent = text
    statusElement.className = 'status ' + tone
    statusElement.dataset.turn = state.whiteTurn ? 'white' : 'black'

    promotionElement.hidden = !pendingPromotion
    renderCaptured()
    renderMoves()
    renderGameOver()
    document.querySelector('#undo').disabled = history.length === 0
}

promotionElement.addEventListener('click', event => {
    if (event.target === promotionElement) {
        pendingPromotion = null
        render()
    }
})
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && pendingPromotion) {
        pendingPromotion = null
        render()
    }
})
document.querySelector('#undo').addEventListener('click', undo)
document.querySelector('#restart').addEventListener('click', newGame)
document.querySelector('#play-again').addEventListener('click', newGame)

newGame()
