const chessBoardElement = document.querySelector('#chess-board')
const positionElements = Array.from(chessBoardElement.children)
let pieceSelected = false
let chessPosition = Array(64)
let pieceBuffer = {}
let positionBuffer
let movedBuffer = false
let pieceBuffer2 = {}
let whiteDomain = []
let blackDomain = []
for(let x = 0; x < 64; x++){
    chessPosition[x] = null
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
        } else{
            if(pieceBuffer.isWhite && pieceBuffer.findDomain().includes(possiblePositionElement)){
                if((pieceBuffer instanceof King || pieceBuffer instanceof Pawn || pieceBuffer instanceof Rook) && !pieceBuffer.moved){
                    movedBuffer = false
                }
                if(!chessPosition[index]){
                    pieceBuffer.occupyPosition(index)
                    if(inCheck(whiteKing.isWhite, whiteKing.position)){
                        if((pieceBuffer instanceof King || pieceBuffer instanceof Pawn || pieceBuffer instanceof Rook) && !movedBuffer){
                            pieceBuffer.occupyPosition(positionBuffer)
                            pieceBuffer.moved = false
                        } else {
                            pieceBuffer.occupyPosition(positionBuffer)
                        }
                    }
                } else {
                    pieceBuffer2 = chessPosition[index]
                    pieceBuffer.occupyPosition(index)
                    if(inCheck(true, whiteKing.position)){
                        if((pieceBuffer instanceof King || pieceBuffer instanceof Pawn || pieceBuffer instanceof Rook) && !movedBuffer){
                            pieceBuffer.occupyPosition(positionBuffer)
                            pieceBuffer.moved = false
                            if((pieceBuffer2 instanceof Pawn || pieceBuffer2 instanceof Rook) && !pieceBuffer2.moved){
                                movedBuffer = false
                            }
                            if((pieceBuffer2 instanceof Pawn || pieceBuffer2 instanceof Rook) && !movedBuffer){
                                pieceBuffer2.occupyPosition(index)
                                pieceBuffer2.moved = false
                            } else {
                                pieceBuffer2.occupyPosition(index)
                            }
            
                        } else {
                            pieceBuffer.occupyPosition(positionBuffer)
                            if((pieceBuffer2 instanceof Pawn || pieceBuffer2 instanceof Rook) && !pieceBuffer2.moved){
                                movedBuffer = false
                            }
                            if((pieceBuffer2 instanceof Pawn || pieceBuffer2 instanceof Rook) && !movedBuffer){
                                pieceBuffer2.occupyPosition(index)
                                pieceBuffer2.moved = false
                            } else {
                                pieceBuffer2.occupyPosition(index)
                            }
                        }
                    } 
                }
                
            } else if(!pieceBuffer.isWhite && pieceBuffer.findDomain().includes(possiblePositionElement)) {
                if((pieceBuffer instanceof King || pieceBuffer instanceof Pawn || pieceBuffer instanceof Rook) && !pieceBuffer.moved){
                    movedBuffer = false
                }
                if(!chessPosition[index]){
                    pieceBuffer.occupyPosition(index)
                    if(inCheck(blackKing.isWhite, blackKing.position)){
                        if((pieceBuffer instanceof King || pieceBuffer instanceof Pawn || pieceBuffer instanceof Rook) && !movedBuffer){
                            pieceBuffer.occupyPosition(positionBuffer)
                            pieceBuffer.moved = false
                        } else {
                            pieceBuffer.occupyPosition(positionBuffer)
                        }
                    }
                } else {
                    pieceBuffer2 = chessPosition[index]
                    pieceBuffer.occupyPosition(index)
                    if(inCheck(blackKing.isWhite, blackKing.position)){
                        if((pieceBuffer instanceof King || pieceBuffer instanceof Pawn || pieceBuffer instanceof Rook) && !movedBuffer){
                            pieceBuffer.occupyPosition(positionBuffer)
                            pieceBuffer.moved = false
                            if((pieceBuffer2 instanceof Pawn || pieceBuffer2 instanceof Rook) && !pieceBuffer2.moved){
                                movedBuffer = false
                            }
                            if((pieceBuffer2 instanceof Pawn || pieceBuffer2 instanceof Rook) && !movedBuffer){
                                pieceBuffer2.occupyPosition(index)
                                pieceBuffer2.moved = false
                            } else {
                                pieceBuffer2.occupyPosition(index)
                            }
            
                        } else {
                            pieceBuffer.occupyPosition(positionBuffer)
                            if((pieceBuffer2 instanceof Pawn || pieceBuffer2 instanceof Rook) && !pieceBuffer2.moved){
                                movedBuffer = false
                            }
                            if((pieceBuffer2 instanceof Pawn || pieceBuffer2 instanceof Rook) && !movedBuffer){
                                pieceBuffer2.occupyPosition(index)
                                pieceBuffer2.moved = false
                            } else {
                                pieceBuffer2.occupyPosition(index)
                            }
                        }
                    }
                }
            }
        }
    } else {
        if(piece){
            pieceSelected = true
            highlightDomain(piece)
            pieceBuffer = piece
            positionBuffer = piece.position
        }
    }
}

