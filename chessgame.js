const chessBoardElement = document.querySelector('#chess-board')
const positionElements = Array.from(chessBoardElement.children)
let pieceSelected = false
let chessPosition = Array(64)
let pieceBuffer = {}
let moveBuffer = []
let whiteDomain = []
let blackDomain = []
let whiteTurn = true

for(let x = 0; x < 64; x++){
    chessPosition[x] = null
}

function pawnPromotion(pawn){
    const popup = document.createElement('div')
    popup.style.width = '200px'
    popup.style.height = '50px'
    popup.style.display = 'flex'
    popup.style.backgroundColor = 'lightgreen'
    const bishopChoice = document.createElement('div')
    const knightChoice = document.createElement('div')
    const rookChoice = document.createElement('div')
    const queenChoice = document.createElement('div')
    const choices = [bishopChoice, knightChoice, rookChoice, queenChoice]
    choices.forEach((element, index) => {
        popup.append(element)
        element.style.display = 'flex'
        element.style.width = '50px'
        element.style.height = '50px'
        element.style.justifyContent = 'center'
        element.style.alignItems = 'center'
        element.style.fontSize = '33pt'
        element.style.cursor = 'pointer'
        element.addEventListener('click', () => promotion(popup, element, index, pawn))
    })
    if(pawn.isWhite){
        document.body.insertBefore(popup, chessBoardElement)
        bishopChoice.innerHTML = '&#9815'
        knightChoice.innerHTML = '&#9816'
        rookChoice.innerHTML = '&#9814'
        queenChoice.innerHTML = '&#9813'
    } else {
        document.body.append(popup)
        bishopChoice.innerHTML = '&#9821'
        knightChoice.innerHTML = '&#9822'
        rookChoice.innerHTML = '&#9820'
        queenChoice.innerHTML = '&#9819'
    }
}

function promotion(popup, choiceElement, index, pawn){
    let promotedPawn
    switch(index){
        case 0:
            promotedPawn = new Bishop(pawn.isWhite, pawn.position)
            break
        case 1:
            promotedPawn = new Knight(pawn.isWhite, pawn.position)
            break
        case 2:
            promotedPawn = new Rook(pawn.isWhite, pawn.position, true)
            break
        case 3:
            promotedPawn = new Queen(pawn.isWhite, pawn.position)
            break
    }
    popup.remove()
}

function inCheck(isWhite, position){
    if(isWhite){
        for(let i = 0; i < blackDomain.length; i++){
            if(blackDomain[i] instanceof King){
                if(blackDomain[i].findOffensiveDomain().includes(positionElements[position])){
                    return true
                }
                continue
            }
            if(blackDomain[i].findDomain().includes(positionElements[position])){
                return true
            }
        }
    } else {
        for(let i = 0; i < whiteDomain.length; i++){
            if(whiteDomain[i] instanceof King){
                if(whiteDomain[i].findOffensiveDomain().includes(positionElements[position])){
                    return true
                }
                continue
            }
            if(whiteDomain[i].findDomain().includes(positionElements[position])){
                return true
            }
        }
    }
    
    return false
}

function isCheckMate(isWhite) {
    if(!inCheck(isWhite, isWhite ? whiteKing.position : blackKing.position)) return false
    let pieces = isWhite ? whiteDomain : blackDomain
    let possiblePositions
    let playerHasLegalMoves = false

    for(let piece of pieces){
        possiblePositions = piece.findDomain().map(element => positionElements.indexOf(element))
        for(let possiblePosition of possiblePositions){
            playerHasLegalMoves = playerHasLegalMoves || isLegal(piece, possiblePosition)
        }
    }

    return !playerHasLegalMoves && inCheck(isWhite, isWhite ? whiteKing.position : blackKing.position)
}

function isStaleMate(isWhite){
    if(hasLegalMoves(isWhite ? whiteKing : blackKing)) return false
    let pieces = isWhite ? whiteDomain : blackDomain
    let playerHasLegalMoves = false

    for(let piece of pieces){
        playerHasLegalMoves = playerHasLegalMoves || hasLegalMoves(piece)
    }

    return !playerHasLegalMoves && isWhite === whiteTurn
}

