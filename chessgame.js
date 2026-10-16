'use strict'

// Interface do jogo. As regras vivem em chess-engine.js.
const $ = selector => document.querySelector(selector)
const boardElement = $('#chess-board')
const boardWrap = $('#board-wrap')
const statusElement = $('#status')
const movesElement = $('#moves')
const promotionElement = $('#promotion')
const promotionChoices = $('#promotion-choices')
const resignElement = $('#resign-confirm')
const gameOverElement = $('#game-over')
const capturedByWhite = $('#captured-by-white')
const capturedByBlack = $('#captured-by-black')
const evalBar = $('#eval-bar')
const evalFill = $('#eval-fill')
const evalLabel = $('#eval-label')
const modeSelect = $('#mode')
const levelSelect = $('#level')
const opponentSelect = $('#opponent')

// ︎ força o glifo de texto (sem emoji) e o estilo vem do CSS.
const GLYPHS = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' }
const GLYPH_SUFFIX = '︎'
const PIECE_NAMES = { K: 'rei', Q: 'dama', R: 'torre', B: 'bispo', N: 'cavalo', P: 'peão' }
const STARTING_COUNTS = { P: 8, N: 2, B: 2, R: 2, Q: 1 }
const CAPTURE_ORDER = ['Q', 'R', 'B', 'N', 'P']
const GAME_OVER = ['checkmate', 'stalemate', 'insufficient', 'resigned']

let state
let history // pilha de { before, move, note } para desfazer e rever
let selected
let legalForSelected
let pendingPromotion // lances de promoção aguardando a escolha da peça
let status
let resignedWhite = null // quem concedeu: true = brancas, false = pretas
let viewIndex = null // lance sendo revisto (null = posição atual)
let gameOverDismissed = false // o jogador fechou o aviso de fim de jogo para rever
let thinking = false // o computador (pretas) está escolhendo o lance
let aiTimer = null
let evalTimer = null
const evalCache = new WeakMap() // posição → avaliação (as posições nunca mudam)

let evalVisible = true
try {
    evalVisible = localStorage.getItem('chess-eval-visible') !== 'false'
} catch (error) { /* armazenamento indisponível: usa o padrão */ }

const vsComputer = () => modeSelect.value === 'ai'
const useNeuron = () => opponentSelect.value === 'ml'
const isOver = () => GAME_OVER.includes(status)
const shownPly = () => (viewIndex === null ? history.length : viewIndex)
const positionAt = ply => (ply >= history.length ? state : history[ply].before)
const isReviewing = () => viewIndex !== null

const squareElements = []
for (let i = 0; i < 64; i++) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'square ' + (((i >> 3) + (i & 7)) % 2 === 0 ? 'light' : 'dark')
    if ((i & 7) === 0) button.dataset.rank = 8 - (i >> 3)
    if ((i >> 3) === 7) button.dataset.file = 'abcdefgh'[i & 7]
    button.dataset.index = i
    button.addEventListener('pointerdown', event => onPointerDown(event, i))
    // Mouse e toque passam pelos eventos de ponteiro; o click só trata o teclado (Enter/Espaço).
    button.addEventListener('click', event => {
        if (event.detail === 0) onSquareClick(i)
    })
    boardElement.append(button)
    squareElements.push(button)
}

function glyphElement(type, white) {
    const span = document.createElement('span')
    span.className = 'piece ' + (white ? 'white' : 'black')
    span.textContent = GLYPHS[type] + GLYPH_SUFFIX
    return span
}

function cancelAI() {
    clearTimeout(aiTimer)
    aiTimer = null
    thinking = false
}

// Depois do lance das brancas, o computador joga de volta com as pretas.
function maybePlayAI() {
    if (!vsComputer() || state.whiteTurn || isOver()) return
    thinking = true
    render()
    // O timeout deixa o navegador desenhar o lance antes da busca bloquear a thread.
    aiTimer = setTimeout(() => {
        const evaluate = useNeuron() ? ChessML.evaluate : ChessAI.evaluate
        const move = ChessAI.chooseMove(state, levelSelect.value, evaluate)
        thinking = false
        aiTimer = null
        play(move)
    }, 80)
}

function newGame() {
    cancelAI()
    state = Chess.newGame()
    history = []
    status = 'playing'
    resignedWhite = null
    viewIndex = null
    gameOverDismissed = false
    pendingPromotion = null
    resignElement.hidden = true
    clearSelection()
    render()
}

function clearSelection() {
    selected = null
    legalForSelected = []
}

const canInteract = () => !(isReviewing() || thinking || pendingPromotion || isOver() || (vsComputer() && !state.whiteTurn))