function highlightDomain(piece){
    let length = piece.findDomain().length
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
    for(let j = 0; j < length; j++){
        piece.findDomain()[j].style.outline = ''
    }
}

class Piece{
    constructor(isWhite, position){
        this.isWhite = isWhite
        this.position = position
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
                whiteDomain.splice(newPosition, 1)
            } else {
                blackDomain.splice(newPosition, 1)
            }
        }
        positionElements[this.position].innerHTML = ''
        chessPosition[this.position] = null
        this.position = newPosition
        positionElements[newPosition].innerHTML = this.symbol
        chessPosition[newPosition] = this
    }
    findDomain(){
        return null
    }
}

class Pawn extends Piece{
    constructor(isWhite, position, moved) {
        super(isWhite, position)
        this.moved = moved
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
        positionElements[newPosition].innerHTML = this.symbol
        chessPosition[newPosition] = this
        this.moved = true
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
            if(chessPosition[this.position - 7]){
                if(!chessPosition[this.position - 7].isWhite){
                    domain.push(positionElements[this.position - 7])
                }
            }
            if(chessPosition[this.position - 9]){
                if(!chessPosition[this.position - 9].isWhite){
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
            if(chessPosition[this.position + 7]){
                if(chessPosition[this.position + 7].isWhite){
                    domain.push(positionElements[this.position + 7])
                }
            }
            if(chessPosition[this.position + 9]){
                if(chessPosition[this.position + 9].isWhite){
                    domain.push(positionElements[this.position + 9])
                }
            }
            return domain
        }
    }
}

class Bishop extends Piece{
    constructor(isWhite, position){
        super(isWhite, position)
    }

    giveRightSymbol(){
        return this.isWhite ? '&#9815' : '&#9821'
    }

    findDomain(){
        let domain = []
        for (let count = 9; this.position + count < 64 && (this.position + count) % 8 !== 0; count += 9) {
            if(chessPosition[this.position + count]){
                if(this.isWhite !== chessPosition[this.position + count].isWhite){
                    domain.push(positionElements[this.position + count])
                    break
                } else {
                    break
                }
            }
            domain.push(positionElements[this.position + count])
        }
        
        for (let count = 9; this.position - count >= 0 && (this.position - count + 1) % 8 !== 0; count += 9) {
            if(chessPosition[this.position - count]){
                if(this.isWhite !== chessPosition[this.position - count].isWhite){
                    domain.push(positionElements[this.position - count])
                    break
                } else {
                    break
                }
            }
            domain.push(positionElements[this.position - count])
        }
        
        for (let count = 7; this.position + count < 64 && (this.position + count + 1) % 8 !== 0; count += 7) {
            if(chessPosition[this.position + count]){
                if(this.isWhite !== chessPosition[this.position + count].isWhite){
                    domain.push(positionElements[this.position + count])
                    break
                } else {
                    break
                }
            }
            domain.push(positionElements[this.position + count])
        }
        
        for (let count = 7; this.position - count >= 0 && (this.position - count) % 8 !== 0; count += 7) {
            if(chessPosition[this.position - count]){
                if(this.isWhite !== chessPosition[this.position - count].isWhite){
                    domain.push(positionElements[this.position - count])
                    break
                } else {
                    break
                }
            }
            domain.push(positionElements[this.position - count])
        }
        
        return domain
    }
}

class Knight extends Piece{
    constructor(isWhite, position){
        super(isWhite, position)
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
        super(isWhite, position)
        this.moved = moved
    }