function isLegal(piece, position){
    let previousPosition = piece.position
    let originalOccupant = chessPosition[position]
    piece.position = position
    chessPosition[position] = piece
    chessPosition[previousPosition] = null

    if(piece.isWhite){
        if(originalOccupant) blackDomain.splice(blackDomain.indexOf(originalOccupant), 1)
        whiteDomain.splice(whiteDomain.indexOf(piece), 1)
    } else {
        if(originalOccupant) whiteDomain.splice(whiteDomain.indexOf(originalOccupant), 1)
        blackDomain.splice(blackDomain.indexOf(piece), 1)
    }

    if(inCheck(piece.isWhite, piece.isWhite ? whiteKing.position : blackKing.position)){
        piece.position = previousPosition
        chessPosition[previousPosition] = piece
        chessPosition[position] = originalOccupant

        if(piece.isWhite){
            whiteDomain.push(piece)
            if(originalOccupant) blackDomain.push(originalOccupant)
        } else {
            blackDomain.push(piece)
            if(originalOccupant) whiteDomain.push(originalOccupant)
        }
        
        return false
    }

    piece.position = previousPosition
    chessPosition[previousPosition] = piece
    chessPosition[position] = originalOccupant

    if(piece.isWhite){
        whiteDomain.push(piece)
        if(originalOccupant) blackDomain.push(originalOccupant)
    } else {
        blackDomain.push(piece)
        if(originalOccupant) whiteDomain.push(originalOccupant)
    }

    return true
}

function hasLegalMoves(piece){
    possiblePositions = piece.findDomain().map(element => positionElements.indexOf(element))
    let hasLegalMove = false

    for(let possiblePosition of possiblePositions){
        hasLegalMove = hasLegalMove || isLegal(piece, possiblePosition)
    }

    return piece.findDomain().length !== 0 && hasLegalMove
}

