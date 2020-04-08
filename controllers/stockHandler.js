'use strict'

class stockDataHandler {
  constructor(symbol, latestPrice) {
    if(symbol) {this.stock = symbol.toUpperCase()};
    if(latestPrice) {this.price = latestPrice};
  }
}

module.exports = stockDataHandler;