// Tenta jogar a peça selecionada para `index`. Devolve false se não for um lance legal.
function tryMoveTo(index) {
    const moves = legalForSelected.filter(move => move.to === index)
    if (moves.length === 0) return false
    if (moves[0].promotion) askPromotion(moves)
    else play(moves[0])
    return true
}

function selectSquare(index) {
    selected = index
    legalForSelected = Chess.legalMoves(state, index)
}

// Clique (teclado): seleciona, joga ou desmarca.
function onSquareClick(index) {
    if (!canInteract()) return
    if (selected !== null && tryMoveTo(index)) return

    const piece = state.board[index]
    if (piece && piece.white === state.whiteTurn && index !== selected) selectSquare(index)
    else clearSelection()
    render()
}

// --- Arrastar e soltar ------------------------------------------------------

const DRAG_THRESHOLD = 5 // pixels antes de um clique virar arraste
let drag = null // { index, wasSelected, startX, startY, ghost, over }

function onPointerDown(event, index) {
    if (event.button !== 0 || !canInteract()) return
    unlockAudio()
    // Clicar numa casa de destino com uma peça já selecionada joga direto.
    if (selected !== null && selected !== index && tryMoveTo(index)) return

    const piece = state.board[index]
    if (!piece || piece.white !== state.whiteTurn) {
        clearSelection()
        render()
        return
    }
    event.preventDefault()
    const wasSelected = selected === index
    selectSquare(index)
    render()
    drag = { index, wasSelected, startX: event.clientX, startY: event.clientY, ghost: null, over: null }
}

function squareAt(x, y) {
    const element = document.elementFromPoint(x, y)
    const square = element && element.closest('.square')
    return square && boardElement.contains(square) ? Number(square.dataset.index) : null
}

function moveGhost(x, y) {
    const size = squareElements[0].getBoundingClientRect().width
    drag.ghost.style.left = (x - size / 2) + 'px'
    drag.ghost.style.top = (y - size / 2) + 'px'
}

document.addEventListener('pointermove', event => {
    if (!drag) return
    if (!drag.ghost) {
        if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < DRAG_THRESHOLD) return
        // Começou a arrastar: a peça "sai" da casa e segue o ponteiro.
        const piece = state.board[drag.index]
        const size = squareElements[0].getBoundingClientRect().width
        drag.ghost = glyphElement(piece.type, piece.white)
        drag.ghost.classList.add('drag-ghost')
        drag.ghost.style.width = size + 'px'
        drag.ghost.style.height = size + 'px'
        drag.ghost.style.fontSize = (size * 0.84) + 'px'
        document.body.append(drag.ghost)
        squareElements[drag.index].classList.add('drag-source')
    }
    moveGhost(event.clientX, event.clientY)
    const over = squareAt(event.clientX, event.clientY)
    if (over !== drag.over) {
        if (drag.over !== null) squareElements[drag.over].classList.remove('drag-over')
        if (over !== null) squareElements[over].classList.add('drag-over')
        drag.over = over
    }
})

function endDrag(event, cancelled) {
    if (!drag) return
    const current = drag
    drag = null
    if (current.over !== null) squareElements[current.over].classList.remove('drag-over')
    squareElements[current.index].classList.remove('drag-source')

    if (!current.ghost) {
        // Foi só um clique: clicar de novo na peça selecionada desmarca.
        if (current.wasSelected) {
            clearSelection()
            render()
        }
        return
    }
    current.ghost.remove()
    const target = cancelled ? null : squareAt(event.clientX, event.clientY)
    if (target !== null && target !== current.index && tryMoveTo(target)) return
    render() // soltou fora ou num lance ilegal: a peça volta e continua selecionada
}

document.addEventListener('pointerup', event => endDrag(event, false))
document.addEventListener('pointercancel', event => endDrag(event, true))

// --- Sons (sintetizados, sem arquivos) --------------------------------------

let soundOn = true
try {
    soundOn = localStorage.getItem('chess-sound') !== 'false'
} catch (error) { /* armazenamento indisponível: usa o padrão */ }
let audio = null

// O navegador só libera áudio depois de uma interação do usuário.
function unlockAudio() {
    if (!soundOn) return
    try {
        if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)()
        if (audio.state === 'suspended') audio.resume()
    } catch (error) {
        audio = null
    }
}