function decideBehave(piece, possiblePositionElement, index){
    if(pieceSelected){
        pieceSelected = false
        removeHighlightDomain(pieceBuffer)
        if(pieceBuffer instanceof King && (possiblePositionElement === positionElements[pieceBuffer.position + 2] || possiblePositionElement === positionElements[pieceBuffer.position - 2]) && pieceBuffer.findDomain().includes(possiblePositionElement)){
            if(possiblePositionElement === positionElements[pieceBuffer.position + 2]){
                chessPosition[pieceBuffer.position + 3].occupyPosition(pieceBuffer.position + 1)
            } else {
                chessPosition[pieceBuffer.position - 4].occupyPosition(pieceBuffer.position - 1)
            }
            pieceBuffer.occupyPosition(index)
            whiteTurn = whiteTurn !== true
            if(isCheckMate(true) || isCheckMate(false)){
                setTimeout(() => {
                    alert(`${isCheckMate(true) ? 'White' : 'Black'} got CHECKMATED!`)
                }, 50)
            } else {
                if(isStaleMate(true) || isStaleMate(false)){
                    setTimeout(() => {
                        alert('Draw by STALEMATE!')
                    }, 50)
                }
            }
            moveBuffer = []
            moveBuffer.push(pieceBuffer, positionBuffer, index)
        } else{
            if(pieceBuffer instanceof Pawn && chessPosition[pieceBuffer.position + 1] && moveBuffer[0] === chessPosition[pieceBuffer.position + 1] && moveBuffer[0] instanceof Pawn && moveBuffer[2] - moveBuffer[1] === 16 && possiblePositionElement === positionElements[pieceBuffer.position - 7]){
                positionElements[pieceBuffer.position + 1].innerHTML = ''
                chessPosition[pieceBuffer.position + 1] = null
                pieceBuffer.occupyPosition(index)
                whiteTurn = whiteTurn !== true
                if(isCheckMate(true) || isCheckMate(false)){
                    setTimeout(() => {
                        alert(`${isCheckMate(true) ? 'White' : 'Black'} got CHECKMATED!`)
                    }, 50)
                } else {
                    if(isStaleMate(true) || isStaleMate(false)){
                        setTimeout(() => {
                            alert('Draw by STALEMATE!')
                        }, 50)
                    }
                }
                moveBuffer = []
                moveBuffer.push(pieceBuffer, positionBuffer, index)
            }
            if(pieceBuffer instanceof Pawn && chessPosition[pieceBuffer.position + 1] && moveBuffer[0] === chessPosition[pieceBuffer.position + 1] && moveBuffer[0] instanceof Pawn && moveBuffer[1] - moveBuffer[2] === 16 && possiblePositionElement === positionElements[pieceBuffer.position + 9]){
                positionElements[pieceBuffer.position + 1].innerHTML = ''
                chessPosition[pieceBuffer.position + 1] = null
                pieceBuffer.occupyPosition(index)
                whiteTurn = whiteTurn !== true
                if(isCheckMate(true) || isCheckMate(false)){
                    setTimeout(() => {
                        alert(`${isCheckMate(true) ? 'White' : 'Black'} got CHECKMATED!`)
                    }, 50)
                } else {
                    if(isStaleMate(true) || isStaleMate(false)){
                        setTimeout(() => {
                            alert('Draw by STALEMATE!')
                        }, 50)
                    }
                }
                moveBuffer = []
                moveBuffer.push(pieceBuffer, positionBuffer, index)
            }
            if(pieceBuffer instanceof Pawn && chessPosition[pieceBuffer.position - 1] && moveBuffer[0] === chessPosition[pieceBuffer.position - 1] && moveBuffer[0] instanceof Pawn && moveBuffer[2] - moveBuffer[1] === 16 && possiblePositionElement === positionElements[pieceBuffer.position - 9]){
                positionElements[pieceBuffer.position - 1].innerHTML = ''
                chessPosition[pieceBuffer.position - 1] = null
                pieceBuffer.occupyPosition(index)
                whiteTurn = whiteTurn !== true
                if(isCheckMate(true) || isCheckMate(false)){
                    setTimeout(() => {
                        alert(`${isCheckMate(true) ? 'White' : 'Black'} got CHECKMATED!`)
                    }, 50)
                } else {
                    if(isStaleMate(true) || isStaleMate(false)){
                        setTimeout(() => {
                            alert('Draw by STALEMATE!')
                        }, 50)
                    }
                }
                moveBuffer = []
                moveBuffer.push(pieceBuffer, positionBuffer, index)
            }
            if(pieceBuffer instanceof Pawn && chessPosition[pieceBuffer.position - 1] && moveBuffer[0] === chessPosition[pieceBuffer.position - 1] && moveBuffer[0] instanceof Pawn && moveBuffer[1] - moveBuffer[2] === 16 && possiblePositionElement === positionElements[pieceBuffer.position + 7]){
                positionElements[pieceBuffer.position - 1].innerHTML = ''
                chessPosition[pieceBuffer.position - 1] = null
                pieceBuffer.occupyPosition(index)
                whiteTurn = whiteTurn !== true
                if(isCheckMate(true) || isCheckMate(false)){
                    setTimeout(() => {
                        alert(`${isCheckMate(true) ? 'White' : 'Black'} got CHECKMATED!`)
                    }, 50)
                } else {
                    if(isStaleMate(true) || isStaleMate(false)){
                        setTimeout(() => {
                            alert('Draw by STALEMATE!')
                        }, 50)
                    }
                }
                moveBuffer = []
                moveBuffer.push(pieceBuffer, positionBuffer, index)
            }
            if(pieceBuffer.findDomain().includes(possiblePositionElement)){
                if(isLegal(pieceBuffer, positionElements.indexOf(possiblePositionElement))){
                    pieceBuffer.occupyPosition(positionElements.indexOf(possiblePositionElement))
                    whiteTurn = whiteTurn !== true
                    if(isCheckMate(true) || isCheckMate(false)){
                        setTimeout(() => {
                            alert(`${isCheckMate(true) ? 'White' : 'Black'} got CHECKMATED!`)
                        }, 50)
                    } else {
                        if(isStaleMate(true) || isStaleMate(false)){
                            setTimeout(() => {
                                alert('Draw by STALEMATE!')
                            }, 50)
                        }
                    }
                    
                }
            }
        }
    } else {
        if(piece && whiteTurn === piece.isWhite){
            pieceSelected = true
            highlightDomain(piece)
            pieceBuffer = piece
            positionBuffer = piece.position
        }
    }
}

