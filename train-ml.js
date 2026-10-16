'use strict'

// Treina o neurônio de chess-ml.js e grava os pesos em chess-ml-weights.js.
//
// Uso: node train-ml.js [partidas por geração] [gerações]      (padrão: 1000 e 3)
//
// 1. Gera partidas entre bots com níveis de ruído sorteados (um por núcleo da CPU).
//    Na 1ª geração quem joga é o bot clássico; nas seguintes, o próprio neurônio
//    com os pesos da geração anterior (autojogo, como no AlphaZero).
// 2. Cada posição vira um exemplo: características da posição → resultado final
//    da partida (1 = brancas venceram, 0,5 = empate, 0 = pretas venceram).
// 3. Ajusta os pesos com descida do gradiente (otimizador Adam) para que
//    sigmoid(pesos · características) preveja esse resultado.
// 4. Repete: os erros do neurônio aparecem nas partidas dele e corrigem os pesos.
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads')
const fs = require('fs')
const os = require('os')
const path = require('path')
const Chess = require('./chess-engine.js')
const ChessAI = require('./chess-ai.js')
const ChessML = require('./chess-ml.js')

const MAX_PLIES = 200 // partidas que passam disso contam como empate
const SKIP_OPENING = 6 // as primeiras posições são quase iguais em toda partida
const VALIDATION_SHARE = 0.15

function playGame(evaluate) {
    // Cada lado recebe um nível de ruído diferente: partidas variadas e com vencedores.
    const noise = { true: 10 + Math.random() * 110, false: 10 + Math.random() * 110 }
    let state = Chess.newGame()
    const positions = []
    let result = 0.5
    for (let ply = 0; ply < MAX_PLIES; ply++) {
        const status = Chess.getStatus(state)
        if (status === 'checkmate') {
            result = state.whiteTurn ? 0 : 1
            break
        }
        if (status === 'stalemate' || status === 'insufficient') break
        if (ply >= SKIP_OPENING) positions.push(ChessML.extractFeatures(state))
        state = Chess.applyMove(state, ChessAI.chooseMove(state, { depth: 1, noise: noise[state.whiteTurn] }, evaluate))
    }
    return { positions, result }
}

if (!isMainThread) {
    let evaluate = ChessAI.evaluate
    if (workerData.weights) {
        ChessML.setWeights(workerData.weights)
        evaluate = ChessML.evaluate
    }
    const games = []
    for (let i = 0; i < workerData.games; i++) {
        games.push(playGame(evaluate))
        parentPort.postMessage({ progress: 1 })
    }
    parentPort.postMessage({ games })
    return
}

const sigmoid = z => 1 / (1 + Math.exp(-z))

// Exemplos de uma partida, mais a versão espelhada (cores trocadas): ensina que
// a mesma vantagem vale o mesmo para brancas e pretas.
function toExamples(games) {
    const X = []
    const y = []
    for (const { positions, result } of games) {
        for (const features of positions) {
            X.push(features)
            y.push(result)
            X.push(features.map(v => -v))
            y.push(1 - result)
        }
    }
    return { X, y }
}

function logLoss(w, X, y) {
    let loss = 0
    for (let i = 0; i < X.length; i++) {
        let z = 0
        for (let j = 0; j < w.length; j++) z += w[j] * X[i][j]
        const p = Math.min(1 - 1e-9, Math.max(1e-9, sigmoid(z)))
        loss -= y[i] * Math.log(p) + (1 - y[i]) * Math.log(1 - p)
    }
    return loss / X.length
}

// `initial`: pesos de partida (a geração anterior). Sem eles, começa sem saber nada: tudo zero.
function train(X, y, initial, { epochs = 900, learningRate = 0.03, l2 = 1e-4 } = {}) {
    const d = X[0].length
    const w = initial ? initial.slice() : Array(d).fill(0)
    const m = Array(d).fill(0)
    const v = Array(d).fill(0)
    for (let epoch = 1; epoch <= epochs; epoch++) {
        // 1. Gradiente: quanto cada peso contribuiu para o erro, em média.
        const grad = Array(d).fill(0)
        for (let i = 0; i < X.length; i++) {
            let z = 0
            for (let j = 0; j < d; j++) z += w[j] * X[i][j]
            const error = sigmoid(z) - y[i]
            for (let j = 0; j < d; j++) grad[j] += error * X[i][j]
        }
        // 2. Passo pequeno na direção que reduz o erro (Adam ajusta o tamanho do passo por peso).
        for (let j = 0; j < d; j++) {
            const g = grad[j] / X.length + l2 * w[j]
            m[j] = 0.9 * m[j] + 0.1 * g
            v[j] = 0.999 * v[j] + 0.001 * g * g
            const mHat = m[j] / (1 - 0.9 ** epoch)
            const vHat = v[j] / (1 - 0.999 ** epoch)
            w[j] -= learningRate * mHat / (Math.sqrt(vHat) + 1e-8)
        }
        if (epoch % 300 === 0) console.log(`  época ${epoch}: erro (log loss) = ${logLoss(w, X, y).toFixed(4)}`)
    }
    return w
}