// Madeira batendo em madeira: um estalo curto de ruído filtrado (o contato) mais
// dois tons que somem rápido (o corpo da peça e do tabuleiro). A captura usa
// frequências mais altas e decai mais rápido, soando mais aguda e seca.
function playSound(kind) {
    if (!soundOn || !audio) return
    const capture = kind === 'capture'
    const now = audio.currentTime
    const output = audio.createGain()
    output.gain.value = 0.55
    output.connect(audio.destination)

    const base = capture ? 520 : 240
    const decay = capture ? 0.07 : 0.11
    for (const [ratio, level] of [[1, 0.7], [2.76, 0.25]]) {
        const tone = audio.createOscillator()
        const gain = audio.createGain()
        tone.type = 'sine'
        tone.frequency.setValueAtTime(base * ratio, now)
        tone.frequency.exponentialRampToValueAtTime(base * ratio * 0.7, now + decay)
        gain.gain.setValueAtTime(0.0001, now)
        gain.gain.exponentialRampToValueAtTime(level, now + 0.003)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + decay)
        tone.connect(gain).connect(output)
        tone.start(now)
        tone.stop(now + decay + 0.02)
    }

    const length = Math.floor(audio.sampleRate * 0.04)
    const buffer = audio.createBuffer(1, length, audio.sampleRate)
    const samples = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / length)
    const noise = audio.createBufferSource()
    noise.buffer = buffer
    const filter = audio.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = capture ? 3400 : 1700
    filter.Q.value = 1.4
    const noiseGain = audio.createGain()
    noiseGain.gain.setValueAtTime(capture ? 0.9 : 0.6, now)
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + (capture ? 0.025 : 0.035))
    noise.connect(filter).connect(noiseGain).connect(output)
    noise.start(now)
}

const moveSound = move => playSound(move.capture ? 'capture' : 'move')

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
    moveSound(move)
    render()
    maybePlayAI()
}

function undo() {
    if (history.length === 0) return
    cancelAI()
    state = history.pop().before
    // Contra o computador, desfaz também a resposta dele para voltar à vez das brancas.
    if (vsComputer() && !state.whiteTurn && history.length > 0) state = history.pop().before
    status = Chess.getStatus(state)
    resignedWhite = null
    viewIndex = null
    gameOverDismissed = false
    pendingPromotion = null
    clearSelection()
    render()
}

// Revisão: só mostra posições anteriores, sem alterar a partida.
function goTo(ply) {
    const target = Math.max(0, Math.min(history.length, ply))
    // Avançar um lance na revisão toca o som daquele lance.
    if (target === shownPly() + 1) {
        unlockAudio()
        moveSound(history[target - 1].move)
    }
    viewIndex = target === history.length ? null : target
    pendingPromotion = null
    clearSelection()
    render()
}

function askResign() {
    if (isOver() || history.length === 0) return
    const loserWhite = vsComputer() ? true : state.whiteTurn
    $('#resign-text').textContent = `As ${loserWhite ? 'pretas' : 'brancas'} vencem a partida.`
    resignElement.hidden = false
    $('#resign-ok').focus()
}

function resign() {
    cancelAI()
    resignedWhite = vsComputer() ? true : state.whiteTurn
    status = 'resigned'
    viewIndex = null
    gameOverDismissed = false
    resignElement.hidden = true
    clearSelection()
    render()
}

function winnerName() {
    if (status === 'resigned') return resignedWhite ? 'pretas' : 'brancas'
    return state.whiteTurn ? 'pretas' : 'brancas'
}

function statusMessage() {
    if (isReviewing()) {
        const ply = shownPly()
        return { text: ply === 0 ? 'Revendo: posição inicial' : `Revendo: lance ${ply} de ${history.length}`, tone: 'review' }
    }
    const side = state.whiteTurn ? 'brancas' : 'pretas'
    if (thinking) return { text: 'Computador pensando…', tone: 'turn' }
    switch (status) {
        case 'check': return { text: `Xeque! Vez das ${side}`, tone: 'alert' }
        case 'checkmate': return { text: `Xeque-mate! As ${winnerName()} vencem`, tone: 'end' }
        case 'resigned': return { text: `As ${resignedWhite ? 'brancas' : 'pretas'} concederam. As ${winnerName()} vencem`, tone: 'end' }
        case 'stalemate': return { text: 'Empate por afogamento', tone: 'end' }
        case 'insufficient': return { text: 'Empate por material insuficiente', tone: 'end' }
        default: return { text: `Vez das ${side}`, tone: 'turn' }
    }
}

function capturedPieces(board) {
    const counts = { true: {}, false: {} }
    for (const piece of board) {
        if (piece && piece.type !== 'K') counts[piece.white][piece.type] = (counts[piece.white][piece.type] || 0) + 1
    }
    const missing = white => CAPTURE_ORDER.flatMap(type => {
        const lost = Math.max(0, STARTING_COUNTS[type] - (counts[white][type] || 0))
        return Array(lost).fill(type)
    })
    return { lostByWhite: missing(true), lostByBlack: missing(false) }
}