function highlightDomain(piece){
    let length = piece.findDomain().length
    positionElements[piece.position].style.outline = 'solid 3.25px yellow'
    if(piece.isWhite){
        for(let j = 0; j < length; j++){
            piece.findDomain()[j].style.outline = 'solid 3.25px blue'
        }
    } else {
        for(let j = 0; j < length; j++){
            piece.findDomain()[j].style.outline = 'solid 3.25px red'
        }
    }

}

function removeHighlightDomain(piece){
    let length = piece.findDomain().length
    positionElements[piece.position].style.outline = ''
    for(let j = 0; j < length; j++){
        piece.findDomain()[j].style.outline = ''
    }
}

class Piece{
    constructor(isWhite, position, moved = false){
        this.isWhite = isWhite
        this.position = position
        this.moved = moved
        this.symbol = this.giveRightSymbol()
        positionElements[this.position].innerHTML = this.symbol
        chessPosition[this.position] = this
        if(this.isWhite){
            whiteDomain.push(this)
        } else {
            blackDomain.push(this)
        }
    }

    giveRightSymbol(){
        return null
    }

    occupyPosition(newPosition) {
        if(chessPosition[newPosition]){
            if(chessPosition[newPosition].isWhite){
                whiteDomain.splice(whiteDomain.indexOf(chessPosition[newPosition]), 1)
            } else {
                blackDomain.splice(blackDomain.indexOf(chessPosition[newPosition]), 1)
            }
        }
        positionElements[this.position].innerHTML = ''
        chessPosition[this.position] = null
        this.position = newPosition
        positionElements[newPosition].innerHTML = this.symbol
        chessPosition[newPosition] = this
        this.moved = true
    }
    findDomain(){
        return null
    }
}

class Pawn extends Piece{
    constructor(isWhite, position, moved) {
        super(isWhite, position, moved)
    }
    
    giveRightSymbol(){
        return this.isWhite ? '&#9817' : '&#9823'
    }

    occupyPosition(newPosition) {
        if(chessPosition[newPosition]){
            if(chessPosition[newPosition].isWhite){
                whiteDomain.splice(whiteDomain.indexOf(chessPosition[newPosition]), 1)
            } else {
                blackDomain.splice(blackDomain.indexOf(chessPosition[newPosition]), 1)
            }
        }
        positionElements[this.position].innerHTML = ''
        chessPosition[this.position] = null
        this.position = newPosition
        if((this.position >= 0 && this.position <= 8) || (this.position >= 56 && this.position < 64)){
            pawnPromotion(this)
        } else {
            positionElements[newPosition].innerHTML = this.symbol
            chessPosition[newPosition] = this
            this.moved = true
        }
        
    }
    
    findDomain() {
        let domain = []
        if(this.isWhite){    
            if(!chessPosition[this.position - 8]){
                domain.push(positionElements[this.position - 8])
            }
            if(!this.moved && !chessPosition[this.position - 16] && !chessPosition[this.position - 8]){
                domain.push(positionElements[this.position - 16])
            }
            
            if((this.position + 1) % 8 !== 0){
                if(chessPosition[this.position - 7]){
                    if(!chessPosition[this.position - 7].isWhite){
                        domain.push(positionElements[this.position - 7])
                    }
                }
            }
            
            if(this.position % 8 !== 0){
                if(chessPosition[this.position - 9]){
                    if(!chessPosition[this.position - 9].isWhite){
                        domain.push(positionElements[this.position - 9])
                    }
                }
            }

            if((this.position + 1) % 8 !== 0){
                if(chessPosition[this.position + 1] && moveBuffer[0] === chessPosition[this.position + 1] && moveBuffer[0] instanceof Pawn && moveBuffer[2] - moveBuffer[1] === 16){
                    domain.push(positionElements[this.position - 7])
                }
            }

            if(this.position % 8 !== 0){
                if(chessPosition[this.position - 1] && moveBuffer[0] === chessPosition[this.position - 1] && moveBuffer[0] instanceof Pawn && moveBuffer[2] - moveBuffer[1] === 16){
                    domain.push(positionElements[this.position - 9])
                }
            }
            
            return domain
        } else {
            if(!chessPosition[this.position + 8]){
                domain.push(positionElements[this.position + 8])
            }

            if(!this.moved && !chessPosition[this.position + 16] && !chessPosition[this.position + 8]){
                domain.push(positionElements[this.position + 16])
            }

            if(this.position % 8 !== 0){
                if(chessPosition[this.position + 7]){
                    if(chessPosition[this.position + 7].isWhite){
                        domain.push(positionElements[this.position + 7])
                    }
                }
            }
            
            if((this.position + 1) % 8 !== 0){
                if(chessPosition[this.position + 9]){
                    if(chessPosition[this.position + 9].isWhite){
                        domain.push(positionElements[this.position + 9])
                    }
                }
            }

            if((this.position + 1) % 8 !== 0){
                if(chessPosition[this.position + 1] && moveBuffer[0] === chessPosition[this.position + 1] && moveBuffer[0] instanceof Pawn && moveBuffer[1] - moveBuffer[2] === 16){
                    domain.push(positionElements[this.position + 9])
                }
            }

            if(this.position % 8 !== 0){
                if(chessPosition[this.position - 1] && moveBuffer[0] === chessPosition[this.position - 1] && moveBuffer[0] instanceof Pawn && moveBuffer[1] - moveBuffer[2] === 16){
                    domain.push(positionElements[this.position + 7])
                }
            }

            return domain
        }
    }
}

