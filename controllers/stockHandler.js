'use strict'

class stockDataHandler {
  constructor(symbol, latestPrice) {
    this.stockData = {};
    if(symbol) {this.stockData.stock = symbol};
    if(latestPrice) {this.stockData.price = latestPrice};
  }
}

module.exports = stockDataHandler;