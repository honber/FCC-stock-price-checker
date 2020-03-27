'use strict'

const fetch = require("node-fetch");

// https://repeated-alpaca.glitch.me/v1/stock/[symbol]/quote

const URL = 'https://repeated-alpaca.glitch.me/v1/stock/';

async function getNasdaqData(stock) {
  const data = await fetch(`${URL}${stock}/quote`)
  const json = await data.json()
  return json;
}

module.exports = getNasdaqData;