class Bishop extends Piece{
    constructor(isWhite, position, moved){
        super(isWhite, position, moved)
    }

    giveRightSymbol(){
        return this.isWhite ? '&#9815' : '&#9821'
    }

    findDomain(){
        let domain = []
        for (let i = 9; this.position + i < 64 && (this.position + i) % 8 !== 0; i += 9) {
            if(chessPosition[this.position + i]){
                if(this.isWhite !== chessPosition[this.position + i].isWhite){
                    domain.push(positionElements[this.position + i])
                    break
                } else {
                    break
                }
            }
            domain.push(positionElements[this.position + i])
        }
        
        for (let i = 9; this.position - i >= 0 && (this.position - i + 1) % 8 !== 0; i += 9) {
            if(chessPosition[this.position - i]){
                if(this.isWhite !== chessPosition[this.position - i].isWhite){
                    domain.push(positionElements[this.position - i])
                    break
                } else {
                    break
                }
            }
            domain.push(positionElements[this.position - i])
        }
        
        for (let i = 7; this.position + i < 64 && (this.position + i + 1) % 8 !== 0; i += 7) {
            if(chessPosition[this.position + i]){
                if(this.isWhite !== chessPosition[this.position + i].isWhite){
                    domain.push(positionElements[this.position + i])
                    break
                } else {
                    break
                }
            }
            domain.push(positionElements[this.position + i])
        }
        
        for (let i = 7; this.position - i >= 0 && (this.position - i) % 8 !== 0; i += 7) {
            if(chessPosition[this.position - i]){
                if(this.isWhite !== chessPosition[this.position - i].isWhite){
                    domain.push(positionElements[this.position - i])
                    break
                } else {
                    break
                }
            }
            domain.push(positionElements[this.position - i])
        }
        
        return domain
    }
}

class Knight extends Piece{
    constructor(isWhite, position, moved){
        super(isWhite, position, moved)
    }

    giveRightSymbol(){
        return this.isWhite ? '&#9816' : '&#9822'
    }

    findDomain(){
        let domain = []
        
        if(this.position % 8 !== 0 && (this.position - 17) >= 0){
            if(!chessPosition[this.position - 17] || this.isWhite !== chessPosition[this.position - 17].isWhite){
                domain.push(positionElements[this.position - 17])
            } 
        }

        if(this.position % 8 !== 0 && (this.position + 15) < 64){
            if(!chessPosition[this.position + 15] || this.isWhite !== chessPosition[this.position + 15].isWhite){
                domain.push(positionElements[this.position + 15])
            } 
        }

        if(this.position % 8 >= 2 && (this.position - 10) >= 0){
            if(!chessPosition[this.position - 10] || this.isWhite !== chessPosition[this.position - 10].isWhite){
                domain.push(positionElements[this.position - 10])
            } 
        }

        if(this.position % 8 >= 2 && (this.position + 6) < 64){
            if(!chessPosition[this.position + 6] || this.isWhite !== chessPosition[this.position + 6].isWhite){
                domain.push(positionElements[this.position + 6])
            } 
        }

        if((this.position + 1) % 8 !== 0 && (this.position - 15) >= 0){
            if(!chessPosition[this.position - 15] || this.isWhite !== chessPosition[this.position - 15].isWhite){
                domain.push(positionElements[this.position - 15])
            } 
        }

        if((this.position + 1) % 8 !== 0 && (this.position + 17) < 64){
            if(!chessPosition[this.position + 17] || this.isWhite !== chessPosition[this.position + 17].isWhite){
                domain.push(positionElements[this.position + 17])
            } 
        }

        if(this.position % 8 <= 5 && (this.position - 6) >= 0){
            if(!chessPosition[this.position - 6] || this.isWhite !== chessPosition[this.position - 6].isWhite){
                domain.push(positionElements[this.position - 6])
            } 
        }
        
        if(this.position % 8 <= 5 && (this.position + 10) < 64){
            if(!chessPosition[this.position + 10] || this.isWhite !== chessPosition[this.position + 10].isWhite){
                domain.push(positionElements[this.position + 10])
            } 
        }

        return domain
    }
}