function renderCaptured(board) {
    const { lostByWhite, lostByBlack } = capturedPieces(board)
    capturedByBlack.replaceChildren(...lostByWhite.map(type => glyphElement(type, true)))
    capturedByWhite.replaceChildren(...lostByBlack.map(type => glyphElement(type, false)))
}

function renderMoves() {
    const current = shownPly()
    movesElement.replaceChildren()
    let active = null
    for (let i = 0; i < history.length; i += 2) {
        const row = document.createElement('li')
        for (const ply of [i + 1, i + 2]) {
            if (ply > history.length) break
            const button = document.createElement('button')
            button.type = 'button'
            button.className = 'move'
            button.textContent = history[ply - 1].note
            button.addEventListener('click', () => goTo(ply))
            if (ply === current) {
                button.classList.add('active')
                button.setAttribute('aria-current', 'step')
                active = button
            }
            row.append(button)
        }
        movesElement.append(row)
    }
    $('#moves-empty').hidden = history.length > 0

    // Mantém o lance atual visível sem rolar a página inteira.
    if (!isReviewing()) {
        movesElement.scrollTop = movesElement.scrollHeight
    } else if (active) {
        const top = active.offsetTop - movesElement.offsetTop
        if (top < movesElement.scrollTop) movesElement.scrollTop = top - 8
        else if (top + active.offsetHeight > movesElement.scrollTop + movesElement.clientHeight) {
            movesElement.scrollTop = top + active.offsetHeight - movesElement.clientHeight + 8
        }
    }
}

function renderGameOver() {
    const show = isOver() && !gameOverDismissed && !isReviewing()
    gameOverElement.hidden = !show
    if (!show) return
    const title = $('#game-over-title')
    const text = $('#game-over-text')
    if (status === 'checkmate') {
        title.textContent = 'Xeque-mate!'
        text.textContent = `As ${winnerName()} venceram a partida.`
    } else if (status === 'resigned') {
        title.textContent = 'Partida concedida'
        text.textContent = `As ${resignedWhite ? 'brancas' : 'pretas'} concederam. Vitória das ${winnerName()}.`
    } else {
        title.textContent = 'Empate'
        text.textContent = status === 'stalemate'
            ? 'Afogamento: não há lances legais, mas o rei não está em xeque.'
            : 'Material insuficiente para dar xeque-mate.'
    }
}

// --- Barra de avaliação ---------------------------------------------------

function evaluatePosition(position) {
    const positionStatus = Chess.getStatus(position)
    if (positionStatus === 'checkmate') {
        return position.whiteTurn ? { label: '0-1', white: 0 } : { label: '1-0', white: 100 }
    }
    if (positionStatus === 'stalemate' || positionStatus === 'insufficient') return { label: '½-½', white: 50 }
    const { score, mate } = ChessAI.analyze(position, 1)
    if (mate !== null) return { label: (mate > 0 ? 'M' : '−M') + Math.abs(mate), white: mate > 0 ? 100 : 0 }
    const pawns = score / 100
    return {
        label: (pawns >= 0 ? '+' : '−') + Math.abs(pawns).toFixed(1),
        // Curva em S: pequenas vantagens mexem pouco, a barra nunca enche sem mate.
        white: Math.min(95, Math.max(5, 100 / (1 + Math.exp(-score / 250))))
    }
}

function showEval({ label, white }) {
    evalFill.style.height = white + '%'
    evalLabel.textContent = label
    evalBar.classList.toggle('white-ahead', white >= 50)
    evalBar.setAttribute('aria-label', `Avaliação: ${label}`)
}

function renderEval() {
    $('#board-area').classList.toggle('no-eval', !evalVisible)
    evalBar.hidden = !evalVisible
    const toggle = $('#toggle-eval')
    toggle.setAttribute('aria-pressed', String(evalVisible))
    toggle.textContent = evalVisible ? 'Ocultar avaliação' : 'Mostrar avaliação'
    const sound = $('#toggle-sound')
    sound.setAttribute('aria-pressed', String(soundOn))
    sound.textContent = soundOn ? 'Som ligado' : 'Som desligado'
    if (!evalVisible) return

    if (!isReviewing() && status === 'resigned') {
        showEval(resignedWhite ? { label: '0-1', white: 0 } : { label: '1-0', white: 100 })
        return
    }
    const position = positionAt(shownPly())
    const cached = evalCache.get(position)
    if (cached) {
        showEval(cached)
        return
    }
    clearTimeout(evalTimer)
    evalTimer = setTimeout(() => {
        const result = evaluatePosition(position)
        evalCache.set(position, result)
        if (positionAt(shownPly()) === position && evalVisible) showEval(result)
    }, 30)
}