// Acerto em posições de partidas decididas: o neurônio apontou o vencedor certo?
function accuracy(w, games) {
    let hits = 0
    let total = 0
    for (const { positions, result } of games) {
        if (result === 0.5) continue
        for (const features of positions) {
            let z = 0
            for (let j = 0; j < w.length; j++) z += w[j] * features[j]
            if ((z > 0) === (result === 1)) hits++
            total++
        }
    }
    return total ? hits / total : 0
}

async function generate(totalGames, weights) {
    const workers = Math.max(1, Math.min(os.cpus().length, totalGames))
    let done = 0
    const jobs = Array.from({ length: workers }, (_, k) => new Promise((resolve, reject) => {
        const games = Math.floor(totalGames / workers) + (k < totalGames % workers ? 1 : 0)
        const worker = new Worker(__filename, { workerData: { games, weights } })
        worker.on('message', message => {
            if (message.progress) {
                done++
                process.stdout.write(`\r  partidas: ${done}/${totalGames}`)
            } else {
                resolve(message.games)
            }
        })
        worker.on('error', reject)
    }))
    const games = (await Promise.all(jobs)).flat()
    process.stdout.write('\n')
    return games
}

async function main() {
    const gamesPerGeneration = Number(process.argv[2]) || 1000
    const generations = Number(process.argv[3]) || 3
    const started = Date.now()
    let w = null

    for (let generation = 1; generation <= generations; generation++) {
        const player = w ? 'o próprio neurônio (autojogo)' : 'o bot clássico'
        console.log(`\n=== Geração ${generation}/${generations}: ${gamesPerGeneration} partidas jogadas por ${player} ===`)
        const games = await generate(gamesPerGeneration, w)
        const whiteWins = games.filter(g => g.result === 1).length
        const blackWins = games.filter(g => g.result === 0).length
        console.log(`  brancas venceram ${whiteWins}, pretas ${blackWins}, empates ${games.length - whiteWins - blackWins}`)

        // Embaralha e separa partidas inteiras para validação (posições da mesma
        // partida são parecidas demais para ficar dos dois lados).
        games.sort(() => Math.random() - 0.5)
        const cut = Math.round(games.length * (1 - VALIDATION_SHARE))
        const trainGames = games.slice(0, cut)
        const validationGames = games.slice(cut)
        const trainSet = toExamples(trainGames)
        const validationSet = toExamples(validationGames)
        console.log(`Treinando com ${trainSet.X.length} posições (${validationSet.X.length} para validação)...`)

        w = train(trainSet.X, trainSet.y, w)

        console.log(`  erro no treino:    ${logLoss(w, trainSet.X, trainSet.y).toFixed(4)}`)
        console.log(`  erro na validação: ${logLoss(w, validationSet.X, validationSet.y).toFixed(4)}  (chute 50%: 0.6931)`)
        console.log(`  acerto do vencedor na validação: ${(100 * accuracy(w, validationGames)).toFixed(1)}%`)
        console.log('  Pesos aprendidos:')
        ChessML.FEATURES.forEach((name, j) => console.log(`    ${name.padEnd(40)} ${w[j] >= 0 ? ' ' : ''}${w[j].toFixed(3)}`))
    }

    const rounded = w.map(x => Number(x.toFixed(4)))
    const file = `'use strict'

// Gerado por train-ml.js em ${new Date().toISOString().slice(0, 10)} (${generations} gerações de ${gamesPerGeneration} partidas). Não edite à mão:
// rode \`node train-ml.js\` para treinar de novo.
// Ordem dos pesos: a mesma de ChessML.FEATURES.
const ML_WEIGHTS = ${JSON.stringify(rounded)}

if (typeof module !== 'undefined') module.exports = ML_WEIGHTS
`
    fs.writeFileSync(path.join(__dirname, 'chess-ml-weights.js'), file)
    console.log(`\nPesos gravados em chess-ml-weights.js (${((Date.now() - started) / 1000).toFixed(0)}s no total).`)
}

main()