class Rook extends Piece{
    constructor(isWhite, position, moved){
        super(isWhite, position, moved)
    }

    giveRightSymbol(){
        return this.isWhite ? '&#9814' : '&#9820'
    }

    findDomain(){
        let domain = []
        for (let i = 8; this.position + i < 64; i += 8) {
            if(chessPosition[this.position + i]){
                if(this.isWhite !== chessPosition[this.position + i].isWhite){
                    domain.push(positionElements[this.position + i])
                    break
                } else {
                    break
                }
            }
            domain.push(positionElements[this.position + i])
        }
        
        for (let i = 8; this.position - i >= 0; i += 8) {
            if(chessPosition[this.position - i]){
                if(this.isWhite !== chessPosition[this.position - i].isWhite){
                    domain.push(positionElements[this.position - i])
                    break
                } else {
                    break
                }
            }
            domain.push(positionElements[this.position - i])
        }
        
        for (let i = 1; (this.position + i) % 8 !== 0; i++) {
            if(chessPosition[this.position + i]){
                if(this.isWhite !== chessPosition[this.position + i].isWhite){
                    domain.push(positionElements[this.position + i])
                    break
                } else {
                    break
                }
            }
            domain.push(positionElements[this.position + i])
        }
        
        for (let i = 1; (this.position - i + 1) % 8 !== 0; i++) {
            if(chessPosition[this.position - i]){
                if(this.isWhite !== chessPosition[this.position - i].isWhite){
                    domain.push(positionElements[this.position - i])
                    break
                } else {
                    break
                }
            }
            domain.push(positionElements[this.position - i])
        }
        
        return domain
    }
}

class Queen extends Piece{
    constructor(isWhite, position, moved){
        super(isWhite, position, moved)
    }

    giveRightSymbol(){
        return this.isWhite ? '&#9813' : '&#9819'
    }

    findDomain(){
        let domain = []
        for (let i = 9; this.position + i < 64 && (this.position + i) % 8 !== 0; i += 9) {
            if(chessPosition[this.position + i]){
                if(this.isWhite !== chessPosition[this.position + i].isWhite){
                    domain.push(positionElements[this.position + i])
                    break
                } else {
                    break
                }
            }
            domain.push(positionElements[this.position + i])
        }
        
        for (let i = 9; this.position - i >= 0 && (this.position - i + 1) % 8 !== 0; i += 9) {
            if(chessPosition[this.position - i]){
                if(this.isWhite !== chessPosition[this.position - i].isWhite){
                    domain.push(positionElements[this.position - i])
                    break
                } else {
                    break
                }
            }
            domain.push(positionElements[this.position - i])
        }
        
        for (let i = 7; this.position + i < 64 && (this.position + i + 1) % 8 !== 0; i += 7) {
            if(chessPosition[this.position + i]){
                if(this.isWhite !== chessPosition[this.position + i].isWhite){
                    domain.push(positionElements[this.position + i])
                    break
                } else {
                    break
                }
            }
            domain.push(positionElements[this.position + i])
        }
        
        for (let i = 7; this.position - i >= 0 && (this.position - i) % 8 !== 0; i += 7) {
            if(chessPosition[this.position - i]){
                if(this.isWhite !== chessPosition[this.position - i].isWhite){
                    domain.push(positionElements[this.position - i])
                    break
                } else {
                    break
                }
            }
            domain.push(positionElements[this.position - i])
        }

        for (let i = 8; this.position + i < 64; i += 8) {
            if(chessPosition[this.position + i]){
                if(this.isWhite !== chessPosition[this.position + i].isWhite){
                    domain.push(positionElements[this.position + i])
                    break
                } else {
                    break
                }
            }
            domain.push(positionElements[this.position + i])
        }
        
        for (let i = 8; this.position - i >= 0; i += 8) {
            if(chessPosition[this.position - i]){
                if(this.isWhite !== chessPosition[this.position - i].isWhite){
                    domain.push(positionElements[this.position - i])
                    break
                } else {
                    break
                }
            }
            domain.push(positionElements[this.position - i])
        }
        
        for (let i = 1; (this.position + i) % 8 !== 0; i++) {
            if(chessPosition[this.position + i]){
                if(this.isWhite !== chessPosition[this.position + i].isWhite){
                    domain.push(positionElements[this.position + i])
                    break
                } else {
                    break
                }
            }
            domain.push(positionElements[this.position + i])
        }
        
        for (let i = 1; (this.position - i + 1) % 8 !== 0; i++) {
            if(chessPosition[this.position - i]){
                if(this.isWhite !== chessPosition[this.position - i].isWhite){
                    domain.push(positionElements[this.position - i])
                    break
                } else {
                    break
                }
            }
            domain.push(positionElements[this.position - i])
        }
        
        return domain
    }
}