    giveRightSymbol(){
        return this.isWhite ? '&#9814' : '&#9820'
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
        let domain = []
        for (let count = 8; this.position + count < 64; count += 8) {
            if(chessPosition[this.position + count]){
                if(this.isWhite !== chessPosition[this.position + count].isWhite){
                    domain.push(positionElements[this.position + count])
                    break
                } else {
                    break
                }
            }
            domain.push(positionElements[this.position + count])
        }
        
        for (let count = 8; this.position - count >= 0; count += 8) {
            if(chessPosition[this.position - count]){
                if(this.isWhite !== chessPosition[this.position - count].isWhite){
                    domain.push(positionElements[this.position - count])
                    break
                } else {
                    break
                }
            }
            domain.push(positionElements[this.position - count])
        }
        
        for (let count = 1; (this.position + count) % 8 !== 0; count++) {
            if(chessPosition[this.position + count]){
                if(this.isWhite !== chessPosition[this.position + count].isWhite){
                    domain.push(positionElements[this.position + count])
                    break
                } else {
                    break
                }
            }
            domain.push(positionElements[this.position + count])
        }
        
        for (let count = 1; (this.position - count + 1) % 8 !== 0; count++) {
            if(chessPosition[this.position - count]){
                if(this.isWhite !== chessPosition[this.position - count].isWhite){
                    domain.push(positionElements[this.position - count])
                    break
                } else {
                    break
                }
            }
            domain.push(positionElements[this.position - count])
        }
        
        return domain
    }
}

class Queen extends Piece{
    constructor(isWhite, position){
        super(isWhite, position)
    }

    giveRightSymbol(){
        return this.isWhite ? '&#9813' : '&#9819'
    }

    findDomain(){
        let domain = []
        for (let count = 9; this.position + count < 64 && (this.position + count) % 8 !== 0; count += 9) {
            if(chessPosition[this.position + count]){
                if(this.isWhite !== chessPosition[this.position + count].isWhite){
                    domain.push(positionElements[this.position + count])
                    break
                } else {
                    break
                }
            }
            domain.push(positionElements[this.position + count])
        }
        
        for (let count = 9; this.position - count >= 0 && (this.position - count + 1) % 8 !== 0; count += 9) {
            if(chessPosition[this.position - count]){
                if(this.isWhite !== chessPosition[this.position - count].isWhite){
                    domain.push(positionElements[this.position - count])
                    break
                } else {
                    break
                }
            }
            domain.push(positionElements[this.position - count])
        }
        
        for (let count = 7; this.position + count < 64 && (this.position + count + 1) % 8 !== 0; count += 7) {
            if(chessPosition[this.position + count]){
                if(this.isWhite !== chessPosition[this.position + count].isWhite){
                    domain.push(positionElements[this.position + count])
                    break
                } else {
                    break
                }
            }
            domain.push(positionElements[this.position + count])
        }
        
        for (let count = 7; this.position - count >= 0 && (this.position - count) % 8 !== 0; count += 7) {
            if(chessPosition[this.position - count]){
                if(this.isWhite !== chessPosition[this.position - count].isWhite){
                    domain.push(positionElements[this.position - count])
                    break
                } else {
                    break
                }
            }
            domain.push(positionElements[this.position - count])
        }

        for (let count = 8; this.position + count < 64; count += 8) {
            if(chessPosition[this.position + count]){
                if(this.isWhite !== chessPosition[this.position + count].isWhite){
                    domain.push(positionElements[this.position + count])
                    break
                } else {
                    break
                }
            }
            domain.push(positionElements[this.position + count])
        }
        
        for (let count = 8; this.position - count >= 0; count += 8) {
            if(chessPosition[this.position - count]){
                if(this.isWhite !== chessPosition[this.position - count].isWhite){
                    domain.push(positionElements[this.position - count])
                    break
                } else {
                    break
                }
            }
            domain.push(positionElements[this.position - count])
        }
        
        for (let count = 1; (this.position + count) % 8 !== 0; count++) {
            if(chessPosition[this.position + count]){
                if(this.isWhite !== chessPosition[this.position + count].isWhite){
                    domain.push(positionElements[this.position + count])
                    break
                } else {
                    break
                }
            }
            domain.push(positionElements[this.position + count])
        }
        
        for (let count = 1; (this.position - count + 1) % 8 !== 0; count++) {
            if(chessPosition[this.position - count]){
                if(this.isWhite !== chessPosition[this.position - count].isWhite){
                    domain.push(positionElements[this.position - count])
                    break
                } else {
                    break
                }
            }
            domain.push(positionElements[this.position - count])
        }
        
        return domain
    }
}

class King extends Piece{
    constructor(isWhite, position, moved){
        super(isWhite, position)
        this.moved = moved
    }