// --- Desenho ----------------------------------------------------------------

function render() {
    const ply = shownPly()
    const shown = positionAt(ply)
    const reviewing = isReviewing()
    const last = ply > 0 ? history[ply - 1].move : null
    const checkedKing = Chess.isInCheck(shown) ? Chess.findKing(shown.board, shown.whiteTurn) : -1
    const targets = new Map(legalForSelected.map(move => [move.to, move]))

    squareElements.forEach((element, index) => {
        const piece = shown.board[index]
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
    boardWrap.classList.toggle('reviewing', reviewing)

    const { text, tone } = statusMessage()
    statusElement.textContent = text
    statusElement.className = 'status ' + tone
    statusElement.dataset.turn = shown.whiteTurn ? 'white' : 'black'

    promotionElement.hidden = !pendingPromotion
    renderCaptured(shown.board)
    renderMoves()
    renderGameOver()
    renderEval()

    $('#nav-first').disabled = ply === 0
    $('#nav-prev').disabled = ply === 0
    $('#nav-next').disabled = !reviewing
    $('#nav-last').disabled = !reviewing
    $('#undo').disabled = history.length === 0 || thinking
    $('#resign').disabled = isOver() || history.length === 0
    $('#level-label').hidden = !vsComputer()
    $('#opponent-label').hidden = !vsComputer()
    $('#ml-info').hidden = !vsComputer() || !useNeuron()
}

function renderLearnedWeights() {
    const weights = ChessML.getWeights()
    const list = $('#ml-weights')
    const inPawns = weights.map(w => w / weights[0])
    const largest = Math.max(...inPawns.map(Math.abs))
    list.replaceChildren(...ChessML.FEATURES.map((name, j) => {
        const item = document.createElement('li')
        const label = document.createElement('span')
        label.textContent = name
        const value = document.createElement('span')
        value.className = 'ml-value'
        value.textContent = (inPawns[j] >= 0 ? '+' : '−') + Math.abs(inPawns[j]).toFixed(2)
        const bar = document.createElement('span')
        bar.className = 'ml-bar ' + (inPawns[j] >= 0 ? 'positive' : 'negative')
        bar.style.width = (100 * Math.abs(inPawns[j]) / largest) + '%'
        item.append(label, value, bar)
        return item
    }))
}

// --- Eventos ----------------------------------------------------------------

promotionElement.addEventListener('click', event => {
    if (event.target === promotionElement) {
        pendingPromotion = null
        render()
    }
})
resignElement.addEventListener('click', event => {
    if (event.target === resignElement) resignElement.hidden = true
})
document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        if (pendingPromotion) {
            pendingPromotion = null
            render()
        }
        resignElement.hidden = true
        return
    }
    if (event.target.closest('select, input, textarea')) return
    const ply = shownPly()
    const keys = { ArrowLeft: ply - 1, ArrowRight: ply + 1, Home: 0, End: history.length }
    if (event.key in keys) {
        event.preventDefault()
        goTo(keys[event.key])
    }
})

modeSelect.addEventListener('change', newGame)
opponentSelect.addEventListener('change', render)
$('#nav-first').addEventListener('click', () => goTo(0))
$('#nav-prev').addEventListener('click', () => goTo(shownPly() - 1))
$('#nav-next').addEventListener('click', () => goTo(shownPly() + 1))
$('#nav-last').addEventListener('click', () => goTo(history.length))
$('#toggle-eval').addEventListener('click', () => {
    evalVisible = !evalVisible
    try {
        localStorage.setItem('chess-eval-visible', String(evalVisible))
    } catch (error) { /* armazenamento indisponível: vale só nesta visita */ }
    render()
})
$('#toggle-sound').addEventListener('click', () => {
    soundOn = !soundOn
    try {
        localStorage.setItem('chess-sound', String(soundOn))
    } catch (error) { /* armazenamento indisponível: vale só nesta visita */ }
    if (soundOn) {
        unlockAudio()
        playSound('move')
    }
    render()
})
$('#undo').addEventListener('click', undo)
$('#resign').addEventListener('click', askResign)
$('#resign-ok').addEventListener('click', resign)
$('#resign-cancel').addEventListener('click', () => { resignElement.hidden = true })
$('#restart').addEventListener('click', newGame)
$('#play-again').addEventListener('click', newGame)
$('#review-game').addEventListener('click', () => {
    gameOverDismissed = true
    render()
})

renderLearnedWeights()
newGame()