class King extends Piece{
    constructor(isWhite, position, moved){
        super(isWhite, position, moved)
    }

    giveRightSymbol(){
        return this.isWhite ? '&#9812' : '&#9818'
    }

    findDomain(){
        let domain = []
        
        if(this.position % 8 !== 0){
            if(!chessPosition[this.position - 1] || this.isWhite !== chessPosition[this.position - 1].isWhite){
                domain.push(positionElements[this.position - 1])
            } 
        }

        if(this.position % 8 !== 0 && this.position - 9 >= 0){
            if(!chessPosition[this.position - 9] || this.isWhite !== chessPosition[this.position - 9].isWhite){
                domain.push(positionElements[this.position - 9])
            } 
        }

        if(this.position % 8 !== 0 && (this.position + 7) < 64){
            if(!chessPosition[this.position + 7] || this.isWhite !== chessPosition[this.position + 7].isWhite){
                domain.push(positionElements[this.position + 7])
            } 
        }

        if((this.position - 8) >= 0){
            if(!chessPosition[this.position - 8] || this.isWhite !== chessPosition[this.position - 8].isWhite){
                domain.push(positionElements[this.position - 8])
            } 
        }

        if((this.position + 8) < 64){
            if(!chessPosition[this.position + 8] || this.isWhite !== chessPosition[this.position + 8].isWhite){
                domain.push(positionElements[this.position + 8])
            } 
        }

        if((this.position + 1) % 8 !== 0){
            if(!chessPosition[this.position + 1] || this.isWhite !== chessPosition[this.position + 1].isWhite){
                domain.push(positionElements[this.position + 1])
            }
        }

        if((this.position + 1) % 8 !== 0 && (this.position - 7) >= 0){
            if(!chessPosition[this.position - 7] || this.isWhite !== chessPosition[this.position - 7].isWhite){
                domain.push(positionElements[this.position - 7])
            }
        }
        
        if((this.position + 1) % 8 !== 0 && (this.position + 9) < 64){
            if(!chessPosition[this.position + 9] || this.isWhite !== chessPosition[this.position + 9].isWhite){
                domain.push(positionElements[this.position + 9])
            }
        }

        if(!this.moved && !inCheck(this.isWhite, this.position) && !chessPosition[this.position + 1] && !inCheck(this.isWhite, this.position + 1) && !chessPosition[this.position + 2] && !inCheck(this.isWhite, this.position + 2)){
            if(chessPosition[this.position + 3] && chessPosition[this.position + 3] instanceof Rook && !chessPosition[this.position + 3].moved){
                domain.push(positionElements[this.position + 2])
            }
        }

        if(!this.moved && !inCheck(this.isWhite, this.position) && !chessPosition[this.position - 1] && !inCheck(this.isWhite, this.position - 1) && !chessPosition[this.position - 2] && !inCheck(this.isWhite, this.position - 2) && !chessPosition[this.position - 3] && !inCheck(this.isWhite, this.position - 3)){
            if(chessPosition[this.position - 4] && chessPosition[this.position - 4] instanceof Rook && !chessPosition[this.position - 4].moved){
                domain.push(positionElements[this.position - 2])
            }
        }

        return domain
    }