    giveRightSymbol(){
        return this.isWhite ? '&#9812' : '&#9818'
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

        if(!this.moved && !chessPosition[this.position + 1] && !inCheck(this.isWhite, this.position + 1) && !chessPosition[this.position + 2] && !inCheck(this.isWhite, this.position + 2)){
            if(chessPosition[this.position + 3] && chessPosition[this.position + 3] instanceof Rook && !chessPosition[this.position + 3].moved){
                domain.push(positionElements[this.position + 2])
            }
        }

        if(!this.moved && !chessPosition[this.position - 1] && !inCheck(this.isWhite, this.position - 1) && !chessPosition[this.position - 2] && !inCheck(this.isWhite, this.position - 2) && !chessPosition[this.position - 3] && !inCheck(this.isWhite, this.position - 3)){
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



let blackRook1 = new Rook(false, 0, false)
let blackKnight1 = new Knight(false, 1)
let blackBishop1 = new Bishop(false, 2) 
let blackQueen = new Queen(false, 3)
let blackKing = new King(false, 4, false)
let blackBishop2 = new Bishop(false, 5)
let blackKnight2 = new Knight(false, 6)
let blackRook2 = new Rook(false, 7, false)
let blackPawn1 = new Pawn(false, 8, false)
let blackPawn2 = new Pawn(false, 9, false)
let blackPawn3 = new Pawn(false, 10, false)
let blackPawn4 = new Pawn(false, 11, false)
let blackPawn5 = new Pawn(false, 12, false)
let blackPawn6 = new Pawn(false, 13, false)
let blackPawn7 = new Pawn(false, 14, false)
let blackPawn8 = new Pawn(false, 15, false)

let whiteRook1 = new Rook(true, 63, false)
let whiteKnight1 = new Knight(true, 62)
let whiteBishop1 = new Bishop(true, 61) 
let whiteQueen = new Queen(true, 59)
let whiteKing = new King(true, 60, false)
let whiteBishop2 = new Bishop(true, 58)
let whiteKnight2 = new Knight(true, 57)
let whiteRook2 = new Rook(true, 56, false)
let whitePawn1 = new Pawn(true, 55, false)
let whitePawn2 = new Pawn(true, 54, false)
let whitePawn3 = new Pawn(true, 53, false)
let whitePawn4 = new Pawn(true, 52, false)
let whitePawn5 = new Pawn(true, 51, false)
let whitePawn6 = new Pawn(true, 50, false)
let whitePawn7 = new Pawn(true, 49, false)
let whitePawn8 = new Pawn(true, 48, false)


for (let i = 0; i<64; i++) {
    positionElements[i].addEventListener('click', ()=>decideBehave(chessPosition[i], positionElements[i], i))
}