    findOffensiveDomain(){
        let offensiveDomain = []
        
        if(this.position % 8 !== 0){
            if(!chessPosition[this.position - 1] || this.isWhite !== chessPosition[this.position - 1].isWhite){
                offensiveDomain.push(positionElements[this.position - 1])
            } 
        }

        if(this.position % 8 !== 0 && this.position - 9 >= 0){
            if(!chessPosition[this.position - 9] || this.isWhite !== chessPosition[this.position - 9].isWhite){
                offensiveDomain.push(positionElements[this.position - 9])
            } 
        }

        if(this.position % 8 !== 0 && (this.position + 7) < 64){
            if(!chessPosition[this.position + 7] || this.isWhite !== chessPosition[this.position + 7].isWhite){
                offensiveDomain.push(positionElements[this.position + 7])
            } 
        }

        if((this.position - 8) >= 0){
            if(!chessPosition[this.position - 8] || this.isWhite !== chessPosition[this.position - 8].isWhite){
                offensiveDomain.push(positionElements[this.position - 8])
            } 
        }

        if((this.position + 8) < 64){
            if(!chessPosition[this.position + 8] || this.isWhite !== chessPosition[this.position + 8].isWhite){
                offensiveDomain.push(positionElements[this.position + 8])
            } 
        }

        if((this.position + 1) % 8 !== 0){
            if(!chessPosition[this.position + 1] || this.isWhite !== chessPosition[this.position + 1].isWhite){
                offensiveDomain.push(positionElements[this.position + 1])
            }
        }

        if((this.position + 1) % 8 !== 0 && (this.position - 7) >= 0){
            if(!chessPosition[this.position - 7] || this.isWhite !== chessPosition[this.position - 7].isWhite){
                offensiveDomain.push(positionElements[this.position - 7])
            }
        }
        
        if((this.position + 1) % 8 !== 0 && (this.position + 9) < 64){
            if(!chessPosition[this.position + 9] || this.isWhite !== chessPosition[this.position + 9].isWhite){
                offensiveDomain.push(positionElements[this.position + 9])
            }
        }

        return offensiveDomain
    }
}



let blackRook1 = new Rook(false, 0)
let blackKnight1 = new Knight(false, 1)
let blackBishop1 = new Bishop(false, 2) 
let blackQueen = new Queen(false, 3)
let blackKing = new King(false, 4)
let blackBishop2 = new Bishop(false, 5)
let blackKnight2 = new Knight(false, 6)
let blackRook2 = new Rook(false, 7)
let blackPawn1 = new Pawn(false, 8)
let blackPawn2 = new Pawn(false, 9)
let blackPawn3 = new Pawn(false, 10)
let blackPawn4 = new Pawn(false, 11)
let blackPawn5 = new Pawn(false, 12)
let blackPawn6 = new Pawn(false, 13)
let blackPawn7 = new Pawn(false, 14)
let blackPawn8 = new Pawn(false, 15)

let whiteRook1 = new Rook(true, 63)
let whiteKnight1 = new Knight(true, 62)
let whiteBishop1 = new Bishop(true, 61) 
let whiteQueen = new Queen(true, 59)
let whiteKing = new King(true, 60)
let whiteBishop2 = new Bishop(true, 58)
let whiteKnight2 = new Knight(true, 57)
let whiteRook2 = new Rook(true, 56)
let whitePawn1 = new Pawn(true, 55)
let whitePawn2 = new Pawn(true, 54)
let whitePawn3 = new Pawn(true, 53)
let whitePawn4 = new Pawn(true, 52)
let whitePawn5 = new Pawn(true, 51)
let whitePawn6 = new Pawn(true, 50)
let whitePawn7 = new Pawn(true, 49)
let whitePawn8 = new Pawn(true, 48)

for (let i = 0; i<64; i++) {
    positionElements[i].addEventListener('click', ()=>decideBehave(chessPosition[i], positionElements[i], i))
}






